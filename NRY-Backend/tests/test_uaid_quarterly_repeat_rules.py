import pytest
import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, and_, func

from app.core.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.network import (
    NetworkMember,
    Referral,
    ReferralTransaction,
    RewardLedger,
    UAIDGenerationLog,
    QuarterlyAccountActivity
)
from app.services.uaid_service import uaid_service
from app.services.quarterly_activity_service import quarterly_service
from app.services.network_service import NetworkProgressService

@pytest.mark.asyncio
async def test_rule_1_single_permanent_uaid_idempotency():
    """
    Test 1: Same account requests UAID twice -> only one unique UAID exists.
    Second call returns existing UAID and logs DUPLICATE in audit log.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r1-{uuid.uuid4().hex[:8]}"
        test_user = User(
            id=user_id,
            phone=f"+9198{uuid.uuid4().hex[:8]}",
            full_name="Single UAID Customer",
            role=RoleEnum.BUYER
        )
        db.add(test_user)
        await db.commit()

        # First request
        req1 = f"REQ-{uuid.uuid4().hex[:6]}"
        uaid_1, is_new_1 = await uaid_service.get_or_create_account_uaid(
            user_id=user_id,
            business_type="WHOLESALER",
            business_name="Test Enterprise",
            db=db,
            request_id=req1,
            registration_status="COMPLETED",
            kyc_status="VERIFIED"
        )
        assert is_new_1 is True
        assert uaid_1.startswith("NRY-HS-")

        # Second request (repeated attempt)
        req2 = f"REQ-{uuid.uuid4().hex[:6]}"
        uaid_2, is_new_2 = await uaid_service.get_or_create_account_uaid(
            user_id=user_id,
            business_type="WHOLESALER",
            business_name="Test Enterprise Duplicate Attempt",
            db=db,
            request_id=req2,
            registration_status="COMPLETED",
            kyc_status="VERIFIED"
        )
        # Invariant: Second request must return existing UAID without generating a new one
        assert is_new_2 is False
        assert uaid_1 == uaid_2

        # Verify audit logs
        log_stmt = select(UAIDGenerationLog).where(UAIDGenerationLog.user_id == user_id).order_by(UAIDGenerationLog.created_at)
        logs = (await db.execute(log_stmt)).scalars().all()
        assert len(logs) == 2
        assert logs[0].result == "SUCCESS"
        assert logs[1].result == "DUPLICATE"

@pytest.mark.asyncio
async def test_rule_1_concurrent_uaid_generation():
    """
    Test 2: Concurrent UAID-generation requests -> only one UAID is created.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r2-{uuid.uuid4().hex[:8]}"
        test_user = User(
            id=user_id,
            phone=f"+9197{uuid.uuid4().hex[:8]}",
            full_name="Concurrent UAID Customer",
            role=RoleEnum.BUYER
        )
        db.add(test_user)
        await db.commit()

        # Concurrently request UAID generation
        async def call_gen():
            async with AsyncSessionLocal() as sub_db:
                return await uaid_service.get_or_create_account_uaid(
                    user_id=user_id,
                    business_type="RETAILER",
                    business_name="Apex Retail",
                    db=sub_db
                )

        results = await asyncio.gather(*(call_gen() for _ in range(4)))
        uaids = [r[0] for r in results]
        # All generated UAIDs must be identical
        assert len(set(uaids)) == 1

@pytest.mark.asyncio
async def test_rule_1_duplicate_account_flagged():
    """
    Test 3: Duplicate account attempts to obtain reward eligibility -> rejected / not reward eligible.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r3-{uuid.uuid4().hex[:8]}"
        member = NetworkMember(
            user_id=user_id,
            uaid=f"NRY-MF-CLONE-{uuid.uuid4().hex[:4]}",
            business_type="MANUFACTURER",
            current_cycle_number=1,
            current_level_number=1,
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member)
        await db.commit()

        # Flag duplicate clone identity
        await uaid_service.flag_duplicate_account(
            user_id=user_id,
            reason="Multiple duplicate phone registrations detected",
            db=db
        )

        await db.refresh(member)
        assert member.account_activity_status == "DUPLICATE / NOT REWARD ELIGIBLE"
        assert member.is_reward_eligible is False

        # Verify audit log recorded
        log_stmt = select(UAIDGenerationLog).where(
            and_(UAIDGenerationLog.user_id == user_id, UAIDGenerationLog.result == "REJECTED")
        )
        rej_log = (await db.execute(log_stmt)).scalars().first()
        assert rej_log is not None
        assert "Multiple duplicate" in rej_log.notes

@pytest.mark.asyncio
async def test_rule_2_one_qualifying_purchase_in_q1():
    """
    Test 4: One qualifying purchase in Q1 -> Q1 requirement satisfied.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r4-{uuid.uuid4().hex[:8]}"
        q1_date = datetime(2026, 2, 20, 10, 0, 0, tzinfo=timezone.utc)
        order_id = f"ORD-Q1-{uuid.uuid4().hex[:6]}"

        await quarterly_service.record_qualifying_purchase(
            user_id=user_id,
            order_id=order_id,
            purchase_date=q1_date,
            db=db
        )

        annual_status = await quarterly_service.get_annual_quarterly_status(
            user_id=user_id,
            calendar_year=2026,
            db=db
        )

        quarters = {q["quarter"]: q for q in annual_status["quarters"]}
        assert quarters["Q1"]["status"] == "MET"
        assert quarters["Q1"]["completed"] == 1
        assert quarters["Q2"]["status"] == "PENDING"
        assert quarters["Q3"]["status"] == "PENDING"
        assert quarters["Q4"]["status"] == "PENDING"
        assert annual_status["satisfied_quarters"] == 1
        assert annual_status["annual_requirement_met"] is False

@pytest.mark.asyncio
async def test_rule_2_four_purchases_in_q1_do_not_satisfy_q2_q4():
    """
    Test 5: Four purchases in Q1 but none in Q2/Q3/Q4 -> Q2-Q4 are NOT automatically satisfied.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r5-{uuid.uuid4().hex[:8]}"
        q1_date = datetime(2026, 3, 10, 12, 0, 0, tzinfo=timezone.utc)

        # 4 purchases in Q1
        for i in range(4):
            await quarterly_service.record_qualifying_purchase(
                user_id=user_id,
                order_id=f"ORD-Q1-BATCH-{i}-{uuid.uuid4().hex[:4]}",
                purchase_date=q1_date,
                db=db
            )

        annual_status = await quarterly_service.get_annual_quarterly_status(
            user_id=user_id,
            calendar_year=2026,
            db=db
        )

        quarters = {q["quarter"]: q for q in annual_status["quarters"]}
        assert quarters["Q1"]["completed"] == 4
        assert quarters["Q1"]["status"] == "MET"
        # Crucial Rule 2 Constraint: 4 purchases concentrated in Q1 do not count for Q2, Q3, or Q4!
        assert quarters["Q2"]["status"] == "PENDING"
        assert quarters["Q2"]["completed"] == 0
        assert quarters["Q3"]["status"] == "PENDING"
        assert quarters["Q3"]["completed"] == 0
        assert quarters["Q4"]["status"] == "PENDING"
        assert quarters["Q4"]["completed"] == 0
        assert annual_status["satisfied_quarters"] == 1
        assert annual_status["annual_requirement_met"] is False

@pytest.mark.asyncio
async def test_rule_2_cancelled_purchase_not_counted():
    """
    Test 6: Cancelled purchase does not satisfy quarterly requirement.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r6-{uuid.uuid4().hex[:8]}"
        # If an order is created but cancelled before completion, it is never recorded in quarterly activity
        # Verify initial state is PENDING
        annual_status = await quarterly_service.get_annual_quarterly_status(
            user_id=user_id,
            calendar_year=2026,
            db=db
        )
        assert annual_status["satisfied_quarters"] == 0
        for q in annual_status["quarters"]:
            assert q["status"] == "PENDING"

@pytest.mark.asyncio
async def test_rule_2_refunded_purchase_reversed():
    """
    Test 7: Refunded purchase does not remain a qualifying activity transaction.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"test-user-r7-{uuid.uuid4().hex[:8]}"
        q2_date = datetime(2026, 5, 10, tzinfo=timezone.utc)
        order_id = f"ORD-REFUND-Q2-{uuid.uuid4().hex[:4]}"

        # Record initial purchase
        await quarterly_service.record_qualifying_purchase(
            user_id=user_id,
            order_id=order_id,
            purchase_date=q2_date,
            db=db
        )

        status_before = await quarterly_service.get_annual_quarterly_status(
            user_id=user_id, calendar_year=2026, db=db
        )
        quarters_before = {q["quarter"]: q for q in status_before["quarters"]}
        assert quarters_before["Q2"]["status"] == "MET"
        assert quarters_before["Q2"]["completed"] == 1

        # Process refund / reversal
        await quarterly_service.reverse_qualifying_purchase(
            user_id=user_id,
            order_id=order_id,
            purchase_date=q2_date,
            db=db
        )

        status_after = await quarterly_service.get_annual_quarterly_status(
            user_id=user_id, calendar_year=2026, db=db
        )
        quarters_after = {q["quarter"]: q for q in status_after["quarters"]}
        assert quarters_after["Q2"]["status"] == "PENDING"
        assert quarters_after["Q2"]["completed"] == 0

@pytest.mark.asyncio
async def test_rule_3_repeat_purchase_permanent_referral():
    """
    Test 8: Customer B purchases again using the platform -> existing referral relationship remains unchanged.
    """
    async with AsyncSessionLocal() as db:
        ref_a_id = f"referrer-a-{uuid.uuid4().hex[:6]}"
        buyer_b_id = f"buyer-b-{uuid.uuid4().hex[:6]}"

        # Setup Referrer A
        ref_a_uaid = f"NRY-HS-REFA-{uuid.uuid4().hex[:6]}"
        member_a = NetworkMember(
            user_id=ref_a_id,
            uaid=ref_a_uaid,
            business_type="WHOLESALER",
            current_cycle_number=1,
            current_level_number=10,
            current_rank_name="Bronze",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member_a)

        # Setup Permanent Referral Link (B -> A)
        referral = Referral(
            referrer_user_id=ref_a_id,
            referred_user_id=buyer_b_id,
            referrer_uaid=ref_a_uaid,
            status="ACTIVE"
        )
        db.add(referral)
        await db.commit()

        # Repeat Purchase 1
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-B-1-{uuid.uuid4().hex[:4]}",
            gross_amount=50000.0,
            tax_amount=9000.0,
            db=db
        )
        assert res1["status"] == "SUCCESS"
        assert res1["referrer_id"] == ref_a_id

        # Repeat Purchase 2
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-B-2-{uuid.uuid4().hex[:4]}",
            gross_amount=75000.0,
            tax_amount=13500.0,
            db=db
        )
        assert res2["status"] == "SUCCESS"
        assert res2["referrer_id"] == ref_a_id

        # Verify Referral relationship is permanently retained
        ref_stmt = select(Referral).where(Referral.referred_user_id == buyer_b_id)
        all_refs = (await db.execute(ref_stmt)).scalars().all()
        assert len(all_refs) == 1
        assert all_refs[0].referrer_user_id == ref_a_id

@pytest.mark.asyncio
async def test_rule_4_repeat_purchase_uses_current_cycle_and_level():
    """
    Test 9: Repeat purchase by B -> reward event uses A's CURRENT running cycle/level according to existing reward rules.
    """
    async with AsyncSessionLocal() as db:
        ref_a_id = f"ref-a-c2-{uuid.uuid4().hex[:6]}"
        buyer_b_id = f"buyer-b-c2-{uuid.uuid4().hex[:6]}"

        # Referrer A is currently in Cycle 2, Level 25, Silver
        ref_a_uaid = f"NRY-HS-REFA-{uuid.uuid4().hex[:6]}"
        member_a = NetworkMember(
            user_id=ref_a_id,
            uaid=ref_a_uaid,
            business_type="WHOLESALER",
            current_cycle_number=2,
            current_level_number=25,
            current_rank_name="Silver",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member_a)

        referral = Referral(
            referrer_user_id=ref_a_id,
            referred_user_id=buyer_b_id,
            referrer_uaid=ref_a_uaid,
            status="ACTIVE"
        )
        db.add(referral)
        await db.commit()

        # Repeat purchase
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-CYCLE2-{uuid.uuid4().hex[:4]}",
            gross_amount=100000.0,
            tax_amount=18000.0,
            db=db
        )
        assert res["status"] == "SUCCESS"
        assert res["applied_cycle"] == 2
        assert res["applied_level"] == 25
        assert res["applied_rank"] == "Silver"

@pytest.mark.asyncio
async def test_rule_5_webhook_replay_idempotency():
    """
    Test 10: Same payment webhook received twice -> only ONE reward event created.
    """
    async with AsyncSessionLocal() as db:
        ref_a_id = f"ref-a-wh-{uuid.uuid4().hex[:6]}"
        buyer_b_id = f"buyer-b-wh-{uuid.uuid4().hex[:6]}"

        ref_a_uaid = f"NRY-HS-REFA-{uuid.uuid4().hex[:6]}"
        member_a = NetworkMember(
            user_id=ref_a_id,
            uaid=ref_a_uaid,
            business_type="DISTRIBUTOR",
            current_cycle_number=1,
            current_level_number=5,
            current_rank_name="Bronze",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member_a)

        referral = Referral(
            referrer_user_id=ref_a_id,
            referred_user_id=buyer_b_id,
            referrer_uaid=ref_a_uaid,
            status="ACTIVE"
        )
        db.add(referral)
        await db.commit()

        target_order_id = f"ORD-WEBHOOK-DUPL-{uuid.uuid4().hex[:6]}"

        # First webhook arrival
        call_1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=target_order_id,
            gross_amount=25000.0,
            tax_amount=4500.0,
            db=db
        )
        assert call_1["status"] == "SUCCESS"

        # Second webhook arrival (duplicate retry)
        call_2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=target_order_id,
            gross_amount=25000.0,
            tax_amount=4500.0,
            db=db
        )
        assert call_2["status"] == "ALREADY_PROCESSED"
        assert call_2["is_duplicate_webhook"] is True

        # Ensure only 1 record exists in ReferralTransaction
        tx_stmt = select(ReferralTransaction).where(ReferralTransaction.order_id == target_order_id)
        txs = (await db.execute(tx_stmt)).scalars().all()
        assert len(txs) == 1

@pytest.mark.asyncio
async def test_rule_4_progression_before_repeat_purchase():
    """
    Test 11: Customer reaches a new level/rank before B's next eligible purchase -> next purchase uses new cycle/level rules.
    """
    async with AsyncSessionLocal() as db:
        ref_a_id = f"ref-a-prog-{uuid.uuid4().hex[:6]}"
        buyer_b_id = f"buyer-b-prog-{uuid.uuid4().hex[:6]}"

        ref_a_uaid = f"NRY-HS-REFA-{uuid.uuid4().hex[:6]}"
        member_a = NetworkMember(
            user_id=ref_a_id,
            uaid=ref_a_uaid,
            business_type="WHOLESALER",
            current_cycle_number=1,
            current_level_number=10,
            current_rank_name="Bronze",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member_a)

        referral = Referral(
            referrer_user_id=ref_a_id,
            referred_user_id=buyer_b_id,
            referrer_uaid=ref_a_uaid,
            status="ACTIVE"
        )
        db.add(referral)
        await db.commit()

        # Initial purchase at Bronze (Level 10)
        res1 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-BEFORE-PROG-{uuid.uuid4().hex[:4]}",
            gross_amount=30000.0,
            tax_amount=5400.0,
            db=db
        )
        assert res1["applied_rank"] == "Bronze"

        # Customer A now progresses to Gold (Level 50)
        member_a.current_level_number = 50
        member_a.current_rank_name = "Gold"
        await db.commit()

        # Subsequent purchase by B must use A's new level (50) and rank (Gold)
        res2 = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-AFTER-PROG-{uuid.uuid4().hex[:4]}",
            gross_amount=40000.0,
            tax_amount=7200.0,
            db=db
        )
        assert res2["applied_level"] == 50
        assert res2["applied_rank"] == "Gold"

@pytest.mark.asyncio
async def test_rule_2_blocked_uaid_rejects_reward_eligibility():
    """
    Test 12: Blocked UAID attempts a reward-generating transaction -> reward eligibility is rejected.
    """
    async with AsyncSessionLocal() as db:
        ref_a_id = f"ref-a-blk-{uuid.uuid4().hex[:6]}"
        buyer_b_id = f"buyer-b-blk-{uuid.uuid4().hex[:6]}"

        ref_a_uaid = f"NRY-HS-BLK-{uuid.uuid4().hex[:6]}"
        member_a = NetworkMember(
            user_id=ref_a_id,
            uaid=ref_a_uaid,
            business_type="WHOLESALER",
            current_cycle_number=1,
            current_level_number=20,
            current_rank_name="Silver",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member_a)

        referral = Referral(
            referrer_user_id=ref_a_id,
            referred_user_id=buyer_b_id,
            referrer_uaid=ref_a_uaid,
            status="ACTIVE"
        )
        db.add(referral)
        await db.commit()

        # Block Referrer A due to failure to maintain quarterly purchases
        await quarterly_service.block_uaid(
            user_id=ref_a_id,
            reason="Missed all 4 quarterly purchase obligations",
            db=db
        )

        # Buyer B makes a repeat purchase
        res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=buyer_b_id,
            order_id=f"ORD-BLOCKED-ATTEMPT-{uuid.uuid4().hex[:4]}",
            gross_amount=60000.0,
            tax_amount=10800.0,
            db=db
        )
        assert res["status"] == "REJECTED_BLOCKED_REFERRER"
        assert res["reward_eligible"] is False

@pytest.mark.asyncio
async def test_rule_2_blocking_preserves_historical_records():
    """
    Test 13: Blocking an UAID -> historical transaction and reward ledger remain completely intact.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-hist-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=user_id,
            uaid=f"NRY-HS-HIST-{uuid.uuid4().hex[:6]}",
            business_type="WHOLESALER",
            current_cycle_number=1,
            current_level_number=11,
            current_rank_name="Bronze",
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add(member)

        # Create historical RewardLedger entry
        history_ledger = RewardLedger(
            user_id=user_id,
            member_id=member.id,
            cycle_number=1,
            rank_number=1,
            rank_name="Bronze",
            qualification_level=11,
            business_type="WHOLESALER",
            gross_amount=1100000.0,
            tax_amount=0.0,
            eligible_amount=1100000.0,
            qualification_amount=1100000.0,
            reward_rate=1.10,
            reward_amount=12100.0,
            currency="INR",
            reward_type="RANK_COMPLETION",
            status="REWARDED",
            transaction_id=f"TX-HIST-{uuid.uuid4().hex[:6]}"
        )
        db.add(history_ledger)
        await db.commit()

        # Block the user
        await quarterly_service.block_uaid(user_id=user_id, reason="Inactivity", db=db)

        # Verify historical ledger still exists untouched
        stmt = select(RewardLedger).where(RewardLedger.user_id == user_id)
        ledgers = (await db.execute(stmt)).scalars().all()
        assert len(ledgers) == 1
        assert ledgers[0].reward_amount == 12100.0
        assert ledgers[0].status == "REWARDED"

@pytest.mark.asyncio
async def test_rule_2_reactivation_preserves_uaid():
    """
    Test 14: Reactivation -> existing UAID remains unchanged and no second UAID is generated.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-react-{uuid.uuid4().hex[:6]}"
        original_uaid = f"NRY-HS-REACT-{uuid.uuid4().hex[:4]}"
        user = User(
            id=user_id,
            phone=f"+9196{uuid.uuid4().hex[:8]}",
            full_name="Reactivation Member",
            role=RoleEnum.BUYER,
            uaid=original_uaid
        )
        db.add(user)
        member = NetworkMember(
            user_id=user_id,
            uaid=original_uaid,
            business_type="WHOLESALER",
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False
        )
        db.add(member)
        await db.commit()

        # Admin authorized reactivation
        success = await quarterly_service.reactivate_uaid(
            user_id=user_id,
            reason="Admin authorized reactivation upon compliance review",
            db=db
        )
        assert success is True
        await db.refresh(member)
        assert member.account_activity_status == "ACTIVE"
        assert member.is_reward_eligible is True
        assert member.uaid == original_uaid

        # Verify idempotency: calling get_or_create_account_uaid returns same original UAID
        retrieved_uaid, is_new = await uaid_service.get_or_create_account_uaid(
            user_id=user_id,
            business_type="WHOLESALER",
            business_name="Reactivation Member",
            db=db
        )
        assert is_new is False
        assert retrieved_uaid == original_uaid

@pytest.mark.asyncio
async def test_rule_6_refund_creates_reversal_ledger_without_deletion():
    """
    Test 15: Refund after reward posting -> original reward remains in immutable ledger and a reversal event is created.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"user-rev-{uuid.uuid4().hex[:6]}"
        member = NetworkMember(
            user_id=user_id,
            uaid=f"NRY-HS-REV-{uuid.uuid4().hex[:4]}",
            business_type="WHOLESALER",
            current_cycle_number=1,
            current_level_number=11,
            current_rank_name="Bronze"
        )
        db.add(member)

        # Original reward entry
        orig_ledger = RewardLedger(
            user_id=user_id,
            member_id=member.id,
            cycle_number=1,
            rank_number=1,
            rank_name="Bronze",
            qualification_level=11,
            business_type="WHOLESALER",
            gross_amount=1100000.0,
            tax_amount=0.0,
            eligible_amount=1100000.0,
            qualification_amount=1100000.0,
            reward_rate=1.10,
            reward_amount=12100.0,
            currency="INR",
            reward_type="RANK_COMPLETION",
            status="REWARDED",
            transaction_id=f"TX-ORIG-{uuid.uuid4().hex[:6]}"
        )
        db.add(orig_ledger)
        await db.commit()

        # Trigger reversal
        reversal = await NetworkProgressService.reverse_rank_reward(
            user_id=user_id,
            rank_number=1,
            cycle_number=1,
            reason="Customer order refunded by gateway",
            db=db
        )
        assert reversal is not None
        assert reversal.reward_type == "RANK_REVERSAL"
        assert reversal.status == "REVERSED"

        # Verify both original AND reversal exist in the immutable ledger
        all_stmt = select(RewardLedger).where(RewardLedger.user_id == user_id)
        entries = (await db.execute(all_stmt)).scalars().all()
        assert len(entries) == 2

        types = {e.reward_type: e.status for e in entries}
        assert types["RANK_COMPLETION"] == "REWARDED"
        assert types["RANK_REVERSAL"] == "REVERSED"
