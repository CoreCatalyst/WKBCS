from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.user import OTPRecord
from app.core.security import generate_secure_otp
from app.core.config import settings
from app.integrations.sms.sms_manager import sms_manager

class OTPService:
    @staticmethod
    async def create_otp(
        db: AsyncSession,
        identifier: str,
        ttl_minutes: Optional[int] = None,
        channel: str = "sms"
    ) -> str:
        ttl = ttl_minutes or settings.OTP_TTL_MINUTES

        # 1. Rate Limiting / Request Throttling Check (Cooldown on unverified OTP requests)
        if settings.OTP_RATE_LIMIT_SECONDS > 0:
            recent_stmt = select(OTPRecord).where(
                and_(OTPRecord.identifier == identifier, OTPRecord.is_used == False)
            ).order_by(OTPRecord.created_at.desc())
            recent_res = await db.execute(recent_stmt)
            latest_record = recent_res.scalars().first()

            if latest_record:
                created_at = latest_record.created_at
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
                if elapsed < settings.OTP_RATE_LIMIT_SECONDS:
                    remaining = int(settings.OTP_RATE_LIMIT_SECONDS - elapsed)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Please wait {remaining} seconds before requesting a new OTP."
                    )

        # 2. Invalidate any prior unused OTPs for this identifier
        stmt = select(OTPRecord).where(
            and_(OTPRecord.identifier == identifier, OTPRecord.is_used == False)
        )
        result = await db.execute(stmt)
        old_records = result.scalars().all()
        for rec in old_records:
            rec.is_used = True

        # 3. Generate 6-digit cryptographic OTP code
        otp_code = generate_secure_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl)

        new_record = OTPRecord(
            identifier=identifier,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False,
            attempts=0,
            max_attempts=settings.OTP_MAX_ATTEMPTS
        )
        db.add(new_record)
        await db.commit()

        # 4. Dispatch through SMS Gateway if mobile channel
        if channel == "sms" or ("@" not in identifier and any(c.isdigit() for c in identifier)):
            await sms_manager.dispatch_otp(
                phone_number=identifier,
                otp_code=otp_code,
                ttl_minutes=ttl
            )

        return otp_code

    @staticmethod
    async def verify_otp(db: AsyncSession, identifier: str, otp_code: str) -> bool:
        # Master development bypass — ONLY permitted when DEV_MODE_OTP=true and NOT in production
        if settings.is_dev_otp_allowed and otp_code == "123456":
            return True

        stmt = select(OTPRecord).where(
            and_(
                OTPRecord.identifier == identifier,
                OTPRecord.is_used == False
            )
        ).order_by(OTPRecord.created_at.desc())
        
        result = await db.execute(stmt)
        record = result.scalars().first()

        if not record:
            return False

        # Check attempt limits
        if record.attempts >= record.max_attempts:
            record.is_used = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum OTP verification attempts exceeded. Please request a new OTP."
            )

        # Check expiration
        now = datetime.now(timezone.utc)
        record_exp = record.expires_at
        if record_exp.tzinfo is None:
            record_exp = record_exp.replace(tzinfo=timezone.utc)
            
        if now > record_exp:
            record.is_used = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new OTP."
            )

        # Validate code match
        if record.otp_code != otp_code:
            record.attempts += 1
            await db.commit()
            remaining = record.max_attempts - record.attempts
            if remaining <= 0:
                record.is_used = True
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Maximum OTP verification attempts exceeded. Please request a new OTP."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid OTP code. {remaining} attempt(s) remaining."
            )

        # Mark as successfully used
        record.is_used = True
        await db.commit()
        return True
