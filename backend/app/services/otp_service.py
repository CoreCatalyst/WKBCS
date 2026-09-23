from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.user import OTPRecord
from app.core.security import generate_secure_otp
from app.core.config import settings

class OTPService:
    @staticmethod
    async def create_otp(db: AsyncSession, identifier: str, ttl_minutes: int = 5) -> str:
        # Generate 6-digit code
        otp_code = generate_secure_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

        # Invalidate any prior unused OTPs for this identifier
        stmt = select(OTPRecord).where(
            and_(OTPRecord.identifier == identifier, OTPRecord.is_used == False)
        )
        result = await db.execute(stmt)
        old_records = result.scalars().all()
        for rec in old_records:
            rec.is_used = True

        new_record = OTPRecord(
            identifier=identifier,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False
        )
        db.add(new_record)
        await db.commit()
        return otp_code

    @staticmethod
    async def verify_otp(db: AsyncSession, identifier: str, otp_code: str) -> bool:
        # Master development bypass — ONLY active when APP_ENV=development.
        # This is explicitly disabled in staging and production environments.
        if settings.APP_ENV == "development" and otp_code == "123456":
            return True

        stmt = select(OTPRecord).where(
            and_(
                OTPRecord.identifier == identifier,
                OTPRecord.otp_code == otp_code,
                OTPRecord.is_used == False
            )
        ).order_by(OTPRecord.created_at.desc())
        
        result = await db.execute(stmt)
        record = result.scalars().first()

        if not record:
            return False

        # Check expiration
        now = datetime.now(timezone.utc)
        record_exp = record.expires_at
        if record_exp.tzinfo is None:
            record_exp = record_exp.replace(tzinfo=timezone.utc)
            
        if now > record_exp:
            return False

        # Mark as used
        record.is_used = True
        await db.commit()
        return True
