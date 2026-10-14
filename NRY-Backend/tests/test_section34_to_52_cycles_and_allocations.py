import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, and_, func
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.network import (
    NetworkMember,
    NetworkCycle,
    NetworkLevelRecord,
    LevelProgressionLedger,
    RewardLedger,
    Referral,
    ReferralTransaction,
    LevelQualificationAllocation,
    CycleStatus
)
from app.services.network_service import NetworkProgressService


@pytest.mark.asyncio
async def test_section34_cumulative_qualification_all_business_types():
    """
    Section 34 & 52:
    - Wholesaler: ₹60,000 + ₹40,000 → 1 level (unit = ₹1,00,000)
    - Distributor: ₹4,000 + ₹6,000 → 1 level (unit = ₹10,000)
    - Services: ₹2,000 + ₹3,000 → 1 level (unit = ₹5,000)
    - Retailer: ₹2,000 + ₹3,000 → 1 level (unit = ₹5,000)
    - Do not round up checks: ₹99,999, ₹9,999, ₹4,999 → 0 levels
    """
    async with AsyncSessionLocal() as session:
        # 1. Wholesaler test
        w_ref = f"w-ref-{uuid.uuid4().hex[:6]}"
        w_buyer = f"w-buyer-{uuid.uuid4().hex[:6]}"
        w_member = NetworkMember(
            user_id=w_ref,
            uaid=f"NRY-W-{uuid.uuid4().hex[:4]}",
            business_type="WHOLESALER",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(w_member)
        session.add(Referral(referrer_user_id=w_ref, referrer_uaid=w_member.uaid, referred_user_id=w_buyer, status="ACTIVE"))
        await session.commit()

        # Step 1: Wholesaler transaction 1 = ₹60,000 (below unit ₹100,000)
        res_w1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=w_buyer,
            order_id=f"ORD-W1-{uuid.uuid4().hex[:4]}",
            gross_amount=60000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_w1["applied_level"] == 0
        assert len(res_w1["newly_completed_levels"]) == 0
        assert res_w1["unused_carry_forward"] == 60000.0

        # Step 2: Wholesaler transaction 2 = ₹40,000 (cumulative reaches ₹100,000)
        res_w2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=w_buyer,
            order_id=f"ORD-W2-{uuid.uuid4().hex[:4]}",
            gross_amount=40000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_w2["applied_level"] == 1
        assert res_w2["newly_completed_levels"] == [1]
        assert res_w2["unused_carry_forward"] == 0.0

        # 2. Distributor test: ₹4,000 + ₹6,000 → 1 level
        d_ref = f"d-ref-{uuid.uuid4().hex[:6]}"
        d_buyer = f"d-buyer-{uuid.uuid4().hex[:6]}"
        d_member = NetworkMember(
            user_id=d_ref,
            uaid=f"NRY-D-{uuid.uuid4().hex[:4]}",
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(d_member)
        session.add(Referral(referrer_user_id=d_ref, referrer_uaid=d_member.uaid, referred_user_id=d_buyer, status="ACTIVE"))
        await session.commit()

        res_d1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=d_buyer,
            order_id=f"ORD-D1-{uuid.uuid4().hex[:4]}",
            gross_amount=4000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_d1["applied_level"] == 0
        assert res_d1["unused_carry_forward"] == 4000.0

        res_d2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=d_buyer,
            order_id=f"ORD-D2-{uuid.uuid4().hex[:4]}",
            gross_amount=6000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_d2["applied_level"] == 1
        assert res_d2["newly_completed_levels"] == [1]
        assert res_d2["unused_carry_forward"] == 0.0

        # 3. Services test: ₹2,000 + ₹3,000 → 1 level (unit = ₹5,000)
        s_ref = f"s-ref-{uuid.uuid4().hex[:6]}"
        s_buyer = f"s-buyer-{uuid.uuid4().hex[:6]}"
        s_member = NetworkMember(
            user_id=s_ref,
            uaid=f"NRY-S-{uuid.uuid4().hex[:4]}",
            business_type="SERVICES",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(s_member)
        session.add(Referral(referrer_user_id=s_ref, referrer_uaid=s_member.uaid, referred_user_id=s_buyer, status="ACTIVE"))
        await session.commit()

        res_s1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=s_buyer,
            order_id=f"ORD-S1-{uuid.uuid4().hex[:4]}",
            gross_amount=2000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_s1["applied_level"] == 0
        assert res_s1["unused_carry_forward"] == 2000.0

        res_s2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=s_buyer,
            order_id=f"ORD-S2-{uuid.uuid4().hex[:4]}",
            gross_amount=3000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_s2["applied_level"] == 1
        assert res_s2["newly_completed_levels"] == [1]
        assert res_s2["unused_carry_forward"] == 0.0

        # 4. Retailer test: ₹2,000 + ₹3,000 → 1 level (unit = ₹5,000)
        r_ref = f"r-ref-{uuid.uuid4().hex[:6]}"
        r_buyer = f"r-buyer-{uuid.uuid4().hex[:6]}"
        r_member = NetworkMember(
            user_id=r_ref,
            uaid=f"NRY-R-{uuid.uuid4().hex[:4]}",
            business_type="RETAILER",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(r_member)
        session.add(Referral(referrer_user_id=r_ref, referrer_uaid=r_member.uaid, referred_user_id=r_buyer, status="ACTIVE"))
        await session.commit()

        res_r1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=r_buyer,
            order_id=f"ORD-R1-{uuid.uuid4().hex[:4]}",
            gross_amount=2000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_r1["applied_level"] == 0

        res_r2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=r_buyer,
            order_id=f"ORD-R2-{uuid.uuid4().hex[:4]}",
            gross_amount=3000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_r2["applied_level"] == 1
        assert res_r2["newly_completed_levels"] == [1]
        assert res_r2["unused_carry_forward"] == 0.0


@pytest.mark.asyncio
async def test_section34_8_do_not_round_up():
    """
    Section 34.8:
    Engine must never round a partial amount up to a completed level:
    - Wholesaler: ₹99,999 → 0 levels
    - Distributor: ₹9,999 → 0 levels
    - Services: ₹4,999 → 0 levels
    - Retailer: ₹4,999 → 0 levels
    """
    async with AsyncSessionLocal() as session:
        for b_type, sub_amt in [
            ("WHOLESALER", 99999.0),
            ("DISTRIBUTOR", 9999.0),
            ("SERVICES", 4999.0),
            ("RETAILER", 4999.0)
        ]:
            ref_id = f"ref-noround-{b_type}-{uuid.uuid4().hex[:4]}"
            buyer_id = f"buyer-noround-{b_type}-{uuid.uuid4().hex[:4]}"
            member = NetworkMember(
                user_id=ref_id,
                uaid=f"NRY-NR-{uuid.uuid4().hex[:4]}",
                business_type=b_type,
                current_level_number=0,
                current_rank_name="Bronze"
            )
            session.add(member)
            session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
            await session.commit()

            res = await NetworkProgressService.process_referral_repeat_purchase(
                buyer_user_id=buyer_id,
                order_id=f"ORD-NR-{b_type}-{uuid.uuid4().hex[:4]}",
                gross_amount=sub_amt,
                tax_amount=0.0,
                db=session
            )
            assert res["applied_level"] == 0
            assert len(res["newly_completed_levels"]) == 0
            assert res["unused_carry_forward"] == sub_amt


@pytest.mark.asyncio
async def test_section35_qualification_allocation_ledger_distributor():
    """
    Section 35 & 35.1:
    Distributor Unit = ₹10,000
    Transaction A = ₹7,000
    Transaction B = ₹8,000
    Cumulative = ₹15,000
    Engine consumes ₹10,000 for Level 1:
      - Allocated from Tx A = ₹7,000 (FULLY_ALLOCATED, remaining = 0)
      - Allocated from Tx B = ₹3,000 (PARTIALLY_ALLOCATED, remaining = ₹5,000)
    Unused carry-forward = ₹5,000
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-alloc-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-alloc-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=ref_id,
            uaid=f"NRY-AL-{uuid.uuid4().hex[:4]}",
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
        await session.commit()

        # Tx A = ₹7,000
        ord_a = f"ORD-TX-A-{uuid.uuid4().hex[:4]}"
        res_a = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=ord_a,
            gross_amount=7000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_a["applied_level"] == 0
        assert res_a["unused_carry_forward"] == 7000.0

        # Tx B = ₹8,000
        ord_b = f"ORD-TX-B-{uuid.uuid4().hex[:4]}"
        res_b = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=ord_b,
            gross_amount=8000.0,
            tax_amount=0.0,
            db=session
        )
        assert res_b["applied_level"] == 1
        assert res_b["newly_completed_levels"] == [1]
        assert res_b["unused_carry_forward"] == 5000.0

        # Query LevelQualificationAllocation
        alloc_stmt = select(LevelQualificationAllocation).where(
            LevelQualificationAllocation.user_id == ref_id
        ).order_by(LevelQualificationAllocation.created_at.asc())
        allocations = (await session.execute(alloc_stmt)).scalars().all()

        assert len(allocations) == 2

        # Allocation from Tx A: ₹7,000 to Level 1
        alloc_a = next(a for a in allocations if a.transaction_id == res_a["referral_transaction_id"])
        assert alloc_a.level_number == 1
        assert alloc_a.amount_allocated_to_level == 7000.0
        assert alloc_a.amount_remaining == 0.0
        assert alloc_a.allocation_status == "FULLY_ALLOCATED"

        # Allocation from Tx B: ₹3,000 to Level 1, ₹5,000 remaining
        alloc_b = next(a for a in allocations if a.transaction_id == res_b["referral_transaction_id"])
        assert alloc_b.level_number == 1
        assert alloc_b.amount_allocated_to_level == 3000.0
        assert alloc_b.amount_remaining == 5000.0
        assert alloc_b.allocation_status == "PARTIALLY_ALLOCATED"


@pytest.mark.asyncio
async def test_section36_multiple_levels_from_single_transaction():
    """
    Section 36 & 39.2 & 52:
    Distributor: Level Unit = ₹10,000
    Transaction = ₹35,000
    Result:
      Level 1 completed
      Level 2 completed
      Level 3 completed
      Unused remainder = ₹5,000
    Separate level-completion events created!
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-multi-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-multi-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=ref_id,
            uaid=f"NRY-ML-{uuid.uuid4().hex[:4]}",
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
        await session.commit()

        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-MULTI-35K-{uuid.uuid4().hex[:4]}",
            gross_amount=35000.0,
            tax_amount=0.0,
            db=session
        )
        assert res["applied_level"] == 3
        assert res["newly_completed_levels"] == [1, 2, 3]
        assert res["unused_carry_forward"] == 5000.0

        # Verify separate LEVEL_COMPLETED events
        ledger_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
            )
        ).order_by(LevelProgressionLedger.level_number.asc())
        events = (await session.execute(ledger_stmt)).scalars().all()
        assert [e.level_number for e in events] == [1, 2, 3]

        # Verify allocations
        alloc_stmt = select(LevelQualificationAllocation).where(
            LevelQualificationAllocation.user_id == ref_id
        ).order_by(LevelQualificationAllocation.level_number.asc())
        allocs = (await session.execute(alloc_stmt)).scalars().all()
        assert len(allocs) == 3
        assert allocs[0].amount_allocated_to_level == 10000.0
        assert allocs[0].amount_remaining == 25000.0
        assert allocs[1].amount_allocated_to_level == 10000.0
        assert allocs[1].amount_remaining == 15000.0
        assert allocs[2].amount_allocated_to_level == 10000.0
        assert allocs[2].amount_remaining == 5000.0


@pytest.mark.asyncio
async def test_section39_4_and_52_cycle_boundary_transition_and_carry_forward():
    """
    Section 39.4 & 52 Mandatory Test:
    Distributor: Level Unit = ₹10,000
    User has:
      Cycle 1
      Level 119 completed
      Unused qualifying amount = ₹5,000
    A new eligible transaction contributes: ₹25,000 (total available = ₹30,000)
    Result:
      Level 120 completed (Cycle 1)
      Cycle 1 completed
      Cycle 2 started with remaining volume
      Cycle 2 Level 1 and Level 2 completed
      ₹5,000 remaining carry-forward in Cycle 2
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-cycle-b-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-cycle-b-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-CB-{uuid.uuid4().hex[:4]}"

        # Seed member at Cycle 1, Level 119 with ₹5,000 carry-forward
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

        # Seed Cycle 1 record
        cycle1 = NetworkCycle(
            member_id=member.id,
            cycle_number=1,
            status=CycleStatus.ACTIVE,
            current_level=119
        )
        session.add(cycle1)

        # Referral link
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=uaid, referred_user_id=buyer_id, status="ACTIVE"))

        # Seed prior referral transaction of ₹5,000 giving the ₹5,000 unallocated carry-forward
        prior_tx = ReferralTransaction(
            referral_id="sample-ref-id",
            referrer_user_id=ref_id,
            buyer_user_id=buyer_id,
            order_id=f"ORD-PRIOR-5K-{uuid.uuid4().hex[:4]}",
            gross_amount=5000.0,
            tax_amount=0.0,
            eligible_amount=5000.0,
            is_self_purchase=False,
            is_referral_purchase=True,
            status="COMPLETED"
        )
        session.add(prior_tx)
        await session.commit()

        # New transaction of ₹25,000
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-CROSS-25K-{uuid.uuid4().hex[:4]}",
            gross_amount=25000.0,
            tax_amount=0.0,
            db=session
        )

        # Verify final cycle and level
        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 2
        assert res["unused_carry_forward"] == 0.0

        # Verify Cycle 1 is COMPLETED and Cycle 2 is ACTIVE
        c1_stmt = select(NetworkCycle).where(
            and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 1)
        )
        c1 = (await session.execute(c1_stmt)).scalars().first()
        assert c1.status == CycleStatus.COMPLETED
        assert c1.current_level == 120
        assert c1.completed_at is not None

        c2_stmt = select(NetworkCycle).where(
            and_(NetworkCycle.member_id == member.id, NetworkCycle.cycle_number == 2)
        )
        c2 = (await session.execute(c2_stmt)).scalars().first()
        assert c2.status == CycleStatus.ACTIVE
        assert c2.current_level == 2
        assert c2.carry_forward_in >= 20000.0

        # Verify immutable ledger events:
        # LEVEL_COMPLETED for 120 in Cycle 1
        l120_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.cycle_number == 1,
                LevelProgressionLedger.level_number == 120,
                LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
            )
        )
        assert (await session.execute(l120_stmt)).scalars().first() is not None

        # CYCLE_COMPLETED for Cycle 1
        cc_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.cycle_number == 1,
                LevelProgressionLedger.event_type == "CYCLE_COMPLETED"
            )
        )
        assert (await session.execute(cc_stmt)).scalars().first() is not None

        # CYCLE_STARTED for Cycle 2
        cs_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.cycle_number == 2,
                LevelProgressionLedger.event_type == "CYCLE_STARTED"
            )
        )
        assert (await session.execute(cs_stmt)).scalars().first() is not None

        # LEVEL_COMPLETED for Cycle 2 Levels 1 and 2
        c2_levels_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.cycle_number == 2,
                LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
            )
        ).order_by(LevelProgressionLedger.level_number.asc())
        c2_levels = (await session.execute(c2_levels_stmt)).scalars().all()
        assert [l.level_number for l in c2_levels] == [1, 2]

        # Legendary rank reward evaluated for Cycle 1
        legendary_reward_stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == ref_id,
                RewardLedger.cycle_number == 1,
                RewardLedger.rank_number == 12
            )
        )
        assert (await session.execute(legendary_reward_stmt)).scalars().first() is not None


@pytest.mark.asyncio
async def test_section50_webhook_idempotency_zero_duplicate_events():
    """
    Section 50 & 52:
    Duplicate order webhook delivery:
    → zero duplicate level, reward, or carry-forward events
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-idem-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-idem-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=ref_id,
            uaid=f"NRY-ID-{uuid.uuid4().hex[:4]}",
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
        await session.commit()

        order_id = f"ORD-IDEM-{uuid.uuid4().hex[:6]}"

        # Delivery 1
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["status"] == "SUCCESS"
        assert res1["applied_level"] == 1

        # Delivery 2 (Duplicate webhook)
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["status"] == "ALREADY_PROCESSED"
        assert res2["is_duplicate_webhook"] is True

        # Assert no duplicate ledger events
        count_stmt = select(func.count(LevelProgressionLedger.id)).where(
            LevelProgressionLedger.user_id == ref_id
        )
        total_events = (await session.execute(count_stmt)).scalar()
        assert total_events == 1

        # Assert no duplicate allocations
        alloc_count_stmt = select(func.count(LevelQualificationAllocation.id)).where(
            LevelQualificationAllocation.user_id == ref_id
        )
        total_allocs = (await session.execute(alloc_count_stmt)).scalar()
        assert total_allocs == 1


@pytest.mark.asyncio
async def test_section41_refund_and_reversal_ledger():
    """
    Section 41 & 52:
    Customer refund reduces eligible qualifying volume and adjusts levels
    through append-only LEVEL_REVERSED events and updates allocation status.
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-rev-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-rev-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=ref_id,
            uaid=f"NRY-RV-{uuid.uuid4().hex[:4]}",
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)
        session.add(Referral(referrer_user_id=ref_id, referrer_uaid=member.uaid, referred_user_id=buyer_id, status="ACTIVE"))
        await session.commit()

        # Step 1: Purchase of ₹20,000 (qualifies Level 1 and Level 2)
        ord_id = f"ORD-TO-REFUND-{uuid.uuid4().hex[:4]}"
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=ord_id,
            gross_amount=20000.0,
            tax_amount=0.0,
            db=session
        )
        assert res["applied_level"] == 2

        # Step 2: Refund the order
        rev_res = await NetworkProgressService.process_referral_refund_or_reversal(
            referrer_user_id=ref_id,
            order_id=ord_id,
            db=session,
            reason="Customer requested full return"
        )
        assert rev_res["reversal_executed"] is True
        assert rev_res["new_level"] == 0
        assert rev_res["reversed_levels"] == [2, 1]

        # Verify immutable LEVEL_REVERSED events exist
        rev_events_stmt = select(LevelProgressionLedger).where(
            and_(
                LevelProgressionLedger.user_id == ref_id,
                LevelProgressionLedger.event_type == "LEVEL_REVERSED"
            )
        ).order_by(LevelProgressionLedger.level_number.desc())
        rev_events = (await session.execute(rev_events_stmt)).scalars().all()
        assert len(rev_events) == 2
        assert [e.level_number for e in rev_events] == [2, 1]

        # Verify allocation status marked REVERSED
        alloc_stmt = select(LevelQualificationAllocation).where(
            LevelQualificationAllocation.user_id == ref_id
        )
        allocs = (await session.execute(alloc_stmt)).scalars().all()
        assert all(a.allocation_status == "REVERSED" for a in allocs)


@pytest.mark.asyncio
async def test_section35_allocations_api_endpoint():
    """
    Section 35.1: Test GET /api/v1/network/allocations endpoint
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919876543210",
            "otp_code": "123456",
            "full_name": "Consumer A",
            "role": "CUSTOMER"
        })
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        alloc_res = await ac.get("/api/v1/network/allocations", headers=headers)
        assert alloc_res.status_code == 200
        assert isinstance(alloc_res.json(), list)
