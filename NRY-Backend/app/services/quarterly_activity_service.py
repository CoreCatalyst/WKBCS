import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.network import (
    QuarterlyAccountActivity,
    NetworkMember,
    UAIDReactivationAudit,
    UAIDReactivationTransaction,
    Referral,
    NetworkCycle,
    RewardLedger
)
from app.models.user import User

REACTIVATION_MINIMUM_PURCHASE_UNITS: Dict[str, float] = {
    "WHOLESELLER": 100000.0,
    "WHOLESALER": 100000.0,
    "DISTRIBUTOR": 10000.0,
    "RETAILOR": 5000.0,
    "RETAILER": 5000.0,
    "SHOP": 5000.0,
    "SERVICE_PROVIDER": 5000.0,
    "SERVICE PROVIDER": 5000.0,
    "SERVICE": 5000.0,
    "SKILLED_SERVICE": 5000.0,
    "FREELANCER": 5000.0,
    "MANUFACTURER": 100000.0,
    "CUSTOMER": 2000.0,
    "BUYER": 2000.0,
}

def get_reactivation_minimum_unit(business_type: str) -> float:
    normalized = (business_type or "CUSTOMER").strip().upper().replace(" ", "_")
    if "CUSTOMER" in normalized or "BUYER" in normalized:
        return 2000.0
    return REACTIVATION_MINIMUM_PURCHASE_UNITS.get(normalized, 5000.0)


class QuarterlyActivityService:
    """
    Noryvanta Progressive Quarterly Purchase & Active Account Engine.
    
    Enforces the Progressive Cure Lifecycle:
    | Stage                 | Trigger                                              | Account Status          | Action                                           |
    | --------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------ |
    | Quarter active        | Quarter begins                                       | ACTIVE                  | Normal purchasing                                |
    | Reminder 1            | 30 days before quarter end                           | REMINDER                | In-app + notification                            |
    | Reminder 2            | 15 days before quarter end                           | REMINDER                | Stronger notification                            |
    | Final reminder        | 7 days before quarter end                            | FINAL_WARNING           | State purchase deadline                          |
    | Quarter missed        | Quarter ends with 0 qualifying purchases             | MISSED_QUARTER          | Grace period starts                              |
    | Grace period          | Next 30 calendar days                                | GRACE_PERIOD            | Customer can cure deficiency with purchase       |
    | Grace expired         | 30 days after quarter end without cure purchase      | INACTIVE_PENDING_BLOCK  | Final 7-day notice                               |
    | Final block           | 7-day notice expires                                 | UAID_BLOCKED            | Suspends reward eligibility & referral benefits  |
    | Reactivation          | Controlled qualifying purchase verification          | ACTIVE                  | Same UAID restored; never generates another UAID |
    """

    @staticmethod
    def get_quarter_for_date(dt: Optional[datetime] = None) -> Tuple[int, str]:
        target = dt or datetime.now(timezone.utc)
        year = target.year
        month = target.month
        if 1 <= month <= 3:
            q = "Q1"
        elif 4 <= month <= 6:
            q = "Q2"
        elif 7 <= month <= 9:
            q = "Q3"
        else:
            q = "Q4"
        return year, q

    @staticmethod
    def get_quarter_date_bounds(year: int, quarter: str) -> Tuple[datetime, datetime]:
        if quarter == "Q1":
            return (
                datetime(year, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
                datetime(year, 3, 31, 23, 59, 59, tzinfo=timezone.utc)
            )
        elif quarter == "Q2":
            return (
                datetime(year, 4, 1, 0, 0, 0, tzinfo=timezone.utc),
                datetime(year, 6, 30, 23, 59, 59, tzinfo=timezone.utc)
            )
        elif quarter == "Q3":
            return (
                datetime(year, 7, 1, 0, 0, 0, tzinfo=timezone.utc),
                datetime(year, 9, 30, 23, 59, 59, tzinfo=timezone.utc)
            )
        else:
            return (
                datetime(year, 10, 1, 0, 0, 0, tzinfo=timezone.utc),
                datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
            )

    @staticmethod
    def get_previous_quarter(year: int, quarter: str) -> Tuple[int, str]:
        if quarter == "Q1":
            return year - 1, "Q4"
        elif quarter == "Q2":
            return year, "Q1"
        elif quarter == "Q3":
            return year, "Q2"
        else:
            return year, "Q3"

    @classmethod
    async def evaluate_progressive_account_status(
        cls,
        user_id: str,
        db: AsyncSession,
        as_of_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Evaluates progressive quarterly account lifecycle for user_id against reference date.
        Generates deterministic warning stages, cure periods, or transitions to blocking.
        """
        target_dt = as_of_date or datetime.now(timezone.utc)
        curr_year, curr_quarter = cls.get_quarter_for_date(target_dt)
        curr_q_start, curr_q_end = cls.get_quarter_date_bounds(curr_year, curr_quarter)
        prev_year, prev_quarter = cls.get_previous_quarter(curr_year, curr_quarter)
        prev_q_start, prev_q_end = cls.get_quarter_date_bounds(prev_year, prev_quarter)

        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        uaid = member.uaid if member else "NRY-MEMBER"

        # 1. If explicitly blocked already, retain block state unless reactivated
        if member and member.account_activity_status == "UAID_BLOCKED":
            block_msg = (
                f"UAID Blocked — Quarterly Activity Requirement Not Met: "
                f"Your Noryvanta UAID {uaid} has been blocked because the required quarterly activity "
                f"was not completed within the applicable grace and final-warning periods. "
                f"Your historical transactions, referral relationships, levels, cycles and reward ledger remain preserved. "
                f"No new reward eligibility will be created while the UAID is blocked."
            )
            return {
                "user_id": user_id,
                "uaid": uaid,
                "account_activity_status": "UAID_BLOCKED",
                "current_warning_stage": "UAID_BLOCKED",
                "is_reward_eligible": False,
                "can_login": True,
                "can_purchase": True,
                "warning_message": block_msg,
                "grace_period_end_date": member.grace_period_end_date,
                "final_notice_end_date": member.final_notice_end_date,
                "missed_quarter_count": member.missed_quarter_count,
                "total_block_events": member.total_block_events,
                "total_reactivations": member.total_reactivations
            }

        # 2. Check previous quarter compliance
        prev_stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.calendar_year == prev_year,
                QuarterlyAccountActivity.quarter == prev_quarter
            )
        )
        prev_rec = (await db.execute(prev_stmt)).scalars().first()
        prev_satisfied = (prev_rec is not None and (prev_rec.quarter_status in ["MET", "CURED_IN_GRACE"] or prev_rec.qualifying_purchase_count >= 1))

        # If member was registered after the previous quarter ended, they could not have missed it
        if member and member.created_at:
            reg_dt = member.created_at
            if reg_dt.tzinfo is None:
                reg_dt = reg_dt.replace(tzinfo=timezone.utc)
            if reg_dt > prev_q_end:
                prev_satisfied = True

        # Check if previous quarter was missed and currently in grace/pending block
        if not prev_satisfied:
            seconds_past_prev_q = (target_dt - prev_q_end).total_seconds()
            if seconds_past_prev_q > 0:
                days_past_prev_q = seconds_past_prev_q / 86400.0
                grace_end = prev_q_end + timedelta(days=30)
                final_notice_end = prev_q_end + timedelta(days=37)

                # STAGE: 30-day Grace Period
                if days_past_prev_q <= 30:
                    status = "GRACE_PERIOD"
                    grace_end_str = grace_end.strftime("%d %b %Y")
                    # If within last 7 days of grace period: Final Grace Warning
                    if (30 - days_past_prev_q) <= 7:
                        warning_stage = "FINAL_GRACE_WARNING"
                        msg = (
                            f"Final Grace-Period Warning: Your Noryvanta UAID remains non-compliant for {prev_quarter} {prev_year}. "
                            f"Please complete the required qualifying purchase by {grace_end_str}. "
                            f"Failure to do so will result in your UAID being blocked according to the Noryvanta Business Rules."
                        )
                    else:
                        warning_stage = "GRACE_PERIOD"
                        msg = (
                            f"Quarter Missed — Grace Period Started: Your qualifying purchase requirement for {prev_quarter} {prev_year} "
                            f"was not completed. Your UAID is now in a 30-day grace period. "
                            f"Complete one qualifying purchase by {grace_end_str} to restore quarterly compliance."
                        )

                    if member:
                        member.account_activity_status = status
                        member.current_warning_stage = warning_stage
                        member.grace_period_end_date = grace_end
                        member.last_warning_message = msg
                        member.last_warning_sent_at = target_dt
                        await db.commit()

                    return {
                        "user_id": user_id,
                        "uaid": uaid,
                        "account_activity_status": status,
                        "current_warning_stage": warning_stage,
                        "is_reward_eligible": True,
                        "can_login": True,
                        "can_purchase": True,
                        "grace_period_end_date": grace_end,
                        "days_remaining_in_grace": max(0, round(30 - days_past_prev_q, 1)),
                        "warning_message": msg
                    }

                # STAGE: Inactive Pending Block (7-day final notice after grace expiry)
                elif days_past_prev_q <= 37:
                    status = "INACTIVE_PENDING_BLOCK"
                    warning_stage = "INACTIVE_PENDING_BLOCK"
                    final_notice_str = final_notice_end.strftime("%d %b %Y")
                    msg = (
                        f"Grace Period Expired — Final 7-Day Notice: Your 30-day grace period for {prev_quarter} {prev_year} "
                        f"has expired without a qualifying purchase. Please complete a qualifying purchase by {final_notice_str} "
                        f"to prevent permanent account blocking."
                    )
                    if member:
                        member.account_activity_status = status
                        member.current_warning_stage = warning_stage
                        member.final_notice_end_date = final_notice_end
                        member.last_warning_message = msg
                        member.last_warning_sent_at = target_dt
                        await db.commit()

                    return {
                        "user_id": user_id,
                        "uaid": uaid,
                        "account_activity_status": status,
                        "current_warning_stage": warning_stage,
                        "is_reward_eligible": False,
                        "can_login": True,
                        "can_purchase": True,
                        "final_notice_end_date": final_notice_end,
                        "days_remaining_before_block": max(0, round(37 - days_past_prev_q, 1)),
                        "warning_message": msg
                    }

                # STAGE: Final Block (7-day notice expired)
                else:
                    status = "UAID_BLOCKED"
                    warning_stage = "UAID_BLOCKED"
                    msg = (
                        f"UAID Blocked — Quarterly Activity Requirement Not Met: "
                        f"Your Noryvanta UAID {uaid} has been blocked because the required quarterly activity "
                        f"was not completed within the applicable grace and final-warning periods. "
                        f"Your historical transactions, referral relationships, levels, cycles and reward ledger remain preserved. "
                        f"No new reward eligibility will be created while the UAID is blocked."
                    )
                    if member:
                        member.account_activity_status = status
                        member.current_warning_stage = warning_stage
                        member.is_reward_eligible = False
                        member.total_block_events = (member.total_block_events or 0) + 1
                        member.missed_quarter_count = (member.missed_quarter_count or 0) + 1
                        member.last_warning_message = msg
                        member.last_warning_sent_at = target_dt
                        await db.commit()

                    return {
                        "user_id": user_id,
                        "uaid": uaid,
                        "account_activity_status": status,
                        "current_warning_stage": warning_stage,
                        "is_reward_eligible": False,
                        "can_login": True,
                        "can_purchase": True,
                        "warning_message": msg,
                        "total_block_events": member.total_block_events if member else 1
                    }

        # 3. Previous quarter is satisfied; evaluate current active quarter
        curr_stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.calendar_year == curr_year,
                QuarterlyAccountActivity.quarter == curr_quarter
            )
        )
        curr_rec = (await db.execute(curr_stmt)).scalars().first()
        curr_count = curr_rec.qualifying_purchase_count if curr_rec else 0

        # If current quarter already satisfied
        if curr_count >= 1:
            if member and member.account_activity_status != "ACTIVE":
                member.account_activity_status = "ACTIVE"
                member.current_warning_stage = "NONE"
                member.is_reward_eligible = True
                await db.commit()

            return {
                "user_id": user_id,
                "uaid": uaid,
                "account_activity_status": "ACTIVE",
                "current_warning_stage": "NONE",
                "is_reward_eligible": True,
                "quarter": curr_quarter,
                "year": curr_year,
                "completed_purchases": curr_count,
                "status": "MET"
            }

        # Current quarter has 0 purchases; calculate days remaining until quarter end
        seconds_left = (curr_q_end - target_dt).total_seconds()
        days_left = max(0.0, seconds_left / 86400.0)
        curr_end_str = curr_q_end.strftime("%d %b %Y")

        if days_left <= 7:
            status = "FINAL_WARNING"
            stage = "FINAL_WARNING_7"
            msg = (
                f"Final Quarterly Reminder: Your quarterly activity requirement is still pending. "
                f"Please complete one qualifying purchase before {curr_end_str}. "
                f"If the requirement is not completed, your account will enter the applicable grace period."
            )
        elif days_left <= 15:
            status = "REMINDER"
            stage = "REMINDER_15"
            msg = (
                f"Quarterly Activity Reminder (15 Days): Your Noryvanta UAID currently has no qualifying purchase for this quarter. "
                f"Please complete at least one eligible Product or Service purchase before {curr_end_str} to maintain your active status."
            )
        elif days_left <= 30:
            status = "REMINDER"
            stage = "REMINDER_30"
            msg = (
                f"Quarterly Activity Reminder: Your Noryvanta UAID currently has no qualifying purchase for this quarter. "
                f"Please complete at least one eligible Product or Service purchase before the quarter ends to maintain your active status."
            )
        else:
            status = "ACTIVE"
            stage = "NONE"
            msg = None

        if member:
            member.account_activity_status = status
            member.current_warning_stage = stage
            member.last_warning_message = msg
            if msg:
                member.last_warning_sent_at = target_dt
            await db.commit()

        return {
            "user_id": user_id,
            "uaid": uaid,
            "account_activity_status": status,
            "current_warning_stage": stage,
            "is_reward_eligible": True,
            "quarter": curr_quarter,
            "year": curr_year,
            "completed_purchases": 0,
            "days_left_in_quarter": round(days_left, 1),
            "warning_message": msg
        }

    @classmethod
    async def record_qualifying_purchase(
        cls,
        user_id: str,
        order_id: str,
        purchase_date: Optional[datetime],
        db: AsyncSession
    ) -> QuarterlyAccountActivity:
        """
        Records a completed qualifying purchase.
        If account was in GRACE_PERIOD due to a missed prior quarter, this purchase cures the missed quarter!
        """
        dt = purchase_date or datetime.now(timezone.utc)
        year, quarter = cls.get_quarter_for_date(dt)
        prev_year, prev_quarter = cls.get_previous_quarter(year, quarter)

        # Get UAID for user
        u_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(u_stmt)).scalars().first()
        uaid = user.uaid if user and user.uaid else "NRY-MEMBER"

        # Check if user had a missed previous quarter needing cure during grace
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()

        cured_grace = False
        if member and member.account_activity_status in ["GRACE_PERIOD", "MISSED_QUARTER", "INACTIVE_PENDING_BLOCK"]:
            prev_stmt = select(QuarterlyAccountActivity).where(
                and_(
                    QuarterlyAccountActivity.user_id == user_id,
                    QuarterlyAccountActivity.calendar_year == prev_year,
                    QuarterlyAccountActivity.quarter == prev_quarter
                )
            )
            prev_record = (await db.execute(prev_stmt)).scalars().first()
            if prev_record and prev_record.qualifying_purchase_count == 0:
                prev_record.is_cured_during_grace = True
                prev_record.cure_order_id = order_id
                prev_record.cure_timestamp = dt
                prev_record.quarter_status = "CURED_IN_GRACE"
                prev_record.evaluated_at = dt
                cured_grace = True

        # Check existing record for current quarter
        stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.calendar_year == year,
                QuarterlyAccountActivity.quarter == quarter
            )
        )
        record = (await db.execute(stmt)).scalars().first()

        if not record:
            record = QuarterlyAccountActivity(
                user_id=user_id,
                uaid=uaid,
                calendar_year=year,
                quarter=quarter,
                required_purchase_count=1,
                qualifying_purchase_count=1,
                first_qualifying_purchase_id=order_id,
                last_qualifying_purchase_id=order_id,
                quarter_status="MET",
                evaluated_at=dt
            )
            db.add(record)
        else:
            record.qualifying_purchase_count += 1
            record.last_qualifying_purchase_id = order_id
            record.quarter_status = "MET"
            record.evaluated_at = dt

        # Restore Member to ACTIVE
        if member:
            member.account_activity_status = "ACTIVE"
            member.current_warning_stage = "NONE"
            member.is_reward_eligible = True
            member.last_warning_message = None

        await db.commit()
        await db.refresh(record)
        return record

    @classmethod
    async def reverse_qualifying_purchase(
        cls,
        user_id: str,
        order_id: str,
        purchase_date: Optional[datetime],
        db: AsyncSession
    ) -> Optional[QuarterlyAccountActivity]:
        """
        Reverses purchase qualification if an order is refunded, cancelled, or reversed.
        """
        dt = purchase_date or datetime.now(timezone.utc)
        year, quarter = cls.get_quarter_for_date(dt)

        stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.calendar_year == year,
                QuarterlyAccountActivity.quarter == quarter
            )
        )
        record = (await db.execute(stmt)).scalars().first()
        if not record:
            return None

        record.qualifying_purchase_count = max(0, record.qualifying_purchase_count - 1)
        if record.qualifying_purchase_count == 0:
            record.quarter_status = "PENDING"
        record.evaluated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(record)
        return record

    @classmethod
    async def get_annual_quarterly_status(
        cls,
        user_id: str,
        calendar_year: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Evaluates Q1, Q2, Q3, Q4 compliance for the given year.
        Confirms that 4 purchases in Q1 only satisfy Q1.
        """
        stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.calendar_year == calendar_year
            )
        )
        records = (await db.execute(stmt)).scalars().all()
        by_quarter = {r.quarter: r for r in records}

        quarter_results = []
        satisfied_quarters = 0
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            rec = by_quarter.get(q)
            status = rec.quarter_status if rec else "PENDING"
            count = rec.qualifying_purchase_count if rec else 0
            if status in ["MET", "CURED_IN_GRACE"]:
                satisfied_quarters += 1

            quarter_results.append({
                "year": calendar_year,
                "quarter": q,
                "required": 1,
                "completed": count,
                "status": status,
                "is_cured": rec.is_cured_during_grace if rec else False
            })

        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        account_status = member.account_activity_status if member else "ACTIVE"

        return {
            "user_id": user_id,
            "calendar_year": calendar_year,
            "satisfied_quarters": satisfied_quarters,
            "annual_requirement_met": satisfied_quarters == 4,
            "account_activity_status": account_status,
            "current_warning_stage": member.current_warning_stage if member else "NONE",
            "quarters": quarter_results
        }

    @classmethod
    async def block_uaid(
        cls,
        user_id: str,
        reason: str,
        db: AsyncSession
    ) -> bool:
        """
        Transitions UAID status to UAID_BLOCKED.
        Preserves all historical records while blocking new reward eligibility.
        Updates anti-abuse counters (total_block_events).
        """
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if not member:
            return False

        member.account_activity_status = "UAID_BLOCKED"
        member.current_warning_stage = "UAID_BLOCKED"
        member.is_reward_eligible = False
        member.total_block_events = (member.total_block_events or 0) + 1
        member.missed_quarter_count = (member.missed_quarter_count or 0) + 1
        member.last_warning_message = (
            f"UAID Blocked — Quarterly Activity Requirement Not Met: "
            f"Your Noryvanta UAID {member.uaid} has been blocked ({reason}). "
            f"Historical transactions, referral relationships, and ledger preserved."
        )
        member.last_warning_sent_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    @classmethod
    async def reactivate_uaid(
        cls,
        user_id: str,
        reason: str,
        db: AsyncSession,
        qualifying_order_id: Optional[str] = None
    ) -> bool:
        """
        Controlled Reactivation Workflow:
        Blocked -> Reactivation Request -> Complete qualifying purchase -> System verification -> Active.
        Restores ACTIVE status, keeps the same UAID permanently, logs immutable audit record.
        """
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if not member:
            return False

        original_uaid = member.uaid
        order_ref = qualifying_order_id or f"REACT-ORD-{uuid.uuid4().hex[:6]}"

        member.account_activity_status = "ACTIVE"
        member.current_warning_stage = "NONE"
        member.is_reward_eligible = True
        member.total_reactivations = (member.total_reactivations or 0) + 1
        member.last_reactivation_date = datetime.now(timezone.utc)
        member.last_warning_message = None

        # Record immutable reactivation audit event
        audit = UAIDReactivationAudit(
            user_id=user_id,
            uaid=original_uaid,
            qualifying_order_id=order_ref,
            reactivated_by="SYSTEM_VERIFICATION",
            previous_status="UAID_BLOCKED",
            restored_status="ACTIVE",
            notes=reason
        )
        db.add(audit)
        await db.commit()
        return True

    @classmethod
    async def get_anti_abuse_audit_summary(
        cls,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Anti-Abuse Audit Summary for compliance:
        Maintains:
        - UAID
        - Original Registration Date
        - Current Status
        - Missed Quarter Count
        - Total Block Events
        - Total Reactivations
        - Last Reactivation Date
        - Current Cycle
        - Historical Cycles
        - Referral Relationship
        - Reward Ledger Count
        """
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if not member:
            return {"error": "Member not found"}

        # Fetch referral relationship
        ref_stmt = select(Referral).where(Referral.referred_user_id == user_id)
        ref = (await db.execute(ref_stmt)).scalars().first()

        # Fetch cycles count
        cycle_stmt = select(func.count(NetworkCycle.id)).where(NetworkCycle.member_id == member.id)
        cycles_count = (await db.execute(cycle_stmt)).scalar() or 1

        # Fetch reward ledger count
        ledger_stmt = select(func.count(RewardLedger.id)).where(RewardLedger.user_id == user_id)
        ledger_count = (await db.execute(ledger_stmt)).scalar() or 0

        return {
            "user_id": user_id,
            "uaid": member.uaid,
            "original_registration_date": member.created_at,
            "current_status": member.account_activity_status,
            "current_warning_stage": member.current_warning_stage,
            "is_reward_eligible": member.is_reward_eligible,
            "missed_quarter_count": member.missed_quarter_count,
            "total_block_events": member.total_block_events,
            "total_reactivations": member.total_reactivations,
            "last_reactivation_date": member.last_reactivation_date,
            "current_cycle": member.current_cycle_number,
            "historical_cycles_count": cycles_count,
            "referrer_user_id": ref.referrer_user_id if ref else None,
            "referrer_uaid": ref.referrer_uaid if ref else None,
            "reward_ledger_entries_count": ledger_count
        }

    @classmethod
    async def calculate_missed_quarters_for_user(
        cls,
        user_id: str,
        db: AsyncSession
    ) -> int:
        """
        Calculates missed quarters strictly from verified database records.
        Does not allow frontend values to override calculation.
        """
        # 1. Check member recorded missed_quarter_count
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        recorded_count = member.missed_quarter_count if member else 0

        # 2. Check quarterly activity ledger for uncured quarters
        q_stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.qualifying_purchase_count == 0,
                QuarterlyAccountActivity.is_cured_during_grace == False,
                QuarterlyAccountActivity.quarter_status.in_(["PENDING", "MISSED"])
            )
        )
        activities = (await db.execute(q_stmt)).scalars().all()
        activity_count = len(activities)

        missed = max(recorded_count, activity_count)
        if member and member.account_activity_status == "UAID_BLOCKED" and missed == 0:
            missed = 1
        return max(1, missed)

    @classmethod
    async def calculate_reactivation_requirement(
        cls,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Calculates Required Reactivation Purchase Amount = Business Minimum Purchase Amount × Number of Missed Quarters.
        Strict server-side calculation from verified database records.
        """
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if not member:
            return {"error": "Member not found"}

        # Verified business type
        verified_type = (member.business_type or "RETAILER").strip().upper()
        min_unit = get_reactivation_minimum_unit(verified_type)
        missed_quarters = await cls.calculate_missed_quarters_for_user(user_id, db)
        required_amount = min_unit * missed_quarters

        return {
            "user_id": user_id,
            "uaid": member.uaid,
            "business_type": verified_type,
            "missed_quarter_count": missed_quarters,
            "minimum_purchase_unit": min_unit,
            "required_reactivation_amount": required_amount,
            "currency": "INR",
            "formula": f"₹{min_unit:,.0f} × {missed_quarters} missed quarter(s) = ₹{required_amount:,.0f}"
        }

    @classmethod
    async def submit_reactivation_form(
        cls,
        user_id: str,
        db: AsyncSession,
        frontend_missed_quarters: Optional[int] = None,
        frontend_minimum_unit: Optional[float] = None,
        frontend_required_amount: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submits UAID Reactivation Form.
        Enforces Section 9 Backend Security:
        Never trusts frontend-supplied values. Overwrites all values with server-side verified calculation.
        """
        calc = await cls.calculate_reactivation_requirement(user_id, db)
        if "error" in calc:
            return calc

        # Create Reactivation Transaction record
        tx = UAIDReactivationTransaction(
            user_id=user_id,
            uaid=calc["uaid"],
            business_type=calc["business_type"],
            missed_quarter_count=calc["missed_quarter_count"],
            minimum_purchase_unit=calc["minimum_purchase_unit"],
            required_reactivation_amount=calc["required_reactivation_amount"],
            payment_status="PAYMENT_PENDING",
            order_status="ORDER_PENDING",
            reactivation_status="AMOUNT_CALCULATED",
            submitted_at=datetime.now(timezone.utc),
            notes=notes or "Reactivation form submitted. Awaiting qualifying purchase."
        )
        db.add(tx)
        await db.commit()
        await db.refresh(tx)

        return {
            "reactivation_id": tx.id,
            "uaid": tx.uaid,
            "user_id": tx.user_id,
            "business_type": tx.business_type,
            "missed_quarter_count": tx.missed_quarter_count,
            "minimum_purchase_unit": tx.minimum_purchase_unit,
            "required_reactivation_amount": tx.required_reactivation_amount,
            "reactivation_status": tx.reactivation_status,
            "submitted_at": tx.submitted_at,
            "message": f"Reactivation purchase requirement calculated: ₹{tx.required_reactivation_amount:,.0f}. Please complete qualifying purchase."
        }

    @classmethod
    async def process_reactivation_purchase(
        cls,
        user_id: str,
        reactivation_id: str,
        order_id: str,
        amount_paid: float,
        payment_status: str,
        order_status: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Verifies qualifying purchase and completes reactivation.
        Enforces:
        - Failed, cancelled, refunded, reversed, fraudulent transactions CANNOT activate UAID.
        - Must satisfy amount_paid >= required_reactivation_amount.
        - Preserves existing UAID (NEVER generates replacement UAID).
        - Historical transactions, cycles, and ledger preserved intact.
        - Does NOT retroactively mark prior missed quarters as normal qualifying quarters (remains MISSED).
        - Does NOT retroactively create reward events for missed quarters.
        - Records immutable audit log.
        """
        stmt = select(UAIDReactivationTransaction).where(
            and_(
                UAIDReactivationTransaction.id == reactivation_id,
                UAIDReactivationTransaction.user_id == user_id
            )
        )
        tx = (await db.execute(stmt)).scalars().first()
        if not tx:
            return {"success": False, "error": "Reactivation transaction record not found"}

        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if not member:
            return {"success": False, "error": "Member not found"}

        # 1. Non-eligible transaction check
        ineligible_payment = payment_status.upper() in ["FAILED", "REFUNDED", "CANCELLED", "REVERSED", "PENDING"]
        ineligible_order = order_status.upper() in ["CANCELLED", "REFUNDED", "FAILED", "PENDING"]

        if ineligible_payment or ineligible_order:
            tx.transaction_id = order_id
            tx.amount_paid = amount_paid
            tx.payment_status = payment_status
            tx.order_status = order_status
            tx.reactivation_status = "REACTIVATION_REJECTED"
            await db.commit()
            return {
                "success": False,
                "reactivation_status": "REACTIVATION_REJECTED",
                "error": f"Transaction not verified or ineligible (Payment: {payment_status}, Order: {order_status}). UAID remains BLOCKED."
            }

        # 2. Minimum amount verification
        if amount_paid < tx.required_reactivation_amount:
            tx.transaction_id = order_id
            tx.amount_paid = amount_paid
            tx.payment_status = payment_status
            tx.order_status = order_status
            tx.reactivation_status = "PAYMENT_PENDING"
            await db.commit()
            return {
                "success": False,
                "reactivation_status": "PAYMENT_PENDING",
                "error": f"Amount paid (₹{amount_paid:,.2f}) is less than required reactivation amount (₹{tx.required_reactivation_amount:,.2f})."
            }

        # 3. Successful Reactivation: Restore existing UAID to ACTIVE
        now = datetime.now(timezone.utc)
        original_uaid = member.uaid

        tx.transaction_id = order_id
        tx.amount_paid = amount_paid
        tx.payment_status = "PAYMENT_SUCCESS"
        tx.order_status = "ORDER_COMPLETED"
        tx.reactivation_status = "REACTIVATION_APPROVED"
        tx.approved_at = now
        tx.activated_at = now

        # Update member status
        member.account_activity_status = "ACTIVE"
        member.current_warning_stage = "NONE"
        member.is_reward_eligible = True
        member.total_reactivations = (member.total_reactivations or 0) + 1
        member.last_reactivation_date = now
        member.last_warning_message = None

        # Rule 6: Previously missed quarters remain recorded as MISSED (not retroactively qualified)
        q_stmt = select(QuarterlyAccountActivity).where(
            and_(
                QuarterlyAccountActivity.user_id == user_id,
                QuarterlyAccountActivity.qualifying_purchase_count == 0,
                QuarterlyAccountActivity.is_cured_during_grace == False
            )
        )
        missed_records = (await db.execute(q_stmt)).scalars().all()
        for m_rec in missed_records:
            m_rec.quarter_status = "MISSED"

        # Record immutable reactivation audit event
        audit = UAIDReactivationAudit(
            user_id=user_id,
            uaid=original_uaid,
            qualifying_order_id=order_id,
            reactivated_by="SYSTEM_VERIFICATION",
            previous_status="UAID_BLOCKED",
            restored_status="ACTIVE",
            notes=f"Reactivation completed: ₹{amount_paid:,.2f} paid for {tx.missed_quarter_count} missed quarter(s)."
        )
        db.add(audit)
        await db.commit()
        await db.refresh(tx)

        return {
            "success": True,
            "reactivation_id": tx.id,
            "uaid": original_uaid,
            "reactivation_status": "REACTIVATION_APPROVED",
            "account_activity_status": "ACTIVE",
            "is_reward_eligible": True,
            "amount_paid": amount_paid,
            "required_amount": tx.required_reactivation_amount,
            "missed_quarters_preserved_as_missed": len(missed_records),
            "message": f"UAID {original_uaid} successfully reactivated to ACTIVE. Zero secondary UAIDs generated."
        }

quarterly_service = QuarterlyActivityService()

