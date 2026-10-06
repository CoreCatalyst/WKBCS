import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.network import (
    NetworkMember,
    QuarterlyAccountActivity,
    UAIDReactivationAudit
)
from app.services.quarterly_activity_service import quarterly_service
from app.services.uaid_service import uaid_service

@pytest.mark.asyncio
async def test_progressive_reminders_pre_quarter_end():
    """
    Test pre-quarter-end progressive reminders:
    - 30 days before quarter end -> REMINDER (REMINDER_30)
    - 15 days before quarter end -> REMINDER (REMINDER_15)
    - 7 days before quarter end -> FINAL_WARNING (FINAL_WARNING_7)
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-rem-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-REM-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9195{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="ACTIVE",
            is_reward_eligible=True
        )
        db.add_all([user, member])
        await db.commit()

        # Quarter Q1 ends Mar 31 23:59:59.
        # 1. Date: March 2 (approx 29 days left) -> REMINDER_30
        res_30 = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 3, 2, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res_30["account_activity_status"] == "REMINDER"
        assert res_30["current_warning_stage"] == "REMINDER_30"
        assert "Quarterly Activity Reminder" in res_30["warning_message"]

        # 2. Date: March 17 (approx 14 days left) -> REMINDER_15
        res_15 = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 3, 17, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res_15["account_activity_status"] == "REMINDER"
        assert res_15["current_warning_stage"] == "REMINDER_15"

        # 3. Date: March 26 (approx 5 days left) -> FINAL_WARNING (7 days before quarter end)
        res_7 = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 3, 26, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res_7["account_activity_status"] == "FINAL_WARNING"
        assert res_7["current_warning_stage"] == "FINAL_WARNING_7"
        assert "Final Quarterly Reminder" in res_7["warning_message"]

@pytest.mark.asyncio
async def test_progressive_quarter_missed_enters_30_day_grace():
    """
    Test transition to GRACE_PERIOD when quarter ends with 0 purchases:
    - Customer enters 30-day grace period.
    - Can log in, view account, purchase.
    - Exact warning message: 'Quarter Missed — Grace Period Started'.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-grace-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-GRC-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9194{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="ACTIVE",
            is_reward_eligible=True,
            created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        )
        db.add_all([user, member])
        await db.commit()

        # Reference date: April 10, 2026 (10 days into Q2). Previous quarter Q1 was missed with 0 purchases.
        res = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 4, 10, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res["account_activity_status"] == "GRACE_PERIOD"
        assert res["current_warning_stage"] == "GRACE_PERIOD"
        assert res["can_login"] is True
        assert res["can_purchase"] is True
        assert "Quarter Missed — Grace Period Started" in res["warning_message"]
        assert "Q1 2026" in res["warning_message"]

@pytest.mark.asyncio
async def test_progressive_grace_final_warning():
    """
    Test 7 days before grace expires:
    - Warning changes to 'Final Grace-Period Warning'.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-gfw-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-GFW-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9193{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="ACTIVE",
            is_reward_eligible=True,
            created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        )
        db.add_all([user, member])
        await db.commit()

        # Q1 ended Mar 31. 30-day grace expires April 30.
        # Reference date: April 25 (25 days into grace, only 5 days remaining).
        res = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 4, 25, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res["account_activity_status"] == "GRACE_PERIOD"
        assert res["current_warning_stage"] == "FINAL_GRACE_WARNING"
        assert "Final Grace-Period Warning" in res["warning_message"]
        assert "Q1 2026" in res["warning_message"]

@pytest.mark.asyncio
async def test_progressive_grace_purchase_cures_missed_quarter():
    """
    Test that a qualifying purchase during the 30-day grace period cures the deficiency:
    - Prior missed quarter marked as CURED_IN_GRACE.
    - Member restored to ACTIVE.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-cure-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-CURE-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9192{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="GRACE_PERIOD",
            current_warning_stage="GRACE_PERIOD",
            is_reward_eligible=True
        )
        # Create 0-purchase record for Q1
        q1_rec = QuarterlyAccountActivity(
            user_id=user_id,
            uaid=uaid,
            calendar_year=2026,
            quarter="Q1",
            required_purchase_count=1,
            qualifying_purchase_count=0,
            quarter_status="PENDING"
        )
        db.add_all([user, member, q1_rec])
        await db.commit()

        # Customer makes a purchase on April 15 (during grace period)
        order_id = f"ORD-CURE-{uuid.uuid4().hex[:6]}"
        purchase_date = datetime(2026, 4, 15, 12, 0, 0, tzinfo=timezone.utc)
        await quarterly_service.record_qualifying_purchase(
            user_id=user_id,
            order_id=order_id,
            purchase_date=purchase_date,
            db=db
        )

        # Verify Q1 is cured
        await db.refresh(q1_rec)
        assert q1_rec.is_cured_during_grace is True
        assert q1_rec.cure_order_id == order_id
        assert q1_rec.quarter_status == "CURED_IN_GRACE"

        # Verify Member restored to ACTIVE
        await db.refresh(member)
        assert member.account_activity_status == "ACTIVE"
        assert member.current_warning_stage == "NONE"

@pytest.mark.asyncio
async def test_progressive_grace_expired_enters_inactive_pending_block():
    """
    Test transition to INACTIVE_PENDING_BLOCK:
    - 30 days after quarter end without qualifying purchase -> INACTIVE_PENDING_BLOCK.
    - Final 7-day notice before block.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-pend-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-PEND-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9191{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="ACTIVE",
            is_reward_eligible=True,
            created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        )
        db.add_all([user, member])
        await db.commit()

        # Q1 ended Mar 31.
        # Date: May 4 (34 days after quarter end: 30-day grace expired, within 7-day final notice).
        res = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 5, 4, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res["account_activity_status"] == "INACTIVE_PENDING_BLOCK"
        assert res["current_warning_stage"] == "INACTIVE_PENDING_BLOCK"
        assert "Final 7-Day Notice" in res["warning_message"]

@pytest.mark.asyncio
async def test_progressive_final_notice_expired_blocks_uaid():
    """
    Test transition to UAID_BLOCKED:
    - 7-day final notice expires -> UAID_BLOCKED.
    - Reward eligibility suspended.
    - total_block_events increments.
    - Exact blocking message template applied.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-blk-{uuid.uuid4().hex[:6]}"
        uaid = f"NRY-HS-BLOCKED-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9190{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=uaid,
            account_activity_status="ACTIVE",
            is_reward_eligible=True,
            total_block_events=0,
            created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        )
        db.add_all([user, member])
        await db.commit()

        # Q1 ended Mar 31.
        # Date: May 10 (40 days after quarter end: 30-day grace + 7-day final notice both expired!).
        res = await quarterly_service.evaluate_progressive_account_status(
            user_id=user_id,
            as_of_date=datetime(2026, 5, 10, 12, 0, 0, tzinfo=timezone.utc),
            db=db
        )
        assert res["account_activity_status"] == "UAID_BLOCKED"
        assert res["is_reward_eligible"] is False
        assert "UAID Blocked — Quarterly Activity Requirement Not Met" in res["warning_message"]
        assert uaid in res["warning_message"]
        assert "historical transactions, referral relationships" in res["warning_message"]

@pytest.mark.asyncio
async def test_progressive_controlled_reactivation_and_anti_abuse():
    """
    Test controlled reactivation and anti-abuse audit tracking:
    - Blocked -> Login -> Reactivation Request -> Complete qualifying purchase -> Active
    - Same UAID restored permanently; never generate replacement UAID.
    - Anti-abuse metrics updated: total_reactivations, total_block_events, last_reactivation_date.
    - Immutable audit record written to UAIDReactivationAudit.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"prog-user-react-{uuid.uuid4().hex[:6]}"
        permanent_uaid = f"NRY-HS-PERM-{uuid.uuid4().hex[:4]}"
        user = User(id=user_id, phone=f"+9189{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=permanent_uaid)
        member = NetworkMember(
            user_id=user_id,
            uaid=permanent_uaid,
            account_activity_status="UAID_BLOCKED",
            is_reward_eligible=False,
            total_block_events=1,
            total_reactivations=0
        )
        db.add_all([user, member])
        await db.commit()

        # 1. Complete controlled reactivation with purchase
        react_order_id = f"ORD-REACT-{uuid.uuid4().hex[:6]}"
        success = await quarterly_service.reactivate_uaid(
            user_id=user_id,
            reason="Customer completed required qualifying purchase under controlled compliance review",
            qualifying_order_id=react_order_id,
            db=db
        )
        assert success is True

        # 2. Verify Member is restored to ACTIVE with same UAID
        await db.refresh(member)
        assert member.account_activity_status == "ACTIVE"
        assert member.is_reward_eligible is True
        assert member.uaid == permanent_uaid
        assert member.total_reactivations == 1
        assert member.last_reactivation_date is not None

        # 3. Verify UAIDService idempotency confirms exact same UAID is retained
        retained_uaid, is_new = await uaid_service.get_or_create_account_uaid(
            user_id=user_id,
            business_type="WHOLESALER",
            business_name="Perm Corp",
            db=db
        )
        assert is_new is False
        assert retained_uaid == permanent_uaid

        # 4. Verify immutable reactivation audit event
        audit_stmt = select(UAIDReactivationAudit).where(UAIDReactivationAudit.user_id == user_id)
        audits = (await db.execute(audit_stmt)).scalars().all()
        assert len(audits) == 1
        assert audits[0].uaid == permanent_uaid
        assert audits[0].qualifying_order_id == react_order_id
        assert audits[0].previous_status == "UAID_BLOCKED"
        assert audits[0].restored_status == "ACTIVE"

        # 5. Verify Anti-Abuse summary endpoint output
        summary = await quarterly_service.get_anti_abuse_audit_summary(user_id=user_id, db=db)
        assert summary["uaid"] == permanent_uaid
        assert summary["total_block_events"] == 1
        assert summary["total_reactivations"] == 1
        assert summary["is_reward_eligible"] is True
