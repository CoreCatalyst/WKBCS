"""
Noryvanta Customer Reward & Referral Engine
Sections 4, 5, 6, 7, 8, 9, 10, 11
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_

from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.network import (
    NetworkMember,
    NetworkCycle,
    NetworkLevelRecord,
    NetworkLevelStatus,
    CycleStatus,
    RewardLedger,
    Referral,
    ReferralTransaction,
    LevelProgressionLedger,
    LevelQualificationAllocation,
    QuarterlyAccountActivity,
)
from app.services.uaid_service import uaid_service
from app.services.quarterly_activity_service import quarterly_service
from app.services.network_service import (
    RANKS_SPECIFICATION,
    get_rank_for_level,
    get_rank_spec_for_level,
    calculate_rank_reward_benchmark,
    NetworkProgressService
)

CUSTOMER_UNIT_PER_LEVEL = 2000.0  # INR 2,000 per level
CUSTOMER_ENTRY_THRESHOLD = 2000.0  # INR 2,000 qualifying purchase to enter reward system


class CustomerRewardService:

    @classmethod
    async def get_or_create_customer_member(
        cls,
        customer_user_id: str,
        db: AsyncSession
    ) -> NetworkMember:
        """
        Retrieves or initializes a Customer's NetworkMember record and Cycle 1.
        Initial state: 0 completed levels, is_reward_eligible = False until referral + INR 2,000 threshold.
        """
        stmt = select(NetworkMember).where(NetworkMember.user_id == customer_user_id)
        res = await db.execute(stmt)
        member = res.scalars().first()

        u_stmt = select(User).where(User.id == customer_user_id)
        user = (await db.execute(u_stmt)).scalars().first()

        if not member:
            # Ensure permanent UAID
            uaid_val, _ = await uaid_service.get_or_create_customer_uaid(customer_user_id, db)

            member = NetworkMember(
                user_id=customer_user_id,
                consumer_name=user.full_name if user and user.full_name else "Customer",
                uaid=uaid_val,
                business_type="CUSTOMER",
                current_cycle_number=1,
                current_level_number=0,
                current_rank_name="Bronze",
                is_reward_eligible=False,
                unused_carry_forward_amount=0.0,
                qualifying_volume_current_cycle=0.0,
                kyc_verified=False
            )
            db.add(member)
            await db.flush()

            # Initialize Cycle 1
            cycle1 = NetworkCycle(
                member_id=member.id,
                cycle_number=1,
                status=CycleStatus.ACTIVE,
                current_level=0,
                started_at=datetime.now(timezone.utc)
            )
            db.add(cycle1)
            await db.flush()

            # Seed 120 Levels
            levels = []
            for lvl in range(1, 121):
                rec = NetworkLevelRecord(
                    member_id=member.id,
                    cycle_id=cycle1.id,
                    level_number=lvl,
                    rank_name=get_rank_for_level(lvl),
                    status=NetworkLevelStatus.LOCKED,
                    transaction_status="NONE",
                    verification_status="NONE",
                    qualification_status="NONE",
                    reward_status="NONE"
                )
                levels.append(rec)
            db.add_all(levels)
            await db.commit()
            await db.refresh(member)

        return member

    @classmethod
    async def validate_customer_referral(
        cls,
        referrer_code_or_uaid: str,
        referee_user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Enforces Section 5 (Customer Referral Rules):
        1. Validate referral on backend.
        2. Referrer must have a genuine Customer account (starts with NRY-C-).
        3. Reject referral identifiers belonging to:
           - Wholesalers, Distributors, Retailers, Service Providers, Merchants, Enterprises, Admins.
        4. Prevent self-referral.
        5. Prevent duplicate network membership (cannot already have a referral).
        6. Prevent referral cycles / circular relationships.
        7. Prevent changing a referral once established.
        """
        clean_code = (referrer_code_or_uaid or "").strip().upper()

        if not clean_code:
            return {"valid": False, "message": "Referral code cannot be empty."}

        # 1. Format Check: Must start with NRY-C-
        if not clean_code.startswith("NRY-C-"):
            return {
                "valid": False,
                "message": (
                    "Invalid Customer referral code format. Customer referrals must be "
                    "a valid Customer UAID in the NRY-C-XXXXXXXXXX format. "
                    "Business UAIDs are strictly rejected."
                )
            }

        # 2. Check if referee already has an established referral relationship (Rule 4 & 6)
        existing_ref_stmt = select(Referral).where(Referral.referred_user_id == referee_user_id)
        existing_ref = (await db.execute(existing_ref_stmt)).scalars().first()
        if existing_ref:
            return {
                "valid": False,
                "message": (
                    f"Customer already has an established referral ({existing_ref.referrer_uaid}). "
                    "Referrals cannot be altered once established."
                )
            }

        # 3. Look up Referrer User by UAID
        u_stmt = select(User).where(User.uaid == clean_code)
        referrer_user = (await db.execute(u_stmt)).scalars().first()

        if not referrer_user:
            # Also check NetworkMember table
            nm_stmt = select(NetworkMember).where(NetworkMember.uaid == clean_code)
            nm = (await db.execute(nm_stmt)).scalars().first()
            if nm:
                referrer_user = await db.get(User, nm.user_id)

        if not referrer_user:
            return {
                "valid": False,
                "message": f"Referral UAID '{clean_code}' not found in active customer registry."
            }

        # 4. Self-referral Prevention (Rule 3)
        if referrer_user.id == referee_user_id:
            return {
                "valid": False,
                "message": "Self-referral is strictly prohibited. You cannot use your own UAID."
            }

        # 5. Role and Business Type Validation (Reject non-customer roles)
        if referrer_user.role not in [RoleEnum.CUSTOMER, RoleEnum.BUYER]:
            return {
                "valid": False,
                "message": (
                    f"Referrer has role '{referrer_user.role.value}'. "
                    "Only genuine Customers can refer other Customers. Business and Admin roles are rejected."
                )
            }

        # Reject if user has an associated BusinessProfile
        bp_stmt = select(BusinessProfile).where(BusinessProfile.user_id == referrer_user.id)
        biz_profile = (await db.execute(bp_stmt)).scalars().first()
        if biz_profile:
            return {
                "valid": False,
                "message": (
                    f"Referrer is registered as a {biz_profile.business_type}. "
                    "Business UAIDs (Wholesalers, Distributors, Retailers, Service Providers) "
                    "cannot be used as Customer referrals."
                )
            }

        # 6. Referral Cycle & Circular Relationship Prevention (Rule 5)
        # Trace upline from referrer_user: if referee_user_id is in referrer's upline -> cycle!
        curr_ancestor_id = referrer_user.id
        visited_ids = {referee_user_id}
        for _ in range(50):  # Maximum search depth
            ancestor_ref_stmt = select(Referral).where(Referral.referred_user_id == curr_ancestor_id)
            ancestor_ref = (await db.execute(ancestor_ref_stmt)).scalars().first()
            if not ancestor_ref:
                break
            if ancestor_ref.referrer_user_id in visited_ids:
                return {
                    "valid": False,
                    "message": "Circular referral cycle detected. This referral relationship would create an invalid loop."
                }
            visited_ids.add(ancestor_ref.referrer_user_id)
            curr_ancestor_id = ancestor_ref.referrer_user_id

        # 7. Check if Referrer UAID is currently blocked
        ref_nm_stmt = select(NetworkMember).where(NetworkMember.user_id == referrer_user.id)
        ref_member = (await db.execute(ref_nm_stmt)).scalars().first()
        if ref_member and ref_member.account_activity_status == "UAID_BLOCKED":
            return {
                "valid": False,
                "message": "The referring Customer UAID is currently blocked due to inactivity policy."
            }

        return {
            "valid": True,
            "referrer_user_id": referrer_user.id,
            "referrer_uaid": clean_code,
            "referrer_name": referrer_user.full_name or "Verified Customer",
            "message": f"Valid Customer referral code verified ({clean_code})."
        }

    @classmethod
    async def apply_customer_referral(
        cls,
        referee_user_id: str,
        referrer_code_or_uaid: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Applies and commits an immutable customer referral relationship.
        """
        val = await cls.validate_customer_referral(referrer_code_or_uaid, referee_user_id, db)
        if not val["valid"]:
            return val

        referrer_user_id = val["referrer_user_id"]
        referrer_uaid = val["referrer_uaid"]

        referee_uaid, _ = await uaid_service.get_or_create_customer_uaid(referee_user_id, db)

        # Create transactional Referral record
        referral = Referral(
            referrer_user_id=referrer_user_id,
            referrer_uaid=referrer_uaid,
            referred_user_id=referee_user_id,
            referred_uaid=referee_uaid,
            status="ACTIVE",
            created_at=datetime.now(timezone.utc)
        )
        db.add(referral)

        # Link sponsor to customer's NetworkMember
        member = await cls.get_or_create_customer_member(referee_user_id, db)
        member.sponsor_uaid = referrer_uaid

        await db.commit()
        await db.refresh(referral)

        # Re-evaluate reward eligibility immediately in case customer already has qualifying purchases
        await cls.evaluate_customer_eligibility_and_levels(referee_user_id, db)

        return {
            "valid": True,
            "referral_id": referral.id,
            "referrer_uaid": referrer_uaid,
            "referee_uaid": referee_uaid,
            "message": f"Referral successfully established with {referrer_uaid}."
        }

    @classmethod
    async def get_qualifying_purchase_total(
        cls,
        customer_user_id: str,
        db: AsyncSession
    ) -> float:
        """
        Aggregates backend-verified qualifying Product & Service purchases for the customer.
        - Excludes taxes (gst_total).
        - Excludes cancelled, refunded, or failed orders.
        - Excludes double-counted transactions.
        """
        stmt = select(Order).where(
            and_(
                Order.customer_id == customer_user_id,
                Order.order_status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
                or_(
                    Order.payment_status == PaymentStatus.SUCCESSFUL,
                    Order.order_status.in_([
                        OrderStatus.CONFIRMED,
                        OrderStatus.PAID_IN_ESCROW,
                        OrderStatus.PROCESSING,
                        OrderStatus.DISPATCHED,
                        OrderStatus.SHIPPED,
                        OrderStatus.DELIVERED,
                        OrderStatus.COMPLETED
                    ])
                )
            )
        )
        res = await db.execute(stmt)
        orders = res.scalars().all()

        total = 0.0
        for o in orders:
            # Eligible amount = subtotal minus merchant discount (excludes taxes and delivery charges)
            eligible = max(0.0, round(float(o.subtotal or 0.0) - float(o.merchant_discount or 0.0), 2))
            total += eligible

        return round(total, 2)

    @classmethod
    async def get_customer_reward_status(
        cls,
        customer_user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Returns authoritative reward eligibility, level, rank, cycle, and quarterly status.
        Section 5, 6, 7, 8, 9, 10, 11
        """
        member = await cls.get_or_create_customer_member(customer_user_id, db)
        qualifying_total = await cls.get_qualifying_purchase_total(customer_user_id, db)

        # Check Referral
        ref_stmt = select(Referral).where(Referral.referred_user_id == customer_user_id)
        referral = (await db.execute(ref_stmt)).scalars().first()
        has_referral = referral is not None and bool(referral.referrer_uaid)

        # Eligibility rule: Referral AND >= INR 2,000 qualifying purchase
        threshold_met = qualifying_total >= CUSTOMER_ENTRY_THRESHOLD
        is_eligible = has_referral and threshold_met

        # Check completed levels
        curr_cycle_stmt = select(NetworkCycle).where(
            and_(
                NetworkCycle.member_id == member.id,
                NetworkCycle.cycle_number == member.current_cycle_number
            )
        )
        curr_cycle = (await db.execute(curr_cycle_stmt)).scalars().first()

        lvl_stmt = select(NetworkLevelRecord).where(
            and_(
                NetworkLevelRecord.member_id == member.id,
                NetworkLevelRecord.cycle_id == (curr_cycle.id if curr_cycle else None)
            )
        )
        levels = (await db.execute(lvl_stmt)).scalars().all() if curr_cycle else []

        completed_levels_count = sum(
            1 for l in levels
            if l.status in [
                NetworkLevelStatus.QUALIFIED,
                NetworkLevelStatus.REWARD_APPROVED,
                NetworkLevelStatus.CYCLE_COMPLETED,
                NetworkLevelStatus.REWARD_PENDING
            ]
        )

        # Rank specifications & reward rate
        curr_lvl = member.current_level_number
        rank_spec = get_rank_spec_for_level(max(1, curr_lvl if curr_lvl > 0 else 1))
        curr_rank = member.current_rank_name or rank_spec["name"]

        # Reward wallet & Points Ledger (Sections 7 & 10)
        reward_stmt = select(RewardLedger).where(RewardLedger.user_id == customer_user_id)
        reward_records = (await db.execute(reward_stmt)).scalars().all()

        total_earned_pts = sum(r.reward_amount for r in reward_records if r.status in ["REWARDED", "APPROVED"] and r.reward_amount > 0 and r.reward_type != "POINTS_REFUND")
        pending_pts = sum(r.reward_amount for r in reward_records if r.status == "PENDING" and r.reward_amount > 0)
        reversed_pts = sum(abs(r.reward_amount) for r in reward_records if r.status == "REVERSED")
        redeemed_pts = sum(abs(r.reward_amount) for r in reward_records if r.reward_type == "POINTS_REDEMPTION" and r.status == "REDEEMED")
        refunded_pts = sum(r.reward_amount for r in reward_records if r.reward_type == "POINTS_REFUND" and r.status == "APPROVED")

        # Rank Redemption Gate calculation (Section 10):
        # A rank reward (Rank N) is redeemable only when next rank (Rank N+1) is completed.
        # Rank 12 is redeemable when Cycle 1 is completed (Level 120 completed).
        gated_pts = 0.0
        ungated_approved_pts = 0.0

        for r in reward_records:
            if r.status in ["REWARDED", "APPROVED"] and r.reward_type == "RANK_COMPLETION":
                rank_n = r.rank_number
                next_req_level = min(120, (rank_n + 1) * 10)
                is_unlocked = False
                if rank_n < 12:
                    is_unlocked = (member.current_level_number >= next_req_level) or (member.current_cycle_number > r.cycle_number)
                else:
                    is_unlocked = (member.current_level_number >= 120) or (member.current_cycle_number > r.cycle_number)

                if is_unlocked:
                    ungated_approved_pts += r.reward_amount
                else:
                    gated_pts += r.reward_amount
            elif r.status in ["REWARDED", "APPROVED"] and r.reward_type == "POINTS_REFUND":
                ungated_approved_pts += r.reward_amount

        net_spent_pts = max(0.0, redeemed_pts - refunded_pts)
        redeemable_pts = max(0.0, round(ungated_approved_pts - reversed_pts - net_spent_pts, 2))

        return {
            "customer_uaid": member.uaid,
            "has_valid_referral": has_referral,
            "referrer_uaid": referral.referrer_uaid if referral else None,
            "qualifying_purchase_total": qualifying_total,
            "reward_entry_threshold": CUSTOMER_ENTRY_THRESHOLD,
            "threshold_satisfied": threshold_met,
            "is_reward_eligible": is_eligible,
            "current_level": member.current_level_number,
            "completed_levels": completed_levels_count,
            "current_rank": curr_rank,
            "current_cycle": member.current_cycle_number,
            "current_reward_rate": rank_spec["default_rate"],
            "wallet": {
                "currency": "POINTS",
                "point_inr_value": 1.0,
                "total_earned": round(total_earned_pts, 2),
                "total_earned_points": round(total_earned_pts, 2),
                "pending": round(pending_pts, 2),
                "pending_points": round(pending_pts, 2),
                "gated_points": round(gated_pts, 2),
                "redeemable_points": round(redeemable_pts, 2),
                "redeemed_points": round(net_spent_pts, 2),
                "reversed_points": round(reversed_pts, 2),
                "is_withdrawable": False,
                "withdrawal_policy": "NON_WITHDRAWABLE_POINTS_STORE_CREDIT_ONLY"
            },
            "quarterly_activity_status": member.account_activity_status,
            "missed_quarters_count": member.missed_quarter_count,
            "next_level_cost": CUSTOMER_UNIT_PER_LEVEL
        }

    @classmethod
    async def evaluate_customer_eligibility_and_levels(
        cls,
        customer_user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Authoritative calculation engine for:
        1. Customer reward eligibility at INR 2,000 + valid referral.
        2. INR 2,000-per-level qualification and allocation.
        3. Double-counting prevention: unique allocations via LevelQualificationAllocation.
        4. 10 completed levels = 1 Rank completion reward.
        5. 120 completed levels = Cycle 1 completed, Cycle 2 begins.
        """
        member = await cls.get_or_create_customer_member(customer_user_id, db)
        qualifying_total = await cls.get_qualifying_purchase_total(customer_user_id, db)

        # 1. Check referral
        ref_stmt = select(Referral).where(Referral.referred_user_id == customer_user_id)
        referral = (await db.execute(ref_stmt)).scalars().first()
        has_referral = referral is not None and bool(referral.referrer_uaid)

        # 2. Check threshold
        if qualifying_total < CUSTOMER_ENTRY_THRESHOLD or not has_referral:
            member.is_reward_eligible = False
            await db.commit()
            return {
                "is_reward_eligible": False,
                "qualifying_total": qualifying_total,
                "has_referral": has_referral,
                "current_level": member.current_level_number,
                "message": "Not eligible: Requires valid referral and at least INR 2,000 qualifying purchase."
            }

        # Customer is Reward Eligible!
        member.is_reward_eligible = True

        # 3. Gather all completed orders as funding transactions (FIFO)
        ord_stmt = select(Order).where(
            and_(
                Order.customer_id == customer_user_id,
                Order.order_status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
                or_(
                    Order.payment_status == PaymentStatus.SUCCESSFUL,
                    Order.order_status.in_([
                        OrderStatus.CONFIRMED,
                        OrderStatus.PAID_IN_ESCROW,
                        OrderStatus.PROCESSING,
                        OrderStatus.DISPATCHED,
                        OrderStatus.SHIPPED,
                        OrderStatus.DELIVERED,
                        OrderStatus.COMPLETED
                    ])
                )
            )
        ).order_by(Order.created_at.asc(), Order.id.asc())
        orders = (await db.execute(ord_stmt)).scalars().all()

        class TxSource:
            def __init__(self, tx_id: str, eligible_amt: float, remaining: float):
                self.tx_id = tx_id
                self.eligible_amt = eligible_amt
                self.remaining = remaining

        sources: List[TxSource] = []
        for o in orders:
            elig = max(0.0, round(float(o.subtotal or 0.0) - float(o.merchant_discount or 0.0), 2))
            # Check already allocated amount for this order
            alloc_stmt = select(func.coalesce(func.sum(LevelQualificationAllocation.amount_allocated_to_level), 0.0)).where(
                and_(
                    LevelQualificationAllocation.transaction_id == o.id,
                    LevelQualificationAllocation.allocation_status != "REVERSED"
                )
            )
            already_alloc = float((await db.execute(alloc_stmt)).scalar() or 0.0)
            rem = round(max(0.0, elig - already_alloc), 2)
            if rem > 0.01:
                sources.append(TxSource(o.id, elig, rem))

        total_available = round(sum(s.remaining for s in sources), 2)
        min_unit = CUSTOMER_UNIT_PER_LEVEL  # INR 2,000 per level

        newly_completed_levels: List[int] = []

        # 4. Qualification loop: Each INR 2,000 completes 1 Level
        while total_available >= min_unit:
            # Check cycle boundary: if level >= 120, complete cycle and advance
            if member.current_level_number >= 120:
                curr_c_num = member.current_cycle_number
                c_stmt = select(NetworkCycle).where(
                    and_(
                        NetworkCycle.member_id == member.id,
                        NetworkCycle.cycle_number == curr_c_num
                    )
                )
                curr_cycle_obj = (await db.execute(c_stmt)).scalars().first()
                if curr_cycle_obj:
                    curr_cycle_obj.status = CycleStatus.COMPLETED
                    curr_cycle_obj.completed_at = datetime.now(timezone.utc)
                    curr_cycle_obj.current_level = 120
                    curr_cycle_obj.carry_forward_out = total_available

                # Cycle completed event
                c_comp_log = LevelProgressionLedger(
                    user_id=customer_user_id,
                    member_id=member.id,
                    uaid=member.uaid,
                    cycle_number=curr_c_num,
                    business_type="CUSTOMER",
                    level_number=120,
                    previous_level=120,
                    new_level=120,
                    qualifying_transaction_id=sources[0].tx_id if sources else None,
                    qualifying_network_volume=qualifying_total,
                    minimum_required_amount=min_unit,
                    qualified_amount=round(min_unit * 120, 2),
                    remaining_unapplied_amount=total_available,
                    rule_id="RULE-CUSTOMER-CYCLE-COMPLETED-v1.0",
                    rule_version="v1.0",
                    event_type="CYCLE_COMPLETED",
                    status="VERIFIED",
                    event_timestamp=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(c_comp_log)

                # Initialize next cycle
                next_c_num = curr_c_num + 1
                member.current_cycle_number = next_c_num
                member.current_level_number = 0
                member.current_rank_name = "Bronze"

                new_cycle_obj = NetworkCycle(
                    member_id=member.id,
                    cycle_number=next_c_num,
                    status=CycleStatus.ACTIVE,
                    current_level=0,
                    carry_forward_in=total_available,
                    carry_forward_out=0.0,
                    total_qualifying_volume=0.0,
                    started_at=datetime.now(timezone.utc)
                )
                db.add(new_cycle_obj)
                await db.flush()

                # Seed 120 levels for new cycle
                new_lvls = [
                    NetworkLevelRecord(
                        member_id=member.id,
                        cycle_id=new_cycle_obj.id,
                        level_number=l_no,
                        rank_name=get_rank_for_level(l_no),
                        status=NetworkLevelStatus.LOCKED,
                        transaction_status="NONE",
                        verification_status="NONE",
                        qualification_status="NONE",
                        reward_status="NONE"
                    )
                    for l_no in range(1, 121)
                ]
                db.add_all(new_lvls)
                await db.flush()

            target_lvl = member.current_level_number + 1
            cycle_num = member.current_cycle_number

            # Consume required min_unit across funding transactions
            needed = min_unit
            for s in sources:
                if s.remaining <= 0.01:
                    continue
                alloc_amt = min(needed, s.remaining)
                s.remaining = round(s.remaining - alloc_amt, 2)
                needed = round(needed - alloc_amt, 2)

                alloc_status = "FULLY_ALLOCATED" if s.remaining <= 0.01 else "PARTIALLY_ALLOCATED"

                chk_alloc = select(LevelQualificationAllocation).where(
                    and_(
                        LevelQualificationAllocation.cycle_number == cycle_num,
                        LevelQualificationAllocation.level_number == target_lvl,
                        LevelQualificationAllocation.transaction_id == s.tx_id
                    )
                )
                if not (await db.execute(chk_alloc)).scalars().first():
                    alloc_entry = LevelQualificationAllocation(
                        user_id=customer_user_id,
                        member_id=member.id,
                        uaid=member.uaid,
                        cycle_number=cycle_num,
                        transaction_id=s.tx_id,
                        business_type="CUSTOMER",
                        transaction_eligible_amount=s.eligible_amt,
                        amount_allocated_to_level=alloc_amt,
                        amount_remaining=s.remaining,
                        level_number=target_lvl,
                        allocation_status=alloc_status,
                        rule_id="RULE-CUSTOMER-LEVEL-v1.0",
                        rule_version="v1.0",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(alloc_entry)

                if needed <= 0.01:
                    break

            total_available = round(sum(s.remaining for s in sources), 2)

            # Record LEVEL_COMPLETED in LevelProgressionLedger
            chk_lvl_stmt = select(LevelProgressionLedger).where(
                and_(
                    LevelProgressionLedger.user_id == customer_user_id,
                    LevelProgressionLedger.cycle_number == cycle_num,
                    LevelProgressionLedger.level_number == target_lvl,
                    LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                )
            )
            if not (await db.execute(chk_lvl_stmt)).scalars().first():
                lvl_entry = LevelProgressionLedger(
                    user_id=customer_user_id,
                    member_id=member.id,
                    uaid=member.uaid,
                    cycle_number=cycle_num,
                    business_type="CUSTOMER",
                    level_number=target_lvl,
                    previous_level=target_lvl - 1,
                    new_level=target_lvl,
                    qualifying_transaction_id=sources[0].tx_id if sources else None,
                    qualifying_network_volume=qualifying_total,
                    minimum_required_amount=min_unit,
                    qualified_amount=round(min_unit * target_lvl, 2),
                    remaining_unapplied_amount=total_available,
                    rule_id="RULE-CUSTOMER-LEVEL-v1.0",
                    rule_version="v1.0",
                    event_type="LEVEL_COMPLETED",
                    status="VERIFIED",
                    event_timestamp=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(lvl_entry)
                newly_completed_levels.append(target_lvl)

            # Update NetworkLevelRecord
            c_obj_stmt = select(NetworkCycle).where(
                and_(
                    NetworkCycle.member_id == member.id,
                    NetworkCycle.cycle_number == cycle_num
                )
            )
            c_obj = (await db.execute(c_obj_stmt)).scalars().first()

            rec_stmt = select(NetworkLevelRecord).where(
                and_(
                    NetworkLevelRecord.member_id == member.id,
                    NetworkLevelRecord.level_number == target_lvl
                )
            )
            if c_obj:
                rec_stmt = rec_stmt.where(NetworkLevelRecord.cycle_id == c_obj.id)
            rec = (await db.execute(rec_stmt)).scalars().first()
            if rec:
                rec.status = NetworkLevelStatus.QUALIFIED
                rec.qualification_status = "QUALIFIED"
                rec.verification_status = "VERIFIED"
                rec.completed_at = datetime.now(timezone.utc)
                rec.transaction_reference = sources[0].tx_id if sources else None
                rec.updated_at = datetime.now(timezone.utc)

            member.current_level_number = target_lvl
            member.current_rank_name = get_rank_for_level(target_lvl)

            # Rank boundary: Every 10 levels completes 1 Rank
            if target_lvl % 10 == 0 and 10 <= target_lvl <= 120:
                rank_num = target_lvl // 10
                rank_spec = get_rank_spec_for_level(target_lvl)

                chk_rank_stmt = select(LevelProgressionLedger).where(
                    and_(
                        LevelProgressionLedger.user_id == customer_user_id,
                        LevelProgressionLedger.cycle_number == cycle_num,
                        LevelProgressionLedger.level_number == target_lvl,
                        LevelProgressionLedger.event_type == "RANK_COMPLETED"
                    )
                )
                if not (await db.execute(chk_rank_stmt)).scalars().first():
                    rank_entry = LevelProgressionLedger(
                        user_id=customer_user_id,
                        member_id=member.id,
                        uaid=member.uaid,
                        cycle_number=cycle_num,
                        business_type="CUSTOMER",
                        level_number=target_lvl,
                        previous_level=target_lvl - 1,
                        new_level=target_lvl,
                        qualifying_transaction_id=sources[0].tx_id if sources else None,
                        qualifying_network_volume=qualifying_total,
                        minimum_required_amount=min_unit,
                        qualified_amount=round(min_unit * target_lvl, 2),
                        remaining_unapplied_amount=total_available,
                        rule_id=f"RULE-CUSTOMER-RANK-{rank_spec['name']}-v1.0",
                        rule_version="v1.0",
                        event_type="RANK_COMPLETED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(rank_entry)

                # Process rank completion reward (unique one-time reward per rank per cycle)
                await NetworkProgressService.process_rank_completion_reward(
                    user_id=customer_user_id,
                    rank_number=rank_num,
                    cycle_number=cycle_num,
                    db=db,
                    transaction_id=sources[0].tx_id if sources else None
                )

        member.qualifying_volume_current_cycle = qualifying_total
        member.unused_carry_forward_amount = total_available
        await db.commit()

        return {
            "is_reward_eligible": True,
            "qualifying_total": qualifying_total,
            "current_level": member.current_level_number,
            "current_rank": member.current_rank_name,
            "current_cycle": member.current_cycle_number,
            "newly_completed_levels": newly_completed_levels,
            "remaining_unallocated_volume": total_available
        }

    @classmethod
    async def process_customer_purchase(
        cls,
        order_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Processes a paid/completed order for customer reward qualification,
        quarterly activity compliance, and referral upline volume.
        """
        order = await db.get(Order, order_id)
        if not order:
            return {"status": "ORDER_NOT_FOUND", "message": f"Order {order_id} not found."}

        # Exclude taxes from reward base
        gross_amt = float(order.total_customer_payable or 0.0)
        tax_amt = float(order.gst_total or 0.0)
        elig_amt = max(0.0, round(float(order.subtotal or 0.0) - float(order.merchant_discount or 0.0), 2))

        # 1. Record Quarterly Account Activity for customer
        await quarterly_service.record_qualifying_purchase(
            user_id=order.customer_id,
            order_id=order.id,
            purchase_date=order.created_at,
            db=db
        )

        # 2. Evaluate Customer Reward Eligibility & Levels
        eval_res = await cls.evaluate_customer_eligibility_and_levels(order.customer_id, db)

        # 3. Process referral volume for customer's sponsor/referrer (excluding self-purchase)
        ref_tx_res = await NetworkProgressService.process_referral_repeat_purchase(
            buyer_user_id=order.customer_id,
            order_id=order.id,
            gross_amount=gross_amt,
            tax_amount=tax_amt,
            db=db,
            purchase_date=order.created_at
        )

        return {
            "status": "PROCESSED",
            "order_id": order.id,
            "eligible_amount": elig_amt,
            "customer_evaluation": eval_res,
            "referral_processing": ref_tx_res
        }

    @classmethod
    async def reconcile_refund_or_cancellation(
        cls,
        order_id: str,
        refund_amount: float,
        reason: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Enforces immutable reversal entries if an order is refunded or cancelled.
        Preserves complete history, never deletes records.
        """
        order = await db.get(Order, order_id)
        if not order:
            return {"status": "NOT_FOUND"}

        # Find allocations tied to this order
        alloc_stmt = select(LevelQualificationAllocation).where(
            and_(
                LevelQualificationAllocation.transaction_id == order_id,
                LevelQualificationAllocation.allocation_status != "REVERSED"
            )
        )
        allocs = (await db.execute(alloc_stmt)).scalars().all()

        reversals = []
        for alloc in allocs:
            alloc.allocation_status = "REVERSED"
            rev_log = LevelProgressionLedger(
                user_id=order.customer_id,
                member_id=alloc.member_id,
                uaid=alloc.uaid,
                cycle_number=alloc.cycle_number,
                business_type="CUSTOMER",
                level_number=alloc.level_number,
                previous_level=alloc.level_number,
                new_level=max(0, alloc.level_number - 1),
                qualifying_transaction_id=order_id,
                qualifying_network_volume=0.0,
                minimum_required_amount=CUSTOMER_UNIT_PER_LEVEL,
                qualified_amount=0.0,
                remaining_unapplied_amount=0.0,
                rule_id="RULE-CUSTOMER-REFUND-REVERSAL",
                rule_version="v1.0",
                event_type="LEVEL_REVERSED",
                status="REVERSED",
                event_timestamp=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            db.add(rev_log)
            reversals.append(alloc.level_number)

        # Update member current level
        member = await cls.get_or_create_customer_member(order.customer_id, db)
        if reversals:
            member.current_level_number = max(0, member.current_level_number - len(reversals))
            member.current_rank_name = get_rank_for_level(max(1, member.current_level_number))

        await db.commit()
        return {
            "status": "RECONCILED",
            "order_id": order_id,
            "refund_amount": refund_amount,
            "reversed_levels": reversals,
            "new_level": member.current_level_number
        }


customer_reward_service = CustomerRewardService()
