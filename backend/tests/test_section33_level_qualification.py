import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import select, and_, func
from app.core.database import AsyncSessionLocal
from app.models.network import (
    NetworkMember,
    Referral,
    ReferralTransaction,
    LevelProgressionLedger,
    RewardLedger,
    NetworkLevelRecord,
    NetworkLevelStatus
)
from app.services.network_service import (
    NetworkProgressService,
    get_minimum_transaction_unit,
    RANKS_SPECIFICATION
)

@pytest.mark.asyncio
async def test_section33_authoritative_rule_matrix():
    """
    Section 33.1 & 33.23: Authoritative minimum transaction amounts per business category.
    Wholesaler:  ₹1,00,000
    Distributor: ₹10,000
    Services:    ₹5,000
    Retailer:    ₹5,000
    """
    assert get_minimum_transaction_unit("WHOLESALER") == 100000.0
    assert get_minimum_transaction_unit("DISTRIBUTOR") == 10000.0
    assert get_minimum_transaction_unit("SERVICES") == 5000.0
    assert get_minimum_transaction_unit("SERVICE") == 5000.0
    assert get_minimum_transaction_unit("SERVICE_PROVIDER") == 5000.0
    assert get_minimum_transaction_unit("REGISTERED_SERVICE_PROVIDER") == 5000.0
    assert get_minimum_transaction_unit("RETAILER") == 5000.0
    assert get_minimum_transaction_unit("RETAIL") == 5000.0

@pytest.mark.asyncio
async def test_wholesaler_exact_threshold_qualification():
    """
    Section 33.3 & 33.4 & 33.29:
    Wholesaler minimum = ₹1,00,000
    ₹99,999 -> 0 new levels (no round up!)
    ₹1,00,000 -> 1 level completed
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-w-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-w-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-WS-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="WHOLESALER",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        # 1. Below threshold: ₹99,999 -> 0 levels completed
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-WS-BELOW-{uuid.uuid4().hex[:4]}",
            gross_amount=99999.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["status"] == "SUCCESS"
        assert res1["newly_completed_levels"] == []
        assert res1["applied_level"] == 0

        # Verify no LEVEL_COMPLETED in ledger
        ledgers = (await session.execute(
            select(LevelProgressionLedger).where(LevelProgressionLedger.user_id == ref_id)
        )).scalars().all()
        assert len(ledgers) == 0

        # 2. Add ₹1 to reach ₹1,00,000 -> completes Level 1!
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-WS-EXACT-{uuid.uuid4().hex[:4]}",
            gross_amount=1.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["status"] == "SUCCESS"
        assert res2["newly_completed_levels"] == [1]
        assert res2["applied_level"] == 1

        # Verify 1 LEVEL_COMPLETED entry in LevelProgressionLedger
        ledgers = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                )
            )
        )).scalars().all()
        assert len(ledgers) == 1
        assert ledgers[0].level_number == 1
        assert ledgers[0].qualified_amount == 100000.0
        assert ledgers[0].minimum_required_amount == 100000.0

        # Level 1 must NOT issue rank reward (Section 33.12: progress only!)
        reward_entries = (await session.execute(
            select(RewardLedger).where(RewardLedger.user_id == ref_id)
        )).scalars().all()
        assert len(reward_entries) == 0

@pytest.mark.asyncio
async def test_distributor_services_retailer_exact_thresholds():
    """
    Section 33.29:
    Distributor: ₹9,999 -> 0, ₹10,000 -> 1
    Services:    ₹4,999 -> 0, ₹5,000 -> 1
    Retailer:    ₹4,999 -> 0, ₹5,000 -> 1
    """
    async with AsyncSessionLocal() as session:
        for biz_type, threshold in [("DISTRIBUTOR", 10000.0), ("SERVICES", 5000.0), ("RETAILER", 5000.0)]:
            ref_id = f"ref-{biz_type}-{uuid.uuid4().hex[:6]}"
            buyer_id = f"buyer-{biz_type}-{uuid.uuid4().hex[:6]}"
            uaid = f"NRY-{biz_type[:2]}-{uuid.uuid4().hex[:4]}"

            member = NetworkMember(
                user_id=ref_id,
                uaid=uaid,
                business_type=biz_type,
                current_level_number=0,
                current_rank_name="Bronze"
            )
            session.add(member)

            referral = Referral(
                referrer_user_id=ref_id,
                referrer_uaid=uaid,
                referred_user_id=buyer_id,
                status="ACTIVE"
            )
            session.add(referral)
            await session.commit()

            # 1. ₹1 below threshold
            res_below = await NetworkProgressService.process_referral_repeat_purchase(
                buyer_user_id=buyer_id,
                order_id=f"ORD-{biz_type}-BELOW-{uuid.uuid4().hex[:4]}",
                gross_amount=threshold - 1.0,
                tax_amount=0.0,
                db=session
            )
            assert res_below["newly_completed_levels"] == []
            assert res_below["applied_level"] == 0

            # 2. ₹1 more to meet threshold
            res_meet = await NetworkProgressService.process_referral_repeat_purchase(
                buyer_user_id=buyer_id,
                order_id=f"ORD-{biz_type}-MEET-{uuid.uuid4().hex[:4]}",
                gross_amount=1.0,
                tax_amount=0.0,
                db=session
            )
            assert res_meet["newly_completed_levels"] == [1]
            assert res_meet["applied_level"] == 1

@pytest.mark.asyncio
async def test_cumulative_volume_and_carry_forward():
    """
    Section 33.18:
    Transaction 1 = ₹60,000
    Transaction 2 = ₹40,000
    Total = ₹1,00,000 -> Wholesaler Level 1 completed!
    Partial amount remains tracked as eligible progress and carries forward.
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-cum-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-cum-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-CUM-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="WHOLESALER",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        # Tx 1: ₹60,000
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-CUM-1-{uuid.uuid4().hex[:4]}",
            gross_amount=60000.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["newly_completed_levels"] == []
        assert res1["cumulative_network_volume"] == 60000.0

        # Tx 2: ₹40,000 -> Total ₹1,00,000
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-CUM-2-{uuid.uuid4().hex[:4]}",
            gross_amount=40000.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["newly_completed_levels"] == [1]
        assert res2["cumulative_network_volume"] == 100000.0
        assert res2["applied_level"] == 1

@pytest.mark.asyncio
async def test_multiple_levels_and_rank_boundary_eval():
    """
    Section 33.11, 33.12, 33.15, 33.19:
    Distributor (unit = ₹10,000)
    Transaction 1 = ₹30,000 -> completes Levels 1, 2, 3 in one transaction!
    Intermediate levels (1, 2, 3) do NOT trigger rank reward.
    Transaction 2 = ₹70,000 -> completes Levels 4, 5, 6, 7, 8, 9, 10!
    Level 10 is Rank 1 (Bronze) boundary -> triggers Bronze rank reward!
    Distinguishes:
    LEVEL_COMPLETED (10 separate events)
    RANK_COMPLETED (Bronze event)
    REWARD_ISSUED (Bronze reward in RewardLedger)
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-multi-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-multi-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-MLT-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        # Tx 1: ₹30,000 -> 3 levels
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-MULTI-1-{uuid.uuid4().hex[:4]}",
            gross_amount=30000.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["newly_completed_levels"] == [1, 2, 3]
        assert res1["applied_level"] == 3

        # Zero rank rewards for levels 1, 2, 3!
        r_stmt = select(RewardLedger).where(RewardLedger.user_id == ref_id)
        assert len((await session.execute(r_stmt)).scalars().all()) == 0

        # Tx 2: ₹70,000 -> completes levels 4 to 10
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-MULTI-2-{uuid.uuid4().hex[:4]}",
            gross_amount=70000.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["newly_completed_levels"] == [4, 5, 6, 7, 8, 9, 10]
        assert res2["applied_level"] == 10

        # Verify exactly 10 LEVEL_COMPLETED events
        lvl_events = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                )
            ).order_by(LevelProgressionLedger.level_number.asc())
        )).scalars().all()
        assert len(lvl_events) == 10
        assert [e.level_number for e in lvl_events] == list(range(1, 11))

        # Verify exactly 1 RANK_COMPLETED event at boundary Level 10
        rank_events = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "RANK_COMPLETED"
                )
            )
        )).scalars().all()
        assert len(rank_events) == 1
        assert rank_events[0].level_number == 10
        assert "Bronze" in rank_events[0].rule_id

        # Verify exactly 1 REWARD_ISSUED entry in RewardLedger for Bronze (Rank 1)
        reward_records = (await session.execute(r_stmt)).scalars().all()
        assert len(reward_records) == 1
        assert reward_records[0].rank_number == 1
        assert reward_records[0].rank_name == "Bronze"
        assert reward_records[0].reward_amount == 1210.0  # ₹110,000 @ 1.10%

@pytest.mark.asyncio
async def test_duplicate_webhook_and_event_idempotency():
    """
    Section 33.17:
    Duplicate processing of identical webhook/order:
    - Does NOT complete level twice.
    - Does NOT create duplicate ledger entries.
    - Does NOT increase level.
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-dup-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-dup-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-DUP-{uuid.uuid4().hex[:4]}"
        order_id = f"ORD-IDEMPOTENT-{uuid.uuid4().hex[:6]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        # First webhook arrival
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res1["status"] == "SUCCESS"
        assert res1["applied_level"] == 1

        # Second identical webhook arrival
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=10000.0,
            tax_amount=0.0,
            db=session
        )
        assert res2["status"] == "ALREADY_PROCESSED"
        assert res2["is_duplicate_webhook"] is True

        # Verify only 1 ledger event exists
        ledgers = (await session.execute(
            select(LevelProgressionLedger).where(LevelProgressionLedger.user_id == ref_id)
        )).scalars().all()
        assert len(ledgers) == 1

@pytest.mark.asyncio
async def test_self_purchase_does_not_qualify():
    """
    Section 33.6:
    User's self purchase must NOT qualify for referral network volume or level completion.
    """
    async with AsyncSessionLocal() as session:
        user_id = f"user-self-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-SELF-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            business_type="WHOLESALER",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        # Self-referral
        referral = Referral(
            referrer_user_id=user_id,
            referrer_uaid=uaid,
            referred_user_id=user_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=user_id,
            order_id=f"ORD-SELF-{uuid.uuid4().hex[:4]}",
            gross_amount=200000.0,
            tax_amount=0.0,
            db=session
        )
        assert res["is_self_purchase"] is True
        assert res["reward_eligible"] is False
        assert res.get("newly_completed_levels", []) == []

        # Zero level ledgers
        ledgers = (await session.execute(
            select(LevelProgressionLedger).where(LevelProgressionLedger.user_id == user_id)
        )).scalars().all()
        assert len(ledgers) == 0

@pytest.mark.asyncio
async def test_refund_creates_reversal_without_deleting_history():
    """
    Section 33.27:
    Refund creates LEVEL_REVERSED and reverses rank reward if boundary lost.
    Original LEVEL_COMPLETED events are NOT deleted.
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-rev-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-rev-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-REV-{uuid.uuid4().hex[:4]}"
        order_id = f"ORD-TO-REFUND-{uuid.uuid4().hex[:4]}"

        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="SERVICES",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        # Services: ₹50,000 -> 10 levels completed & Bronze rank rewarded!
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=order_id,
            gross_amount=50000.0,
            tax_amount=0.0,
            db=session
        )
        assert len(res["newly_completed_levels"]) == 10
        assert res["applied_level"] == 10

        # Verify original LEVEL_COMPLETED entries = 10
        orig_events = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                )
            )
        )).scalars().all()
        assert len(orig_events) == 10

        # Execute Refund / Reversal
        rev_res = await NetworkProgressService.process_referral_refund_or_reversal(
            referrer_user_id=ref_id,
            order_id=order_id,
            db=session,
            reason="Customer dispute and full refund finalized"
        )
        assert rev_res["status"] == "REVERSED"
        assert rev_res["reversal_executed"] is True
        assert rev_res["new_level"] == 0

        # Verify original LEVEL_COMPLETED entries are STILL PRESERVED (never deleted!)
        orig_events_after = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                )
            )
        )).scalars().all()
        assert len(orig_events_after) == 10

        # Verify 10 LEVEL_REVERSED entries were added
        rev_events = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.event_type == "LEVEL_REVERSED"
                )
            )
        )).scalars().all()
        assert len(rev_events) == 10

        # Verify Rank Reward was reversed
        reversals = (await session.execute(
            select(RewardLedger).where(
                and_(
                    RewardLedger.user_id == ref_id,
                    RewardLedger.status == "REVERSED"
                )
            )
        )).scalars().all()
        assert len(reversals) == 1

@pytest.mark.asyncio
async def test_level_120_cap():
    """
    Section 33.20:
    Volume crossing 120 levels must cap at Level 120 and NEVER create Level 121.
    """
    async with AsyncSessionLocal() as session:
        ref_id = f"ref-cap-{uuid.uuid4().hex[:6]}"
        buyer_id = f"buyer-cap-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-CAP-{uuid.uuid4().hex[:4]}"

        # Distributor: 120 levels * ₹10,000 = ₹12,00,000
        # If user gets ₹20,00,000 (which would be 200 levels), caps at 120!
        member = NetworkMember(
            user_id=ref_id,
            uaid=uaid,
            business_type="DISTRIBUTOR",
            current_level_number=0,
            current_rank_name="Bronze"
        )
        session.add(member)

        referral = Referral(
            referrer_user_id=ref_id,
            referrer_uaid=uaid,
            referred_user_id=buyer_id,
            status="ACTIVE"
        )
        session.add(referral)
        await session.commit()

        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_id,
            order_id=f"ORD-CAP-120-{uuid.uuid4().hex[:4]}",
            gross_amount=2000000.0,
            tax_amount=0.0,
            db=session
        )
        # Cycle 1 completes at Level 120, then transitions to Cycle 2 Level 80
        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 80
        assert 120 in res["newly_completed_levels"]
        assert 121 not in res["newly_completed_levels"]

        # Invariant: No Level 121 exists in any cycle
        l121 = (await session.execute(
            select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == ref_id,
                    LevelProgressionLedger.level_number > 120
                )
            )
        )).scalars().all()
        assert len(l121) == 0
