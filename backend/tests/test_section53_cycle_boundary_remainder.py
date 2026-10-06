import uuid
import pytest
from sqlalchemy import select, and_, func
from app.core.database import AsyncSessionLocal
from app.models.network import (
    NetworkMember,
    NetworkCycle,
    LevelProgressionLedger,
    RewardLedger,
    Referral,
    ReferralTransaction,
    LevelQualificationAllocation,
    CycleStatus
)
from app.services.network_service import NetworkProgressService


@pytest.mark.asyncio
async def test_section53_test_a_not_enough_to_finish_current_cycle():
    """
    Section 53.6 & 53.19 Test A:
    Cycle 1 Level 119
    Remainder = ₹5,000
    New transaction = ₹3,000

    Expected:
    Cycle 1 Level = 119
    Balance = ₹8,000
    Cycle 2 = untouched
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-53a-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-53a-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-53A-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_cycle_number=1,
            current_level_number=119,
            current_rank_name="Legendary",
            unused_carry_forward_amount=5000.0
        )
        session.add(member)
        await session.flush()

        cycle1 = NetworkCycle(
            member_id=member.id,
            cycle_number=1,
            status=CycleStatus.ACTIVE,
            current_level=119
        )
        session.add(cycle1)

        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=uaid, referred_user_id=buyer_id, status="ACTIVE"))

        # Prior transaction giving ₹5,000 remainder
        session.add(ReferralTransaction(
            referral_id="sample-ref",
            referrer_user_id=ref_id,
            buyer_user_id=buyer_id,
            order_id=f"ORD-53A-PRIOR-{uuid.uuid4().hex[:4]}",
            gross_amount=5000.0,
            tax_amount=0.0,
            eligible_amount=5000.0,
            is_self_purchase=False,
            is_referral_purchase=True,
            status="COMPLETED"
        ))
        await session.commit()

        # New transaction of ₹3,000
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-53A-NEW-{uuid.uuid4().hex[:4]}",
            gross_amount=3000.0,
            tax_amount=0.0,
            db=session
        )

        assert res["applied_cycle"] == 1
        assert res["applied_level"] == 119
        assert res["unused_carry_forward"] == 8000.0
        assert len(res["newly_completed_levels"]) == 0

        # Cycle 2 must NOT exist
        c2_stmt = select(NetworkCycle).where(
            and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 2)
        )
        c2 = (await session.execute(c2_stmt)).scalars().first()
        assert c2 is None


@pytest.mark.asyncio
async def test_section53_test_b_exactly_finishes_current_cycle():
    """
    Section 53.7 & 53.19 Test B:
    Cycle 1 Level 119
    Remainder = ₹5,000
    New transaction = ₹5,000

    Expected:
    Cycle 1 Level = 120
    Cycle 1 = COMPLETED
    Cycle 2 Carry-forward = ₹0
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-53b-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-53b-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-53B-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_cycle_number=1,
            current_level_number=119,
            current_rank_name="Legendary",
            unused_carry_forward_amount=5000.0
        )
        session.add(member)
        await session.flush()

        cycle1 = NetworkCycle(
            member_id=member.id,
            cycle_number=1,
            status=CycleStatus.ACTIVE,
            current_level=119
        )
        session.add(cycle1)

        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=uaid, referred_user_id=buyer_id, status="ACTIVE"))

        # Prior transaction giving ₹5,000 remainder
        session.add(ReferralTransaction(
            referral_id="sample-ref",
            referrer_user_id=ref_id,
            buyer_user_id=buyer_id,
            order_id=f"ORD-53B-PRIOR-{uuid.uuid4().hex[:4]}",
            gross_amount=5000.0,
            tax_amount=0.0,
            eligible_amount=5000.0,
            is_self_purchase=False,
            is_referral_purchase=True,
            status="COMPLETED"
        ))
        await session.commit()

        # New transaction of ₹5,000
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-53B-NEW-{uuid.uuid4().hex[:4]}",
            gross_amount=5000.0,
            tax_amount=0.0,
            db=session
        )

        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 0
        assert res["unused_carry_forward"] == 0.0

        # Cycle 1 is COMPLETED at Level 120
        c1_stmt = select(NetworkCycle).where(
            and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 1)
        )
        c1 = (await session.execute(c1_stmt)).scalars().first()
        assert c1.status == CycleStatus.COMPLETED
        assert c1.current_level == 120

        # Cycle 2 starts with Carry-forward = 0
        c2_stmt = select(NetworkCycle).where(
            and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 2)
        )
        c2 = (await session.execute(c2_stmt)).scalars().first()
        assert c2 is not None
        assert c2.status == CycleStatus.ACTIVE
        assert c2.current_level == 0
        assert c2.carry_forward_in == 0.0


@pytest.mark.asyncio
async def test_section53_test_c_crosses_cycle_boundary():
    """
    Section 53.2, 53.3, 53.4 & 53.19 Test C:
    Cycle 1 Level 119
    Remainder = ₹5,000
    New transaction = ₹25,000

    Expected:
    ₹5,000 → Cycle 1 Level 120
    ₹25,000 → Cycle 2
    Cycle 2:
      ₹10,000 → Level 1
      ₹10,000 → Level 2
      ₹5,000 → remainder
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-53c-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-53c-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-53C-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_cycle_number=1,
            current_level_number=119,
            current_rank_name="Legendary",
            unused_carry_forward_amount=5000.0
        )
        session.add(member)
        await session.flush()

        cycle1 = NetworkCycle(
            member_id=member.id,
            cycle_number=1,
            status=CycleStatus.ACTIVE,
            current_level=119
        )
        session.add(cycle1)

        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=uaid, referred_user_id=buyer_id, status="ACTIVE"))

        # Prior transaction giving ₹5,000 remainder
        session.add(ReferralTransaction(
            referral_id="sample-ref",
            referrer_user_id=ref_id,
            buyer_user_id=buyer_id,
            order_id=f"ORD-53C-PRIOR-{uuid.uuid4().hex[:4]}",
            gross_amount=5000.0,
            tax_amount=0.0,
            eligible_amount=5000.0,
            is_self_purchase=False,
            is_referral_purchase=True,
            status="COMPLETED"
        ))
        await session.commit()

        # New transaction of ₹25,000
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-53C-NEW-{uuid.uuid4().hex[:4]}",
            gross_amount=25000.0,
            tax_amount=0.0,
            db=session
        )

        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 2
        assert res["unused_carry_forward"] == 0.0

        # Cycle 1 COMPLETED
        c1 = (await session.execute(
            select(NetworkCycle).where(
                and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 1)
            )
        )).scalars().first()
        assert c1.status == CycleStatus.COMPLETED
        assert c1.current_level == 120
        assert c1.carry_forward_out == 20000.0

        # Cycle 2 ACTIVE at Level 2 with 0 remainder
        c2 = (await session.execute(
            select(NetworkCycle).where(
                and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 2)
            )
        )).scalars().first()
        assert c2.status == CycleStatus.ACTIVE
        assert c2.current_level == 2
        assert c2.carry_forward_in == 20000.0

        # Verify allocations for new transaction: 5k to Cycle 1 L120, 10k to Cycle 2 L1, 10k to Cycle 2 L2
        new_tx_allocs = (await session.execute(
            select(LevelQualificationAllocation).where(
                LevelQualificationAllocation.transaction_id == res["referral_transaction_id"]
            ).order_by(
                LevelQualificationAllocation.cycle_number.asc(),
                LevelQualificationAllocation.level_number.asc()
            )
        )).scalars().all()
        assert len(new_tx_allocs) == 3
        assert new_tx_allocs[0].cycle_number == 1
        assert new_tx_allocs[0].level_number == 120
        assert new_tx_allocs[0].amount_allocated_to_level == 5000.0
        assert new_tx_allocs[1].cycle_number == 2
        assert new_tx_allocs[1].level_number == 1
        assert new_tx_allocs[1].amount_allocated_to_level == 10000.0
        assert new_tx_allocs[2].cycle_number == 2
        assert new_tx_allocs[2].level_number == 2
        assert new_tx_allocs[2].amount_allocated_to_level == 10000.0


@pytest.mark.asyncio
async def test_section53_test_d_large_transaction():
    """
    Section 53.8 & 53.19 Test D:
    Cycle 1 Level 119
    Remainder = ₹2,000
    New transaction = ₹30,000

    Expected:
    Cycle 1 Level 120 requires ₹8,000
    Remaining volume moves to Cycle 2
    Cycle 2 completes Level 1 and Level 2
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-53d-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-53d-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-53D-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_cycle_number=1,
            current_level_number=119,
            current_rank_name="Legendary",
            unused_carry_forward_amount=2000.0
        )
        session.add(member)
        await session.flush()

        cycle1 = NetworkCycle(
            member_id=member.id,
            cycle_number=1,
            status=CycleStatus.ACTIVE,
            current_level=119
        )
        session.add(cycle1)

        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=uaid, referred_user_id=buyer_id, status="ACTIVE"))

        # Prior transaction giving ₹2,000 remainder
        session.add(ReferralTransaction(
            referral_id="sample-ref",
            referrer_user_id=ref_id,
            buyer_user_id=buyer_id,
            order_id=f"ORD-53D-PRIOR-{uuid.uuid4().hex[:4]}",
            gross_amount=2000.0,
            tax_amount=0.0,
            eligible_amount=2000.0,
            is_self_purchase=False,
            is_referral_purchase=True,
            status="COMPLETED"
        ))
        await session.commit()

        # New transaction of ₹30,000
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-53D-NEW-{uuid.uuid4().hex[:4]}",
            gross_amount=30000.0,
            tax_amount=0.0,
            db=session
        )

        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 2
        assert res["unused_carry_forward"] == 2000.0

        # Cycle 1 COMPLETED
        c1 = (await session.execute(
            select(NetworkCycle).where(
                and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 1)
            )
        )).scalars().first()
        assert c1.status == CycleStatus.COMPLETED
        assert c1.current_level == 120
        assert c1.carry_forward_out == 22000.0

        # Cycle 2 ACTIVE at Level 2
        c2 = (await session.execute(
            select(NetworkCycle).where(
                and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 2)
            )
        )).scalars().first()
        assert c2.status == CycleStatus.ACTIVE
        assert c2.current_level == 2
        assert c2.carry_forward_in == 22000.0

        # Verify allocations for new transaction: 8k to Cycle 1 L120, 10k to Cycle 2 L1, 10k to Cycle 2 L2
        new_tx_allocs = (await session.execute(
            select(LevelQualificationAllocation).where(
                LevelQualificationAllocation.transaction_id == res["referral_transaction_id"]
            ).order_by(
                LevelQualificationAllocation.cycle_number.asc(),
                LevelQualificationAllocation.level_number.asc()
            )
        )).scalars().all()
        assert len(new_tx_allocs) == 3
        assert new_tx_allocs[0].cycle_number == 1
        assert new_tx_allocs[0].level_number == 120
        assert new_tx_allocs[0].amount_allocated_to_level == 8000.0
        assert new_tx_allocs[1].cycle_number == 2
        assert new_tx_allocs[1].level_number == 1
        assert new_tx_allocs[1].amount_allocated_to_level == 10000.0
        assert new_tx_allocs[2].cycle_number == 2
        assert new_tx_allocs[2].level_number == 2
        assert new_tx_allocs[2].amount_allocated_to_level == 10000.0


@pytest.mark.asyncio
async def test_section53_test_e_duplicate_webhook_idempotency():
    """
    Section 53.19 Test E:
    Duplicate order webhook delivery:
    → zero duplicate level/cycle/reward/allocation events
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-53e-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-53e-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-53E-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
        await session.commit()

        order_id = f"ORD-53E-{uuid.uuid4().hex[:6]}"

        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["status"] == "SUCCESS"

        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["status"] == "ALREADY_PROCESSED"
        assert res2["is_duplicate_webhook"] is True

        # Assert no duplicate events
        ledger_count = (await session.execute(
            select(func.count(LevelProgressionLedger.id)).where(LevelProgressionLedger.user_id == ref_id)
        )).scalar()
        assert ledger_count == 1

        alloc_count = (await session.execute(
            select(func.count(LevelQualificationAllocation.id)).where(LevelQualificationAllocation.user_id == ref_id)
        )).scalar()
        assert alloc_count == 1
