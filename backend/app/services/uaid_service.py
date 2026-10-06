import asyncio
import re
import secrets
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.business import BusinessProfile
from app.models.user import User
from app.models.network import NetworkMember, UAIDGenerationLog

_uaid_locks = defaultdict(asyncio.Lock)

class UAIDService:
    """
    Noryvanta Universal Account Identifier (UAID) Engine.
    
    Enforces Rule 1 (Single Permanent Identity Rule):
    - Exactly ONE unique UAID per approved account.
    - Idempotent generation: repeated requests return existing UAID.
    - Never generates a second UAID for the same underlying account.
    - Concurrency-safe, transactional generation.
    - Audited in uaid_generation_logs with request_id, timestamp, result.
    - Marks duplicate/cloned attempts as DUPLICATE / NOT REWARD ELIGIBLE.
    """

    TYPE_PREFIXES = {
        "wholesaler": "NRY-HS",
        "distributor": "NRY-DS",
        "retailer": "NRY-RT",
        "shop": "NRY-RT",
        "service provider": "NRY-SR",
        "service": "NRY-SR",
        "skilled service": "NRY-SR",
        "manufacturer": "NRY-MF",
        "freelancer": "NRY-FL"
    }

    @classmethod
    def sanitize_short_code(cls, name: str, max_length: int = 5) -> str:
        if not name:
            return "NRY"
        cleaned = re.sub(r"[^A-Za-z0-9]", "", name).upper()
        if len(cleaned) < 3:
            cleaned = (cleaned + "BIZ")[:3]
        return cleaned[:max_length]

    @classmethod
    async def get_existing_uaid_for_user(
        cls,
        user_id: str,
        db: AsyncSession
    ) -> Optional[str]:
        """
        Checks if the user already has an assigned UAID across User, BusinessProfile, or NetworkMember.
        """
        # 1. Check User table
        u_stmt = select(User).where(User.id == user_id)
        u_res = await db.execute(u_stmt)
        user = u_res.scalars().first()
        if user and user.uaid:
            return user.uaid

        # 2. Check NetworkMember table
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        nm_res = await db.execute(nm_stmt)
        member = nm_res.scalars().first()
        if member and member.uaid:
            return member.uaid

        # 3. Check BusinessProfile table
        bp_stmt = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
        bp_res = await db.execute(bp_stmt)
        profile = bp_res.scalars().first()
        if profile and profile.virtual_escrow_account_id:
            return profile.virtual_escrow_account_id

        return None

    @classmethod
    async def generate_uaid(
        cls,
        db: AsyncSession,
        business_type: str,
        business_name: str
    ) -> str:
        """
        Generates a unique random candidate UAID.
        """
        normalized_type = (business_type or "").strip().lower()
        prefix = cls.TYPE_PREFIXES.get(normalized_type, "NRY-CO")
        short_code = cls.sanitize_short_code(business_name)

        for attempt in range(20):
            random_number = secrets.randbelow(900000) + 100000
            candidate = f"{prefix}-{short_code}-{random_number}"

            # Verify uniqueness across all potential UAID storage locations
            stmt_bp = select(BusinessProfile).where(BusinessProfile.virtual_escrow_account_id == candidate)
            stmt_u = select(User).where(User.uaid == candidate)
            stmt_nm = select(NetworkMember).where(NetworkMember.uaid == candidate)

            bp_match = (await db.execute(stmt_bp)).scalars().first()
            u_match = (await db.execute(stmt_u)).scalars().first()
            nm_match = (await db.execute(stmt_nm)).scalars().first()

            if not bp_match and not u_match and not nm_match:
                return candidate

        return f"{prefix}-{short_code}-{secrets.token_hex(3).upper()}"

    @classmethod
    async def get_or_create_account_uaid(
        cls,
        user_id: str,
        business_type: str,
        business_name: str,
        db: AsyncSession,
        request_id: Optional[str] = None,
        registration_status: str = "COMPLETED",
        kyc_status: str = "PENDING"
    ) -> Tuple[str, bool]:
        """
        Idempotent UAID retrieval / generation enforcing Rule 1:
        - If UAID already exists for user_id: returns existing UAID and logs DUPLICATE attempt.
        - If new: generates new unique UAID, persists to user, and logs SUCCESS.
        Returns: (uaid: str, is_new: bool)
        """
        req_id = request_id or str(uuid.uuid4())

        async with _uaid_locks[user_id]:
            # 1. Idempotency Check: Does this account already possess a UAID?
            existing_uaid = await cls.get_existing_uaid_for_user(user_id, db)
            if existing_uaid:
                # Audit log duplicate request attempt
                log = UAIDGenerationLog(
                    user_id=user_id,
                    uaid=existing_uaid,
                    request_id=req_id,
                    registration_status=registration_status,
                    kyc_status=kyc_status,
                    result="DUPLICATE",
                    notes="Idempotent check: existing UAID retained. Zero secondary UAID created."
                )
                db.add(log)
                await db.commit()
                return existing_uaid, False

            # 2. Generate new unique UAID
            new_uaid = await cls.generate_uaid(db, business_type, business_name)

            # 3. Assign to User if User exists
            u_stmt = select(User).where(User.id == user_id)
            user = (await db.execute(u_stmt)).scalars().first()
            if user:
                user.uaid = new_uaid

            # 4. Assign to BusinessProfile if exists
            bp_stmt = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
            profile = (await db.execute(bp_stmt)).scalars().first()
            if profile:
                profile.virtual_escrow_account_id = new_uaid

            # 5. Assign to NetworkMember if exists
            nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
            member = (await db.execute(nm_stmt)).scalars().first()
            if member:
                member.uaid = new_uaid

            # 6. Audit Log SUCCESS
            log = UAIDGenerationLog(
                user_id=user_id,
                uaid=new_uaid,
                request_id=req_id,
                registration_status=registration_status,
                kyc_status=kyc_status,
                result="SUCCESS",
                notes="New unique UAID generated and permanently bound to account."
            )
            db.add(log)
            await db.commit()

            return new_uaid, True

    @classmethod
    async def flag_duplicate_account(
        cls,
        user_id: str,
        reason: str,
        db: AsyncSession,
        request_id: Optional[str] = None
    ) -> None:
        """
        Marks an account as DUPLICATE / NOT REWARD ELIGIBLE when clone/fraud attempt is detected.
        """
        nm_stmt = select(NetworkMember).where(NetworkMember.user_id == user_id)
        member = (await db.execute(nm_stmt)).scalars().first()
        if member:
            member.account_activity_status = "DUPLICATE / NOT REWARD ELIGIBLE"
            member.is_reward_eligible = False

        log = UAIDGenerationLog(
            user_id=user_id,
            uaid=member.uaid if member else None,
            request_id=request_id or str(uuid.uuid4()),
            registration_status="REJECTED",
            kyc_status="REJECTED",
            result="REJECTED",
            notes=f"Flagged: {reason}"
        )
        db.add(log)
        await db.commit()

uaid_service = UAIDService()
