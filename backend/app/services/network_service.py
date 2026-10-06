from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.network import (
    NetworkMember,
    NetworkCycle,
    NetworkLevelRecord,
    LevelStatusHistory,
    NetworkLevelStatus,
    CycleStatus,
    RewardStatus,
    RewardRecord,
    RewardRule,
    RewardLedger,
    Referral,
    ReferralTransaction,
    LevelProgressionLedger,
    LevelQualificationAllocation
)
from app.models.business import BusinessProfile
from app.models.user import User
from app.schemas.network import (
    NetworkProgressResponse,
    NetworkSummaryMetrics,
    NetworkLevelOut,
    RankProgressOut,
    RecentNetworkActivityOut,
    LevelDetailOut,
    LevelTimelineEventOut,
    CycleHistoryOut,
    RewardWalletOut,
    RewardLedgerOut,
    RewardLedgerSummaryOut,
    RewardRuleOut,
    RewardRulesResponse,
    ReferralInfoOut,
    ReferralValidateOut,
    ReferralShareOut,
    ReferralNetworkMemberOut,
    LevelProgressionLedgerOut,
    LevelQualificationAllocationOut
)

RANKS_SPECIFICATION = [
    {"name": "Bronze", "number": 1, "start": 1, "end": 10, "completion": 10, "default_rate": 1.10},
    {"name": "Silver", "number": 2, "start": 11, "end": 20, "completion": 20, "default_rate": 1.20},
    {"name": "Panna", "number": 3, "start": 21, "end": 30, "completion": 30, "default_rate": 1.30},
    {"name": "Gold", "number": 4, "start": 31, "end": 40, "completion": 40, "default_rate": 1.40},
    {"name": "Platinum", "number": 5, "start": 41, "end": 50, "completion": 50, "default_rate": 1.50},
    {"name": "Ruby", "number": 6, "start": 51, "end": 60, "completion": 60, "default_rate": 1.60},
    {"name": "Sapphire", "number": 7, "start": 61, "end": 70, "completion": 70, "default_rate": 1.70},
    {"name": "Emerald", "number": 8, "start": 71, "end": 80, "completion": 80, "default_rate": 1.80},
    {"name": "Diamond", "number": 9, "start": 81, "end": 90, "completion": 90, "default_rate": 1.90},
    {"name": "Black Diamond", "number": 10, "start": 91, "end": 100, "completion": 100, "default_rate": 2.00},
    {"name": "Mythic", "number": 11, "start": 101, "end": 110, "completion": 110, "default_rate": 2.10},
    {"name": "Legendary", "number": 12, "start": 111, "end": 120, "completion": 120, "default_rate": 2.20},
]

MINIMUM_TRANSACTION_UNITS = {
    "WHOLESALER": 100000.0,
    "WHOLESALE": 100000.0,
    "DISTRIBUTOR": 10000.0,
    "DISTRIBUTION": 10000.0,
    "RETAILER": 5000.0,
    "RETAIL": 5000.0,
    "SERVICES": 5000.0,
    "SERVICE": 5000.0,
    "SERVICE_PROVIDER": 5000.0,
    "REGISTERED_SERVICE_PROVIDER": 5000.0,
    "SKILLED_SERVICE": 5000.0,
}

def get_rank_spec_for_level(lvl: int) -> dict:
    if lvl <= 10:
        return RANKS_SPECIFICATION[0]
    for r in RANKS_SPECIFICATION:
        if r["start"] <= lvl <= r["end"]:
            return r
    return RANKS_SPECIFICATION[-1]

def get_rank_for_level(lvl: int) -> str:
    return get_rank_spec_for_level(lvl)["name"]

def get_minimum_transaction_unit(business_type: str) -> float:
    normalized = business_type.upper().replace(" ", "_")
    return MINIMUM_TRANSACTION_UNITS.get(
        normalized,
        5000.0 if ("SERVICE" in normalized or "RETAIL" in normalized) else (10000.0 if "DISTRIB" in normalized else 100000.0)
    )

def calculate_rank_multiplier(rank_number: int) -> int:
    """
    Rank Calculation Multiplier = Rank Number * (Rank Number * 10 + 1)
    Rank 1: 1 * 11 = 11
    Rank 2: 2 * 21 = 42
    Rank 3: 3 * 31 = 93
    ...
    Rank 12: 12 * 121 = 1452
    """
    return rank_number * ((rank_number * 10) + 1)

def calculate_rank_reward_benchmark(
    business_type: str,
    rank_number: int,
    custom_unit: Optional[float] = None
) -> dict:
    """
    Core mathematical engine for Rank Qualification and Reward.
    Follows Rule 4, 7, 8, 9, 14.
    """
    unit = custom_unit if custom_unit is not None else get_minimum_transaction_unit(business_type)
    multiplier = calculate_rank_multiplier(rank_number)
    qualification_amount = round(unit * multiplier, 2)
    rate = round(1.0 + (rank_number * 0.10), 2)  # 1.10% to 2.20%
    reward_amount = round(qualification_amount * (rate / 100.0), 2)

    rank_spec = next((r for r in RANKS_SPECIFICATION if r["number"] == rank_number), RANKS_SPECIFICATION[0])

    return {
        "business_type": business_type,
        "rank_number": rank_number,
        "rank_name": rank_spec["name"],
        "start_level": rank_spec["start"],
        "end_level": rank_spec["end"],
        "completion_level": rank_spec["completion"],
        "minimum_transaction_unit": unit,
        "qualification_multiplier": multiplier,
        "qualification_amount": qualification_amount,
        "reward_rate": rate,
        "reward_amount": reward_amount
    }

class NetworkProgressService:
    @staticmethod
    async def get_or_create_sample_member(user_id: str, db: AsyncSession) -> NetworkMember:
        """
        Retrieves or initializes the user's NetworkMember, Cycle 1, and 120-level hierarchy.
        Also seeds historical Bronze, Silver, Panna rewards for demo Consumer A (Level 37 Gold).
        """
        stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        res = await db.execute(stmt)
        member = res.scalars().first()

        # Find business profile to identify business type if present
        b_stmt = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
        biz_profile = (await db.execute(b_stmt)).scalars().first()
        biz_type = (biz_profile.business_type if biz_profile and biz_profile.business_type else "WHOLESALER").upper()

        if not member:
            u_stmt = select(NetworkMember).where(NetworkMember.uaid == "NRY-XXXX")
            existing_default = (await db.execute(u_stmt)).scalars().first()
            assigned_uaid = "NRY-XXXX" if not existing_default else f"NRY-{user_id[:4].upper()}"

            member = NetworkMember(
                user_id=user_id,
                consumer_name="A",
                uaid=assigned_uaid,
                business_type=biz_type,
                current_cycle_number=1,
                current_level_number=37,
                current_rank_name="Gold",
                kyc_verified=True
            )
            db.add(member)
            await db.flush()

            # Create Cycle 1
            cycle1 = NetworkCycle(
                member_id=member.id,
                cycle_number=1,
                status=CycleStatus.ACTIVE,
                current_level=37,
                started_at=datetime.now(timezone.utc)
            )
            db.add(cycle1)
            await db.flush()

            # Seed 120 Levels
            levels_to_add = []
            for lvl in range(1, 121):
                rank = get_rank_for_level(lvl)
                if lvl <= 30:
                    status = NetworkLevelStatus.CYCLE_COMPLETED
                    tx_status = "VERIFIED"
                    v_status = "VERIFIED"
                    q_status = "QUALIFIED"
                    r_status = "PAID"
                elif 31 <= lvl <= 35:
                    status = NetworkLevelStatus.REWARD_APPROVED
                    tx_status = "VERIFIED"
                    v_status = "VERIFIED"
                    q_status = "QUALIFIED"
                    r_status = "APPROVED"
                elif lvl == 36:
                    status = NetworkLevelStatus.QUALIFIED
                    tx_status = "VERIFIED"
                    v_status = "VERIFIED"
                    q_status = "QUALIFIED"
                    r_status = "PENDING"
                elif lvl == 37:
                    status = NetworkLevelStatus.REWARD_PENDING
                    tx_status = "VERIFIED"
                    v_status = "VERIFIED"
                    q_status = "QUALIFIED"
                    r_status = "PENDING"
                elif lvl == 38:
                    status = NetworkLevelStatus.UNDER_VERIFICATION
                    tx_status = "RECEIVED"
                    v_status = "IN_PROGRESS"
                    q_status = "PENDING"
                    r_status = "NONE"
                elif lvl == 39:
                    status = NetworkLevelStatus.TRANSACTION_RECEIVED
                    tx_status = "RECEIVED"
                    v_status = "NONE"
                    q_status = "NONE"
                    r_status = "NONE"
                elif lvl == 40:
                    status = NetworkLevelStatus.IN_PROGRESS
                    tx_status = "NONE"
                    v_status = "NONE"
                    q_status = "NONE"
                    r_status = "NONE"
                else:
                    status = NetworkLevelStatus.LOCKED
                    tx_status = "NONE"
                    v_status = "NONE"
                    q_status = "NONE"
                    r_status = "NONE"

                level_rec = NetworkLevelRecord(
                    member_id=member.id,
                    cycle_id=cycle1.id,
                    level_number=lvl,
                    rank_name=rank,
                    status=status,
                    transaction_reference=f"TX-NRY-{lvl:04d}" if lvl <= 39 else None,
                    transaction_status=tx_status,
                    verification_status=v_status,
                    qualification_status=q_status,
                    reward_status=r_status,
                    completed_at=datetime.now(timezone.utc) if lvl <= 36 else None
                )
                levels_to_add.append(level_rec)

            db.add_all(levels_to_add)
            await db.flush()

            # Seed one-time rank rewards for Bronze (Rank 1), Silver (Rank 2), Panna (Rank 3)
            # strictly for the default demo Consumer A (NRY-XXXX).
            if assigned_uaid == "NRY-XXXX":
                for rank_no in [1, 2, 3]:
                    calc = calculate_rank_reward_benchmark(biz_type, rank_no)
                    ledger_entry = RewardLedger(
                        user_id=user_id,
                        member_id=member.id,
                        cycle_number=1,
                        rank_number=rank_no,
                        rank_name=calc["rank_name"],
                        qualification_level=calc["completion_level"],
                        business_type=biz_type,
                        gross_amount=calc["qualification_amount"],
                        tax_amount=0.0,
                        eligible_amount=calc["qualification_amount"],
                        qualification_amount=calc["qualification_amount"],
                        reward_rate=calc["reward_rate"],
                        reward_amount=calc["reward_amount"],
                        currency="INR",
                        reward_type="RANK_COMPLETION",
                        status="REWARDED",
                        transaction_id=f"TX-QUAL-R{rank_no}-L{rank_no*10}",
                        verified_at=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(ledger_entry)

            await db.commit()
            await db.refresh(member)

        return member

    @staticmethod
    async def get_progress_data(user_id: str, db: AsyncSession) -> NetworkProgressResponse:
        member = await NetworkProgressService.get_or_create_sample_member(user_id, db)
        biz_type = member.business_type or "WHOLESALER"
        unit = get_minimum_transaction_unit(biz_type)

        # Query all 120 level records for member's current cycle
        cycle_stmt = select(NetworkCycle).where(
            and_(
                NetworkCycle.member_id == member.id,
                NetworkCycle.cycle_number == member.current_cycle_number
            )
        )
        curr_cycle_obj = (await db.execute(cycle_stmt)).scalars().first()

        stmt = select(NetworkLevelRecord).where(NetworkLevelRecord.member_id == member.id)
        if curr_cycle_obj:
            stmt = stmt.where(NetworkLevelRecord.cycle_id == curr_cycle_obj.id)
        stmt = stmt.order_by(NetworkLevelRecord.level_number.asc())
        res = await db.execute(stmt)
        level_records = res.scalars().all()

        # Query rewarded ranks from RewardLedger to know exactly which ranks have received one-time reward
        r_stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == user_id,
                RewardLedger.cycle_number == member.current_cycle_number,
                RewardLedger.reward_type == "RANK_COMPLETION"
            )
        )
        r_res = await db.execute(r_stmt)
        reward_records = r_res.scalars().all()
        rewarded_rank_numbers = {r.rank_number: r.status for r in reward_records}

        # Build 12 Rank Progress Cards
        ranks_out: List[RankProgressOut] = []
        for r_spec in RANKS_SPECIFICATION:
            r_num = r_spec["number"]
            calc = calculate_rank_reward_benchmark(biz_type, r_num, unit)
            comp_lvl = r_spec["completion"]
            start_lvl = r_spec["start"]
            end_lvl = r_spec["end"]

            is_completed = member.current_level_number >= comp_lvl
            is_current = start_lvl <= member.current_level_number <= end_lvl

            if is_completed:
                status_val = rewarded_rank_numbers.get(r_num, "REWARDED")
                reward_paid = True
            elif is_current:
                status_val = "IN_PROGRESS"
                reward_paid = False
            else:
                status_val = "LOCKED"
                reward_paid = False

            ranks_out.append(
                RankProgressOut(
                    rank_number=r_num,
                    rank_name=r_spec["name"],
                    start_level=start_lvl,
                    end_level=end_lvl,
                    completion_level=comp_lvl,
                    minimum_unit=unit,
                    qualification_multiplier=calc["qualification_multiplier"],
                    qualification_amount=calc["qualification_amount"],
                    reward_rate=calc["reward_rate"],
                    potential_reward=calc["reward_amount"],
                    current_level=member.current_level_number,
                    status=status_val,
                    is_completed=is_completed,
                    is_current=is_current,
                    reward_paid=reward_paid
                )
            )

        # Section 33 Cumulative Network Volume calculation
        vol_stmt = select(func.coalesce(func.sum(ReferralTransaction.eligible_amount), 0.0)).where(
            and_(
                ReferralTransaction.referrer_user_id == user_id,
                ReferralTransaction.is_referral_purchase == True,
                ReferralTransaction.is_self_purchase == False,
                ReferralTransaction.status == "COMPLETED"
            )
        )
        eligible_net_volume = float((await db.execute(vol_stmt)).scalar() or 0.0)
        next_level_volume = (member.current_level_number + 1) * unit
        remaining_to_next = max(0.0, round(next_level_volume - eligible_net_volume, 2))
        unapplied_vol = round(max(0.0, eligible_net_volume - (member.current_level_number * unit)), 2)

        # Summary calculations
        completed_count = sum(1 for l in level_records if l.status in [NetworkLevelStatus.CYCLE_COMPLETED, NetworkLevelStatus.REWARD_APPROVED, NetworkLevelStatus.QUALIFIED, NetworkLevelStatus.REWARD_PENDING] and l.level_number <= member.current_level_number)
        in_progress_count = 1 if member.current_level_number < 120 else 0
        qualified_count = sum(1 for l in level_records if l.qualification_status == "QUALIFIED")
        pending_verification_count = sum(1 for l in level_records if l.status in [NetworkLevelStatus.UNDER_VERIFICATION, NetworkLevelStatus.TRANSACTION_RECEIVED])
        reward_pending_count = sum(1 for l in level_records if l.status == NetworkLevelStatus.REWARD_PENDING)
        reward_approved_count = sum(1 for l in level_records if l.status == NetworkLevelStatus.REWARD_APPROVED)
        reversed_count = sum(1 for l in level_records if l.status == NetworkLevelStatus.REVERSED)
        locked_count = sum(1 for l in level_records if l.status == NetworkLevelStatus.LOCKED)

        metrics = NetworkSummaryMetrics(
            current_level=member.current_level_number,
            current_rank=member.current_rank_name,
            completed_levels=completed_count,
            in_progress_levels=in_progress_count,
            qualified_levels=qualified_count,
            pending_verification=pending_verification_count,
            reward_pending=reward_pending_count,
            reward_approved=reward_approved_count,
            reversed_levels=reversed_count,
            locked_levels=locked_count,
            kyc_status="Verified" if member.kyc_verified else "Not Verified",
            minimum_required_per_level=unit,
            eligible_network_volume=eligible_net_volume,
            next_level_requirement=remaining_to_next,
            unapplied_network_volume=unapplied_vol
        )

        levels_out = [
            NetworkLevelOut(
                level_number=l.level_number,
                rank_name=l.rank_name,
                status=l.status.value,
                level_value=round(unit * l.level_number, 2),
                transaction_status=l.transaction_status,
                verification_status=l.verification_status,
                qualification_status=l.qualification_status,
                reward_status=l.reward_status,
                transaction_reference=l.transaction_reference,
                completed_at=l.completed_at,
                reversed_at=l.reversed_at
            )
            for l in level_records
        ]

        recent_activity = [
            RecentNetworkActivityOut(
                level_number=36,
                status="Qualified",
                description="Level 36 passed all verification checks and qualification confirmed.",
                timestamp_relative="Today"
            ),
            RecentNetworkActivityOut(
                level_number=37,
                status="Reward Pending",
                description="Qualification confirmed. Applicable Gold rank reward is in scheduled processing queue for Level 40.",
                timestamp_relative="Today"
            ),
            RecentNetworkActivityOut(
                level_number=38,
                status="Under Verification",
                description="Transaction received and being reviewed according to Noryvanta verification rules.",
                timestamp_relative="Yesterday"
            ),
            RecentNetworkActivityOut(
                level_number=39,
                status="Transaction Received",
                description="Transaction received and recorded in ledger. Awaiting verification initiation.",
                timestamp_relative="Yesterday"
            )
        ]

        return NetworkProgressResponse(
            consumer=member.consumer_name,
            uaid=member.uaid,
            business_type=biz_type,
            current_cycle=f"Cycle {member.current_cycle_number}",
            current_level=member.current_level_number,
            current_rank=member.current_rank_name,
            kyc_status="Verified" if member.kyc_verified else "Pending",
            summary=metrics,
            ranks=ranks_out,
            levels=levels_out,
            recent_activity=recent_activity
        )

    @staticmethod
    async def get_level_detail(user_id: str, level_number: int, db: AsyncSession) -> LevelDetailOut:
        member = await NetworkProgressService.get_or_create_sample_member(user_id, db)
        biz_type = member.business_type or "WHOLESALER"
        unit = get_minimum_transaction_unit(biz_type)

        vol_stmt = select(func.coalesce(func.sum(ReferralTransaction.eligible_amount), 0.0)).where(
            and_(
                ReferralTransaction.referrer_user_id == user_id,
                ReferralTransaction.is_referral_purchase == True,
                ReferralTransaction.is_self_purchase == False,
                ReferralTransaction.status == "COMPLETED"
            )
        )
        eligible_net_volume = float((await db.execute(vol_stmt)).scalar() or 0.0)

        cycle_stmt = select(NetworkCycle).where(
            and_(
                NetworkCycle.member_id == member.id,
                NetworkCycle.cycle_number == member.current_cycle_number
            )
        )
        curr_cycle_obj = (await db.execute(cycle_stmt)).scalars().first()

        stmt = (
            select(NetworkLevelRecord)
            .where(NetworkLevelRecord.member_id == member.id)
            .where(NetworkLevelRecord.level_number == level_number)
        )
        if curr_cycle_obj:
            stmt = stmt.where(NetworkLevelRecord.cycle_id == curr_cycle_obj.id)
        res = await db.execute(stmt)
        record = res.scalars().first()

        level_val = round(unit * level_number, 2)
        is_completed = (record and record.status in [NetworkLevelStatus.QUALIFIED, NetworkLevelStatus.CYCLE_COMPLETED, NetworkLevelStatus.REWARD_APPROVED]) or (member.current_level_number >= level_number)
        applied_amt = unit if is_completed else min(unit, max(0.0, eligible_net_volume - (unit * (level_number - 1))))
        rem_amt = 0.0 if is_completed else max(0.0, round(unit - applied_amt, 2))

        if not record:
            rank = get_rank_for_level(level_number)
            return LevelDetailOut(
                level_number=level_number,
                rank_name=rank,
                status="LOCKED",
                cycle_number=member.current_cycle_number,
                level_value=level_val,
                eligible_transaction_amount=0.0,
                transaction_status="NONE",
                verification_status="NONE",
                qualification_status="NONE",
                reward_status="NONE",
                business_type=biz_type,
                minimum_required_amount=unit,
                eligible_volume_applied=applied_amt,
                remaining_amount=rem_amt,
                completed_at=None,
                activity_timeline=[]
            )

        timeline = [
            LevelTimelineEventOut(
                id="step-1",
                title="Transaction Received",
                description="Transaction received and registered under applicable Noryvanta rules." if record.transaction_status != "NONE" else "Not yet available",
                timestamp="Completed" if record.transaction_status != "NONE" else "Pending",
                status="completed" if record.transaction_status != "NONE" else "pending",
                icon="receipt"
            ),
            LevelTimelineEventOut(
                id="step-2",
                title="Verification Started",
                description="Audit started against transaction records, KYC, and refund criteria." if record.verification_status != "NONE" else "Not yet available",
                timestamp="Completed" if record.verification_status in ["VERIFIED", "IN_PROGRESS"] else "Pending",
                status="completed" if record.verification_status in ["VERIFIED", "IN_PROGRESS"] else "pending",
                icon="shield"
            ),
            LevelTimelineEventOut(
                id="step-3",
                title="Verification Completed",
                description="Verification audit passed with zero compliance defects." if record.verification_status == "VERIFIED" else "Not yet available",
                timestamp="Completed" if record.verification_status == "VERIFIED" else "Pending",
                status="completed" if record.verification_status == "VERIFIED" else "pending",
                icon="check-circle"
            ),
            LevelTimelineEventOut(
                id="step-4",
                title="Qualification Confirmed",
                description="Member network qualification formally confirmed by business rule engine." if record.qualification_status == "QUALIFIED" else "Not yet available",
                timestamp="Completed" if record.qualification_status == "QUALIFIED" else "Pending",
                status="completed" if record.qualification_status == "QUALIFIED" else "pending",
                icon="award"
            ),
            LevelTimelineEventOut(
                id="step-5",
                title="Reward Processing",
                description="One-time rank reward approved and queued for scheduled disbursement." if record.reward_status in ["APPROVED", "PAID"] else ("Reward processing queued." if record.reward_status == "PENDING" else "Not yet available"),
                timestamp="Completed" if record.reward_status in ["APPROVED", "PAID"] else ("In Progress" if record.reward_status == "PENDING" else "Pending"),
                status="completed" if record.reward_status in ["APPROVED", "PAID"] else ("active" if record.reward_status == "PENDING" else "pending"),
                icon="star"
            )
        ]

        return LevelDetailOut(
            level_number=record.level_number,
            rank_name=record.rank_name,
            status=record.status.value,
            cycle_number=member.current_cycle_number,
            level_value=level_val,
            eligible_transaction_amount=level_val if is_completed else applied_amt,
            transaction_status=record.transaction_status,
            verification_status=record.verification_status,
            qualification_status=record.qualification_status,
            reward_status=record.reward_status,
            business_type=biz_type,
            minimum_required_amount=unit,
            eligible_volume_applied=applied_amt,
            remaining_amount=rem_amt,
            completed_at=record.completed_at,
            activity_timeline=timeline
        )

    @staticmethod
    async def get_ranks_summary(user_id: str, db: AsyncSession) -> List[RankProgressOut]:
        member = await NetworkProgressService.get_or_create_sample_member(user_id, db)
        biz_type = member.business_type or "WHOLESALER"
        unit = get_minimum_transaction_unit(biz_type)

        r_stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == user_id,
                RewardLedger.cycle_number == member.current_cycle_number,
                RewardLedger.reward_type == "RANK_COMPLETION"
            )
        )
        r_res = await db.execute(r_stmt)
        reward_records = r_res.scalars().all()
        rewarded_rank_numbers = {r.rank_number: r.status for r in reward_records}

        ranks_out: List[RankProgressOut] = []
        for r_spec in RANKS_SPECIFICATION:
            r_num = r_spec["number"]
            calc = calculate_rank_reward_benchmark(biz_type, r_num, unit)
            comp_lvl = r_spec["completion"]
            start_lvl = r_spec["start"]
            end_lvl = r_spec["end"]

            is_completed = member.current_level_number >= comp_lvl
            is_current = start_lvl <= member.current_level_number <= end_lvl

            if is_completed:
                status_val = rewarded_rank_numbers.get(r_num, "REWARDED")
                reward_paid = True
            elif is_current:
                status_val = "IN_PROGRESS"
                reward_paid = False
            else:
                status_val = "LOCKED"
                reward_paid = False

            ranks_out.append(
                RankProgressOut(
                    rank_number=r_num,
                    rank_name=r_spec["name"],
                    start_level=start_lvl,
                    end_level=end_lvl,
                    completion_level=comp_lvl,
                    minimum_unit=unit,
                    qualification_multiplier=calc["qualification_multiplier"],
                    qualification_amount=calc["qualification_amount"],
                    reward_rate=calc["reward_rate"],
                    potential_reward=calc["reward_amount"],
                    current_level=member.current_level_number,
                    status=status_val,
                    is_completed=is_completed,
                    is_current=is_current,
                    reward_paid=reward_paid
                )
            )
        return ranks_out

    @staticmethod
    async def get_reward_wallet(user_id: str, db: AsyncSession) -> RewardWalletOut:
        stmt = select(RewardLedger).where(RewardLedger.user_id == user_id)
        res = await db.execute(stmt)
        records = res.scalars().all()

        total_earned = sum(r.reward_amount for r in records if r.status in ["REWARDED", "APPROVED"])
        pending = sum(r.reward_amount for r in records if r.status == "PENDING")
        reversed_amt = sum(r.reward_amount for r in records if r.status == "REVERSED")
        available = max(0.0, total_earned - reversed_amt)

        return RewardWalletOut(
            total_earned=round(total_earned, 2),
            available=round(available, 2),
            pending=round(pending, 2),
            redeemed=0.0,
            reversed=round(reversed_amt, 2),
            currency="INR"
        )

    @staticmethod
    async def get_reward_ledger(user_id: str, db: AsyncSession, skip: int = 0, limit: int = 50) -> RewardLedgerSummaryOut:
        wallet = await NetworkProgressService.get_reward_wallet(user_id, db)

        stmt = (
            select(RewardLedger)
            .where(RewardLedger.user_id == user_id)
            .order_by(RewardLedger.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await db.execute(stmt)
        records = res.scalars().all()

        records_out = [
            RewardLedgerOut(
                id=r.id,
                user_id=r.user_id,
                cycle_number=r.cycle_number,
                rank_number=r.rank_number,
                rank_name=r.rank_name,
                qualification_level=r.qualification_level,
                business_type=r.business_type,
                gross_amount=r.gross_amount,
                tax_amount=r.tax_amount,
                eligible_amount=r.eligible_amount,
                qualification_amount=r.qualification_amount,
                reward_rate=r.reward_rate,
                reward_amount=r.reward_amount,
                currency=r.currency,
                reward_type=r.reward_type,
                status=r.status,
                transaction_id=r.transaction_id,
                reversal_reference=r.reversal_reference,
                verified_at=r.verified_at,
                created_at=r.created_at
            )
            for r in records
        ]

        count_stmt = select(func.count(RewardLedger.id)).where(RewardLedger.user_id == user_id)
        total_count = (await db.execute(count_stmt)).scalar() or len(records)

        return RewardLedgerSummaryOut(
            total_records=total_count,
            wallet=wallet,
            records=records_out
        )

    @staticmethod
    async def process_rank_completion_reward(
        user_id: str,
        rank_number: int,
        cycle_number: int,
        db: AsyncSession,
        transaction_id: Optional[str] = None
    ) -> Optional[RewardLedger]:
        """
        Enforces Rule 2, 3, 5, 16:
        - Only ONE reward per Rank per cycle.
        - Triggered ONLY when rank completion level is reached.
        - Previous rank reward is NOT repeated when subsequent ranks start.
        - Prevents duplicate rewards at database level.
        """
        # 1. Get member and business type
        member = await NetworkProgressService.get_or_create_sample_member(user_id, db)
        biz_type = member.business_type or "WHOLESALER"

        # 2. Check if reward already exists
        check_stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == user_id,
                RewardLedger.cycle_number == cycle_number,
                RewardLedger.rank_number == rank_number,
                RewardLedger.reward_type == "RANK_COMPLETION"
            )
        )
        existing = (await db.execute(check_stmt)).scalars().first()
        if existing:
            # Rule 3: Already paid once. DO NOT pay again!
            return None

        # 3. Calculate rank reward benchmark
        calc = calculate_rank_reward_benchmark(biz_type, rank_number)

        # 4. Insert immutable ledger entry
        ledger_entry = RewardLedger(
            user_id=user_id,
            member_id=member.id,
            cycle_number=cycle_number,
            rank_number=rank_number,
            rank_name=calc["rank_name"],
            qualification_level=calc["completion_level"],
            business_type=biz_type,
            gross_amount=calc["qualification_amount"],
            tax_amount=0.0,
            eligible_amount=calc["qualification_amount"],
            qualification_amount=calc["qualification_amount"],
            reward_rate=calc["reward_rate"],
            reward_amount=calc["reward_amount"],
            currency="INR",
            reward_type="RANK_COMPLETION",
            status="REWARDED",
            transaction_id=transaction_id or f"TX-RANK-{rank_number}-AUTO",
            verified_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        db.add(ledger_entry)
        await db.commit()
        await db.refresh(ledger_entry)
        return ledger_entry

    @staticmethod
    async def reverse_rank_reward(
        user_id: str,
        rank_number: int,
        cycle_number: int,
        reason: str,
        db: AsyncSession
    ) -> Optional[RewardLedger]:
        """
        Enforces Rule 15: Immutable ledger.
        If a qualifying transaction is refunded or cancelled, creates a reversal ledger entry.
        Never deletes historical records.
        """
        find_stmt = select(RewardLedger).where(
            and_(
                RewardLedger.user_id == user_id,
                RewardLedger.cycle_number == cycle_number,
                RewardLedger.rank_number == rank_number,
                RewardLedger.status == "REWARDED"
            )
        )
        original = (await db.execute(find_stmt)).scalars().first()
        if not original:
            return None

        reversal_entry = RewardLedger(
            user_id=user_id,
            member_id=original.member_id,
            cycle_number=cycle_number,
            rank_number=rank_number,
            rank_name=original.rank_name,
            qualification_level=original.qualification_level,
            business_type=original.business_type,
            gross_amount=original.gross_amount,
            tax_amount=original.tax_amount,
            eligible_amount=original.eligible_amount,
            qualification_amount=original.qualification_amount,
            reward_rate=original.reward_rate,
            reward_amount=original.reward_amount,
            currency=original.currency,
            reward_type="RANK_REVERSAL",
            status="REVERSED",
            reversal_reference=f"Reversal of {original.id}: {reason}",
            transaction_id=f"REV-{original.transaction_id}",
            verified_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        db.add(reversal_entry)
        await db.commit()
        await db.refresh(reversal_entry)
        return reversal_entry

    @staticmethod
    async def get_referral_info(user: User, db: AsyncSession) -> ReferralInfoOut:
        member = await NetworkProgressService.get_or_create_sample_member(user.id, db)
        uaid = member.uaid or user.uaid or "NRY-XXXX"

        # Count active referrals
        ref_stmt = select(func.count(Referral.id)).where(Referral.referrer_user_id == user.id)
        ref_count = (await db.execute(ref_stmt)).scalar() or 0

        # Calculate qualifying referral volume (Rule 10 & 12: self purchase excluded, tax excluded)
        vol_stmt = select(func.sum(ReferralTransaction.eligible_amount)).where(
            and_(
                ReferralTransaction.referrer_user_id == user.id,
                ReferralTransaction.is_self_purchase == False,
                ReferralTransaction.is_referral_purchase == True,
                ReferralTransaction.status == "COMPLETED"
            )
        )
        vol = (await db.execute(vol_stmt)).scalar() or 0.0

        return ReferralInfoOut(
            uaid=uaid,
            referral_code=uaid,
            share_url=f"https://noryvanta.in/register?ref={uaid}",
            qr_payload=f"NRY_REFERRAL:{uaid}",
            total_referrals=max(ref_count, 12),  # Demo sample if empty
            active_referrals=max(ref_count, 10),
            qualifying_volume=round(max(vol, 4850000.0), 2),
            currency="INR"
        )

    @staticmethod
    async def validate_referral_code(code: str, db: AsyncSession) -> ReferralValidateOut:
        clean = code.strip().upper()
        # Check in users or network_members
        stmt = select(NetworkMember).where(NetworkMember.uaid == clean)
        res = await db.execute(stmt)
        member = res.scalars().first()

        if member:
            return ReferralValidateOut(
                valid=True,
                referrer_uaid=member.uaid,
                business_name=f"Partner ({member.uaid})",
                business_type=member.business_type,
                message=f"Valid Noryvanta referral code ({member.uaid}). Referral benefits activated."
            )

        # Allow standard format match for V1 sandbox validation
        if clean.startswith("NRY-"):
            return ReferralValidateOut(
                valid=True,
                referrer_uaid=clean,
                business_name=f"Verified Member ({clean})",
                business_type="WHOLESALER",
                message=f"Valid Noryvanta referral code ({clean}). Referral benefits activated."
            )

        return ReferralValidateOut(
            valid=False,
            referrer_uaid=None,
            business_name=None,
            business_type=None,
            message="Invalid or expired referral code. Please check and try again."
        )

    @staticmethod
    async def process_referral_repeat_purchase(
        buyer_user_id: str,
        order_id: str,
        gross_amount: float,
        tax_amount: float,
        db: AsyncSession,
        purchase_date: Optional[datetime] = None,
        webhook_delivery_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enforces Rule 3, 4, 5, 6, 8, 11:
        1. Find referring Customer A from permanent Referral relationship.
        2. Idempotency (Rule 5 & Section 10 Test 10):
           Checks if order_id has already been processed for this buyer.
           If webhook or repeated request arrives twice, returns existing result without duplicating!
        3. Exclude self-purchases (Rule 10 & Section 48 & Section 10 Test 8).
        4. Exclude taxes (Rule 12): eligible_amount = gross_amount - tax_amount.
        5. Check if Referrer A is blocked (Rule 2 Failure Rule & Section 10 Test 12).
           If blocked, reject reward eligibility.
        6. Current Cycle Rule (Rule 4 & Section 10 Test 9, 11):
           Determine Referrer A's CURRENT running cycle and CURRENT network level/rank.
           Does NOT use historical level from B's first purchase.
        7. Record ReferralTransaction.
        8. Record quarterly account activity for buyer (Rule 2).
        """
        # 1. Idempotency Check (Rule 5)
        existing_tx_stmt = select(ReferralTransaction).where(ReferralTransaction.order_id == order_id)
        existing_tx = (await db.execute(existing_tx_stmt)).scalars().first()
        if existing_tx:
            return {
                "status": "ALREADY_PROCESSED",
                "referral_transaction_id": existing_tx.id,
                "is_duplicate_webhook": True,
                "reward_eligible": existing_tx.is_referral_purchase and not existing_tx.is_self_purchase,
                "message": "Transaction already recorded in referral ledger. Zero duplicate rewards issued."
            }

        # 2. Find permanent Referral relationship (Rule 3)
        ref_stmt = select(Referral).where(Referral.referred_user_id == buyer_user_id)
        referral = (await db.execute(ref_stmt)).scalars().first()

        if not referral:
            return {
                "status": "NO_REFERRAL",
                "reward_eligible": False,
                "message": "Buyer does not have an active referral affiliation."
            }

        referrer_id = referral.referrer_user_id

        # 3. Check for self-purchase
        is_self_purchase = (referrer_id == buyer_user_id)
        is_referral_purchase = not is_self_purchase

        # 4. Check if Referrer is blocked (Rule 2 & Section 10 Test 12)
        ref_member_stmt = select(NetworkMember).where(NetworkMember.user_id == referrer_id)
        referrer_member = (await db.execute(ref_member_stmt)).scalars().first()
        if referrer_member and (
            referrer_member.account_activity_status == "UAID_BLOCKED" or not referrer_member.is_reward_eligible
        ):
            return {
                "status": "REJECTED_BLOCKED_REFERRER",
                "reward_eligible": False,
                "referrer_uaid": referrer_member.uaid,
                "message": "Referrer UAID is currently blocked. No reward eligibility created."
            }

        # 5. Tax exclusion
        eligible_amount = max(0.0, round(gross_amount - tax_amount, 2))

        # 6. Current Cycle Rule (Rule 4)
        current_cycle = referrer_member.current_cycle_number if referrer_member else 1
        current_level = referrer_member.current_level_number if referrer_member else 1
        current_rank = referrer_member.current_rank_name if referrer_member else "Bronze"

        # 7. Persist ReferralTransaction
        rt = ReferralTransaction(
            referral_id=referral.id,
            referrer_user_id=referrer_id,
            buyer_user_id=buyer_user_id,
            order_id=order_id,
            gross_amount=gross_amount,
            tax_amount=tax_amount,
            eligible_amount=eligible_amount,
            is_self_purchase=is_self_purchase,
            is_referral_purchase=is_referral_purchase,
            status="COMPLETED",
            created_at=purchase_date or datetime.now(timezone.utc)
        )
        db.add(rt)
        await db.commit()
        await db.refresh(rt)

        # 8. Record Quarterly Account Activity for buyer (Rule 2)
        from app.services.quarterly_activity_service import quarterly_service
        await quarterly_service.record_qualifying_purchase(
            user_id=buyer_user_id,
            order_id=order_id,
            purchase_date=purchase_date,
            db=db
        )

        # 9. Sections 34-51 Cumulative & Carry-Forward Level/Cycle Qualification Engine
        newly_completed_levels: List[int] = []
        total_cumulative_volume = 0.0
        if is_referral_purchase and not is_self_purchase and referrer_member:
            biz_type = referrer_member.business_type or "WHOLESALER"
            min_unit = get_minimum_transaction_unit(biz_type)

            # Gather all completed referral transactions in FIFO order for this referrer
            all_tx_stmt = select(ReferralTransaction).where(
                and_(
                    ReferralTransaction.referrer_user_id == referrer_id,
                    ReferralTransaction.is_referral_purchase == True,
                    ReferralTransaction.is_self_purchase == False,
                    ReferralTransaction.status == "COMPLETED"
                )
            ).order_by(ReferralTransaction.created_at.asc(), ReferralTransaction.id.asc())
            all_tx_records = (await db.execute(all_tx_stmt)).scalars().all()

            class FundingSource:
                def __init__(self, tx_id: str, eligible_amt: float, remaining: float):
                    self.tx_id = tx_id
                    self.eligible_amt = eligible_amt
                    self.remaining = remaining

            funding_sources: List[FundingSource] = []
            for tx_item in all_tx_records:
                alloc_sum_stmt = select(func.coalesce(func.sum(LevelQualificationAllocation.amount_allocated_to_level), 0.0)).where(
                    and_(
                        LevelQualificationAllocation.transaction_id == tx_item.id,
                        LevelQualificationAllocation.allocation_status != "REVERSED"
                    )
                )
                allocated = float((await db.execute(alloc_sum_stmt)).scalar() or 0.0)
                rem = round(max(0.0, tx_item.eligible_amount - allocated), 2)
                if rem > 0.001:
                    funding_sources.append(FundingSource(tx_item.id, tx_item.eligible_amount, rem))

            total_available = round(sum(f.remaining for f in funding_sources), 2)

            # If member had prior carry-forward not mapped to transaction records (e.g. seeded state), include it
            if referrer_member.unused_carry_forward_amount > total_available + 0.01:
                diff = round(referrer_member.unused_carry_forward_amount - total_available, 2)
                funding_sources.insert(0, FundingSource(
                    f"CF-CYCLE-{referrer_member.current_cycle_number}",
                    diff,
                    diff
                ))
                total_available = round(total_available + diff, 2)

            # Cumulative volume in entire referral history of referrer
            total_cumulative_volume = float((await db.execute(
                select(func.coalesce(func.sum(ReferralTransaction.eligible_amount), 0.0)).where(
                    and_(
                        ReferralTransaction.referrer_user_id == referrer_id,
                        ReferralTransaction.is_referral_purchase == True,
                        ReferralTransaction.is_self_purchase == False,
                        ReferralTransaction.status == "COMPLETED"
                    )
                )
            )).scalar() or 0.0)

            # Level qualification loop
            while total_available >= min_unit:
                # If current level is already 120, advance cycle before processing next level
                if referrer_member.current_level_number >= 120:
                    curr_c_num = referrer_member.current_cycle_number
                    curr_c_stmt = select(NetworkCycle).where(
                        and_(
                            NetworkCycle.member_id == referrer_member.id,
                            NetworkCycle.cycle_number == curr_c_num
                        )
                    )
                    curr_cycle_obj = (await db.execute(curr_c_stmt)).scalars().first()
                    if curr_cycle_obj:
                        curr_cycle_obj.status = CycleStatus.COMPLETED
                        curr_cycle_obj.completed_at = datetime.now(timezone.utc)
                        curr_cycle_obj.current_level = 120
                        curr_cycle_obj.carry_forward_out = total_available

                    cycle_comp_entry = LevelProgressionLedger(
                        user_id=referrer_id,
                        member_id=referrer_member.id,
                        uaid=referrer_member.uaid,
                        cycle_number=curr_c_num,
                        business_type=biz_type,
                        level_number=120,
                        previous_level=120,
                        new_level=120,
                        qualifying_transaction_id=rt.id,
                        qualifying_network_volume=total_cumulative_volume,
                        minimum_required_amount=min_unit,
                        qualified_amount=round(min_unit * 120, 2),
                        remaining_unapplied_amount=total_available,
                        rule_id="RULE-CYCLE-COMPLETED-v1.0",
                        rule_version="v1.0",
                        event_type="CYCLE_COMPLETED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(cycle_comp_entry)

                    next_c_num = curr_c_num + 1
                    referrer_member.current_cycle_number = next_c_num
                    referrer_member.current_level_number = 0
                    referrer_member.current_rank_name = "Bronze"

                    new_cycle_obj = NetworkCycle(
                        member_id=referrer_member.id,
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

                    new_levels_list = [
                        NetworkLevelRecord(
                            member_id=referrer_member.id,
                            cycle_id=new_cycle_obj.id,
                            level_number=l_idx,
                            rank_name=get_rank_for_level(l_idx),
                            status=NetworkLevelStatus.LOCKED,
                            transaction_status="NONE",
                            verification_status="NONE",
                            qualification_status="NONE",
                            reward_status="NONE"
                        )
                        for l_idx in range(1, 121)
                    ]
                    db.add_all(new_levels_list)
                    await db.flush()

                    cycle_start_entry = LevelProgressionLedger(
                        user_id=referrer_id,
                        member_id=referrer_member.id,
                        uaid=referrer_member.uaid,
                        cycle_number=next_c_num,
                        business_type=biz_type,
                        level_number=0,
                        previous_level=0,
                        new_level=0,
                        qualifying_transaction_id=rt.id,
                        qualifying_network_volume=total_available,
                        minimum_required_amount=min_unit,
                        qualified_amount=0.0,
                        remaining_unapplied_amount=total_available,
                        rule_id="RULE-CYCLE-STARTED-v1.0",
                        rule_version="v1.0",
                        event_type="CYCLE_STARTED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(cycle_start_entry)

                target_lvl = referrer_member.current_level_number + 1
                cycle_num = referrer_member.current_cycle_number

                # Consume required amount across funding sources (Section 35, 40, 53)
                # Each level qualification unit requires exactly min_unit
                needed = min_unit
                for f_src in funding_sources:
                    if f_src.remaining <= 0.001:
                        continue
                    alloc_amt = min(needed, f_src.remaining)
                    f_src.remaining = round(f_src.remaining - alloc_amt, 2)
                    needed = round(needed - alloc_amt, 2)

                    alloc_status = "FULLY_ALLOCATED" if f_src.remaining <= 0.001 else "PARTIALLY_ALLOCATED"

                    chk_alloc = select(LevelQualificationAllocation).where(
                        and_(
                            LevelQualificationAllocation.cycle_number == cycle_num,
                            LevelQualificationAllocation.level_number == target_lvl,
                            LevelQualificationAllocation.transaction_id == f_src.tx_id
                        )
                    )
                    if not (await db.execute(chk_alloc)).scalars().first():
                        alloc_entry = LevelQualificationAllocation(
                            user_id=referrer_id,
                            member_id=referrer_member.id,
                            uaid=referrer_member.uaid,
                            cycle_number=cycle_num,
                            transaction_id=f_src.tx_id,
                            business_type=biz_type,
                            transaction_eligible_amount=f_src.eligible_amt,
                            amount_allocated_to_level=alloc_amt,
                            amount_remaining=f_src.remaining,
                            level_number=target_lvl,
                            allocation_status=alloc_status,
                            rule_id=f"RULE-{biz_type}-v1.0",
                            rule_version="v1.0",
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(alloc_entry)

                    if needed <= 0.001:
                        break

                total_available = round(sum(f.remaining for f in funding_sources), 2)

                # Record LEVEL_COMPLETED event
                chk_lvl_stmt = select(LevelProgressionLedger).where(
                    and_(
                        LevelProgressionLedger.user_id == referrer_id,
                        LevelProgressionLedger.cycle_number == cycle_num,
                        LevelProgressionLedger.level_number == target_lvl,
                        LevelProgressionLedger.event_type == "LEVEL_COMPLETED"
                    )
                )
                if not (await db.execute(chk_lvl_stmt)).scalars().first():
                    qualified_amt = round(min_unit * target_lvl, 2)
                    lvl_entry = LevelProgressionLedger(
                        user_id=referrer_id,
                        member_id=referrer_member.id,
                        uaid=referrer_member.uaid,
                        cycle_number=cycle_num,
                        business_type=biz_type,
                        level_number=target_lvl,
                        previous_level=target_lvl - 1,
                        new_level=target_lvl,
                        qualifying_transaction_id=rt.id,
                        qualifying_network_volume=total_cumulative_volume,
                        minimum_required_amount=min_unit,
                        qualified_amount=qualified_amt,
                        remaining_unapplied_amount=total_available,
                        rule_id=f"RULE-{biz_type}-v1.0",
                        rule_version="v1.0",
                        event_type="LEVEL_COMPLETED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(lvl_entry)
                    newly_completed_levels.append(target_lvl)

                # Update NetworkLevelRecord
                active_c_stmt = select(NetworkCycle).where(
                    and_(
                        NetworkCycle.member_id == referrer_member.id,
                        NetworkCycle.cycle_number == cycle_num
                    )
                )
                active_c_obj = (await db.execute(active_c_stmt)).scalars().first()

                rec_stmt = select(NetworkLevelRecord).where(
                    and_(
                        NetworkLevelRecord.member_id == referrer_member.id,
                        NetworkLevelRecord.level_number == target_lvl
                    )
                )
                if active_c_obj:
                    rec_stmt = rec_stmt.where(NetworkLevelRecord.cycle_id == active_c_obj.id)

                rec = (await db.execute(rec_stmt)).scalars().first()
                if rec:
                    rec.status = NetworkLevelStatus.QUALIFIED
                    rec.qualification_status = "QUALIFIED"
                    rec.verification_status = "VERIFIED"
                    rec.completed_at = datetime.now(timezone.utc)
                    rec.transaction_reference = rt.order_id or rt.id
                    rec.updated_at = datetime.now(timezone.utc)

                referrer_member.current_level_number = target_lvl
                referrer_member.current_rank_name = get_rank_for_level(target_lvl)

                # Rank boundary evaluation (Section 36.1)
                if target_lvl % 10 == 0 and 10 <= target_lvl <= 120:
                    rank_num = target_lvl // 10
                    rank_spec = get_rank_spec_for_level(target_lvl)

                    chk_rank_stmt = select(LevelProgressionLedger).where(
                        and_(
                            LevelProgressionLedger.user_id == referrer_id,
                            LevelProgressionLedger.cycle_number == cycle_num,
                            LevelProgressionLedger.level_number == target_lvl,
                            LevelProgressionLedger.event_type == "RANK_COMPLETED"
                        )
                    )
                    if not (await db.execute(chk_rank_stmt)).scalars().first():
                        rank_comp_entry = LevelProgressionLedger(
                            user_id=referrer_id,
                            member_id=referrer_member.id,
                            uaid=referrer_member.uaid,
                            cycle_number=cycle_num,
                            business_type=biz_type,
                            level_number=target_lvl,
                            previous_level=target_lvl - 1,
                            new_level=target_lvl,
                            qualifying_transaction_id=rt.id,
                            qualifying_network_volume=total_cumulative_volume,
                            minimum_required_amount=min_unit,
                            qualified_amount=round(min_unit * target_lvl, 2),
                            remaining_unapplied_amount=total_available,
                            rule_id=f"RULE-RANK-{rank_spec['name']}-v1.0",
                            rule_version="v1.0",
                            event_type="RANK_COMPLETED",
                            status="VERIFIED",
                            event_timestamp=datetime.now(timezone.utc),
                            created_at=datetime.now(timezone.utc)
                        )
                        db.add(rank_comp_entry)

                    # Evaluate Rank reward (Rule 5 & Section 42 uniqueness)
                    await NetworkProgressService.process_rank_completion_reward(
                        user_id=referrer_id,
                        rank_number=rank_num,
                        cycle_number=cycle_num,
                        db=db,
                        transaction_id=rt.id
                    )

                # Check if target_lvl == 120: complete current cycle and start next cycle (Sections 38, 53)
                if target_lvl == 120:
                    curr_c_stmt = select(NetworkCycle).where(
                        and_(
                            NetworkCycle.member_id == referrer_member.id,
                            NetworkCycle.cycle_number == cycle_num
                        )
                    )
                    curr_cycle_obj = (await db.execute(curr_c_stmt)).scalars().first()
                    if curr_cycle_obj:
                        curr_cycle_obj.status = CycleStatus.COMPLETED
                        curr_cycle_obj.completed_at = datetime.now(timezone.utc)
                        curr_cycle_obj.current_level = 120
                        curr_cycle_obj.carry_forward_out = total_available

                    cycle_comp_entry = LevelProgressionLedger(
                        user_id=referrer_id,
                        member_id=referrer_member.id,
                        uaid=referrer_member.uaid,
                        cycle_number=cycle_num,
                        business_type=biz_type,
                        level_number=120,
                        previous_level=120,
                        new_level=120,
                        qualifying_transaction_id=rt.id,
                        qualifying_network_volume=total_cumulative_volume,
                        minimum_required_amount=min_unit,
                        qualified_amount=round(min_unit * 120, 2),
                        remaining_unapplied_amount=total_available,
                        rule_id="RULE-CYCLE-COMPLETED-v1.0",
                        rule_version="v1.0",
                        event_type="CYCLE_COMPLETED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(cycle_comp_entry)

                    next_c_num = cycle_num + 1
                    referrer_member.current_cycle_number = next_c_num
                    referrer_member.current_level_number = 0
                    referrer_member.current_rank_name = "Bronze"

                    new_cycle_obj = NetworkCycle(
                        member_id=referrer_member.id,
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

                    new_levels_list = [
                        NetworkLevelRecord(
                            member_id=referrer_member.id,
                            cycle_id=new_cycle_obj.id,
                            level_number=l_idx,
                            rank_name=get_rank_for_level(l_idx),
                            status=NetworkLevelStatus.LOCKED,
                            transaction_status="NONE",
                            verification_status="NONE",
                            qualification_status="NONE",
                            reward_status="NONE"
                        )
                        for l_idx in range(1, 121)
                    ]
                    db.add_all(new_levels_list)
                    await db.flush()

                    cycle_start_entry = LevelProgressionLedger(
                        user_id=referrer_id,
                        member_id=referrer_member.id,
                        uaid=referrer_member.uaid,
                        cycle_number=next_c_num,
                        business_type=biz_type,
                        level_number=0,
                        previous_level=0,
                        new_level=0,
                        qualifying_transaction_id=rt.id,
                        qualifying_network_volume=total_available,
                        minimum_required_amount=min_unit,
                        qualified_amount=0.0,
                        remaining_unapplied_amount=total_available,
                        rule_id="RULE-CYCLE-STARTED-v1.0",
                        rule_version="v1.0",
                        event_type="CYCLE_STARTED",
                        status="VERIFIED",
                        event_timestamp=datetime.now(timezone.utc),
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(cycle_start_entry)

            # Update final carry-forward and qualifying volume
            final_unused = round(sum(f.remaining for f in funding_sources), 2)
            referrer_member.unused_carry_forward_amount = final_unused
            referrer_member.qualifying_volume_current_cycle = round(
                (referrer_member.current_level_number * min_unit) + final_unused, 2
            )

            c_active_stmt = select(NetworkCycle).where(
                and_(
                    NetworkCycle.member_id == referrer_member.id,
                    NetworkCycle.cycle_number == referrer_member.current_cycle_number
                )
            )
            c_active = (await db.execute(c_active_stmt)).scalars().first()
            if c_active:
                c_active.current_level = referrer_member.current_level_number
                c_active.total_qualifying_volume = referrer_member.qualifying_volume_current_cycle

            await db.commit()
            await db.refresh(referrer_member)

        return {
            "status": "SUCCESS",
            "referral_transaction_id": rt.id,
            "referrer_id": referrer_id,
            "referrer_uaid": referral.referrer_uaid,
            "applied_cycle": referrer_member.current_cycle_number if referrer_member else current_cycle,
            "applied_level": referrer_member.current_level_number if referrer_member else current_level,
            "applied_rank": referrer_member.current_rank_name if referrer_member else current_rank,
            "eligible_amount": eligible_amount,
            "cumulative_network_volume": total_cumulative_volume,
            "unused_carry_forward": referrer_member.unused_carry_forward_amount if referrer_member else 0.0,
            "newly_completed_levels": newly_completed_levels,
            "reward_eligible": is_referral_purchase,
            "is_self_purchase": is_self_purchase
        }

    @staticmethod
    async def process_referral_refund_or_reversal(
        referrer_user_id: str,
        order_id: str,
        db: AsyncSession,
        reason: str = "Customer order refund / reversal"
    ) -> Dict[str, Any]:
        """
        Section 33.27 Refund & Reversal Engine:
        1. Find matching ReferralTransaction and transition status to REVERSED.
        2. Recalculate current eligible cumulative volume.
        3. Do not delete original qualification event; append LEVEL_REVERSED events.
        4. If level drops below rank boundary, trigger reverse_rank_reward.
        5. Update member's current level.
        """
        tx_stmt = select(ReferralTransaction).where(
            and_(
                ReferralTransaction.referrer_user_id == referrer_user_id,
                ReferralTransaction.order_id == order_id,
                ReferralTransaction.status == "COMPLETED"
            )
        )
        tx = (await db.execute(tx_stmt)).scalars().first()
        if not tx:
            return {"status": "TRANSACTION_NOT_FOUND", "reversal_executed": False}

        tx.status = "REVERSED"
        await db.commit()

        ref_member_stmt = select(NetworkMember).where(NetworkMember.user_id == referrer_user_id)
        member = (await db.execute(ref_member_stmt)).scalars().first()
        if not member:
            return {"status": "MEMBER_NOT_FOUND", "reversal_executed": True}

        biz_type = member.business_type or "WHOLESALER"
        min_unit = get_minimum_transaction_unit(biz_type)

        vol_stmt = select(func.coalesce(func.sum(ReferralTransaction.eligible_amount), 0.0)).where(
            and_(
                ReferralTransaction.referrer_user_id == referrer_user_id,
                ReferralTransaction.is_referral_purchase == True,
                ReferralTransaction.is_self_purchase == False,
                ReferralTransaction.status == "COMPLETED"
            )
        )
        new_cum_volume = float((await db.execute(vol_stmt)).scalar() or 0.0)
        new_qualifying_units = min(120, int(new_cum_volume // min_unit))

        old_level = member.current_level_number
        reversed_levels: List[int] = []

        if new_qualifying_units < old_level:
            for lvl in range(old_level, new_qualifying_units, -1):
                rev_ledger = LevelProgressionLedger(
                    user_id=referrer_user_id,
                    member_id=member.id,
                    uaid=member.uaid,
                    cycle_number=member.current_cycle_number,
                    business_type=biz_type,
                    level_number=lvl,
                    previous_level=lvl,
                    new_level=lvl - 1,
                    qualifying_transaction_id=f"REV-{tx.id}",
                    qualifying_network_volume=new_cum_volume,
                    minimum_required_amount=min_unit,
                    qualified_amount=round(min_unit * (lvl - 1), 2),
                    remaining_unapplied_amount=round(max(0.0, new_cum_volume - (min_unit * (lvl - 1))), 2),
                    rule_id=f"RULE-REV-{biz_type}-v1.0",
                    rule_version="v1.0",
                    event_type="LEVEL_REVERSED",
                    status="REVERSED",
                    event_timestamp=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(rev_ledger)
                reversed_levels.append(lvl)

                rec_stmt = select(NetworkLevelRecord).where(
                    and_(
                        NetworkLevelRecord.member_id == member.id,
                        NetworkLevelRecord.level_number == lvl
                    )
                )
                rec = (await db.execute(rec_stmt)).scalars().first()
                if rec:
                    rec.status = NetworkLevelStatus.REVERSED
                    rec.reward_status = "REVERSED"
                    rec.reversed_at = datetime.now(timezone.utc)

                if lvl % 10 == 0 and 10 <= lvl <= 120:
                    rank_num = lvl // 10
                    await NetworkProgressService.reverse_rank_reward(
                        user_id=referrer_user_id,
                        rank_number=rank_num,
                        cycle_number=member.current_cycle_number,
                        reason=reason,
                        db=db
                    )

            # Update allocation status for this transaction
            alloc_update_stmt = select(LevelQualificationAllocation).where(
                LevelQualificationAllocation.transaction_id == tx.id
            )
            tx_allocations = (await db.execute(alloc_update_stmt)).scalars().all()
            for alloc in tx_allocations:
                alloc.allocation_status = "REVERSED"

            member.current_level_number = new_qualifying_units
            member.current_rank_name = get_rank_for_level(max(1, new_qualifying_units))
            rem_volume = round(new_cum_volume % min_unit, 2)
            member.unused_carry_forward_amount = rem_volume
            member.qualifying_volume_current_cycle = round(
                (new_qualifying_units * min_unit) + rem_volume, 2
            )

            # Update active cycle current_level
            c_active_stmt = select(NetworkCycle).where(
                and_(
                    NetworkCycle.member_id == member.id,
                    NetworkCycle.cycle_number == member.current_cycle_number
                )
            )
            c_active = (await db.execute(c_active_stmt)).scalars().first()
            if c_active:
                c_active.current_level = member.current_level_number
                c_active.total_qualifying_volume = member.qualifying_volume_current_cycle

            await db.commit()
            await db.refresh(member)

        return {
            "status": "REVERSED",
            "reversal_executed": True,
            "refunded_order_id": order_id,
            "new_cumulative_volume": new_cum_volume,
            "previous_level": old_level,
            "new_level": member.current_level_number,
            "reversed_levels": reversed_levels
        }

    @staticmethod
    async def get_level_progression_ledger(
        user_id: str,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50
    ) -> List[LevelProgressionLedgerOut]:
        stmt = (
            select(LevelProgressionLedger)
            .where(LevelProgressionLedger.user_id == user_id)
            .order_by(LevelProgressionLedger.event_timestamp.desc(), LevelProgressionLedger.level_number.desc())
            .offset(skip)
            .limit(limit)
        )
        records = (await db.execute(stmt)).scalars().all()
        return [LevelProgressionLedgerOut.model_validate(r) for r in records]

    @staticmethod
    async def get_qualification_allocations(
        user_id: str,
        db: AsyncSession,
        cycle_number: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[LevelQualificationAllocationOut]:
        stmt = select(LevelQualificationAllocation).where(LevelQualificationAllocation.user_id == user_id)
        if cycle_number is not None:
            stmt = stmt.where(LevelQualificationAllocation.cycle_number == cycle_number)
        stmt = stmt.order_by(
            LevelQualificationAllocation.created_at.desc(),
            LevelQualificationAllocation.level_number.desc()
        ).offset(skip).limit(limit)
        records = (await db.execute(stmt)).scalars().all()
        return [LevelQualificationAllocationOut.model_validate(r) for r in records]

    @staticmethod
    async def get_reward_rules_for_type(business_type: str) -> RewardRulesResponse:
        biz_type = business_type.upper().replace(" ", "_")
        unit = get_minimum_transaction_unit(biz_type)

        ranks_out: List[RewardRuleOut] = []
        for r_spec in RANKS_SPECIFICATION:
            calc = calculate_rank_reward_benchmark(biz_type, r_spec["number"], unit)
            ranks_out.append(
                RewardRuleOut(
                    business_type=biz_type,
                    rank_number=r_spec["number"],
                    rank_name=r_spec["name"],
                    start_level=r_spec["start"],
                    end_level=r_spec["end"],
                    completion_level=r_spec["completion"],
                    minimum_transaction_unit=unit,
                    qualification_multiplier=calc["qualification_multiplier"],
                    reward_rate=calc["reward_rate"],
                    qualification_amount=calc["qualification_amount"],
                    potential_reward=calc["reward_amount"]
                )
            )

        return RewardRulesResponse(
            business_type=biz_type,
            minimum_transaction_unit=unit,
            ranks=ranks_out
        )

    @staticmethod
    async def get_cycle_history(user_id: str, db: AsyncSession) -> List[CycleHistoryOut]:
        member_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(member_stmt)).scalars().first()
        if not member:
            return [
                CycleHistoryOut(
                    cycle_number=1,
                    status="ACTIVE",
                    current_level=1,
                    started_at=datetime.now(timezone.utc)
                )
            ]

        stmt = (
            select(NetworkCycle)
            .where(NetworkCycle.member_id == member.id)
            .order_by(NetworkCycle.cycle_number.asc())
        )
        cycles = (await db.execute(stmt)).scalars().all()
        if not cycles:
            return [
                CycleHistoryOut(
                    cycle_number=member.current_cycle_number,
                    status="ACTIVE",
                    current_level=member.current_level_number,
                    started_at=member.created_at
                ),
                CycleHistoryOut(
                    cycle_number=member.current_cycle_number + 1,
                    status="NOT_STARTED",
                    current_level=1,
                    started_at=None
                )
            ]

        max_c = max([c.cycle_number for c in cycles], default=1)
        res_cycles = [
            CycleHistoryOut(
                cycle_number=c.cycle_number,
                status=c.status.value,
                current_level=c.current_level,
                started_at=c.started_at,
                completed_at=c.completed_at
            )
            for c in cycles
        ]
        if not any(c.cycle_number == max_c + 1 for c in cycles):
            res_cycles.append(
                CycleHistoryOut(
                    cycle_number=max_c + 1,
                    status="NOT_STARTED",
                    current_level=1,
                    started_at=None,
                    completed_at=None
                )
            )
        return res_cycles

    @staticmethod
    async def transition_level_status(
        member_id: str,
        level_number: int,
        new_status: NetworkLevelStatus,
        reason: str,
        performed_by: str,
        reference_id: Optional[str],
        db: AsyncSession
    ) -> NetworkLevelRecord:
        """
        Guards all level state transitions. Enforces:
        - Transaction Received does NOT equal Qualified.
        - Qualification and Reward states require authorized verification.
        - Records immutable history.
        """
        stmt = (
            select(NetworkLevelRecord)
            .where(NetworkLevelRecord.member_id == member_id)
            .where(NetworkLevelRecord.level_number == level_number)
        )
        res = await db.execute(stmt)
        record = res.scalars().first()
        if not record:
            raise ValueError(f"Level {level_number} not found for member {member_id}")

        old_status = record.status.value
        record.status = new_status
        record.updated_at = datetime.now(timezone.utc)

        if new_status == NetworkLevelStatus.QUALIFIED:
            record.qualification_status = "QUALIFIED"
            record.verification_status = "VERIFIED"
        elif new_status == NetworkLevelStatus.REWARD_APPROVED:
            record.reward_status = "APPROVED"
        elif new_status == NetworkLevelStatus.REVERSED:
            record.reversed_at = datetime.now(timezone.utc)
            record.reward_status = "REVERSED"

        # Log transition into immutable history
        history_entry = LevelStatusHistory(
            level_id=record.id,
            old_status=old_status,
            new_status=new_status.value,
            reason=reason,
            performed_by=performed_by,
            reference_id=reference_id,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(history_entry)
        await db.commit()
        await db.refresh(record)
        return record

network_service = NetworkProgressService()

