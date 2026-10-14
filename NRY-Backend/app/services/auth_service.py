from typing import Optional, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.user import User, RoleEnum, UserSession
from app.models.business import BusinessProfile
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_token

PUBLIC_REGISTRATION_ROLES = {
    RoleEnum.BUYER,
    RoleEnum.CUSTOMER,
    RoleEnum.VENDOR,
}

class AuthService:
    @staticmethod
    async def get_or_create_user_by_identifier(
        db: AsyncSession,
        identifier: str,
        full_name: Optional[str] = None,
        role: str = "BUYER"
    ) -> User:
        """
        Retrieves existing user or registers a new user.
        CRITICAL SECURITY: Never trusts public client role parameter to grant ADMIN or SUPER_ADMIN.
        Existing users retain their established role.
        """
        is_email = "@" in identifier
        if is_email:
            stmt = select(User).where(User.email == identifier)
        else:
            stmt = select(User).where(User.phone == identifier)

        result = await db.execute(stmt)
        user = result.scalars().first()

        if user:
            # Existing user: Established role is strictly preserved.
            # Never overwrite or escalate roles for existing accounts based on client input.
            return user

        # New user registration: Strictly validate public role
        clean_role = (role or "BUYER").upper().strip()
        if clean_role in ("ADMIN", "SUPER_ADMIN", "SUPPORT", "STAFF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Privileged administrative roles cannot be assigned through public registration."
            )

        if clean_role not in ("BUYER", "CUSTOMER", "VENDOR", "BUSINESS_OWNER"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid registration role '{role}'. Permitted public roles: BUYER, CUSTOMER, VENDOR."
            )

        assigned_role = RoleEnum.VENDOR if clean_role in ("VENDOR", "BUSINESS_OWNER") else (
            RoleEnum.CUSTOMER if clean_role == "CUSTOMER" else RoleEnum.BUYER
        )

        user = User(
            email=identifier if is_email else None,
            phone=identifier if not is_email else None,
            full_name=full_name or ("Verified Partner" if assigned_role == RoleEnum.VENDOR else "Procurement Buyer"),
            role=assigned_role,
            is_active=True,
            is_verified=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def provision_admin_user(
        db: AsyncSession,
        identifier: str,
        full_name: str,
        role: str = "ADMIN"
    ) -> User:
        """
        Explicitly authorized server-side administrative provisioning.
        Used by existing platform administrators or automated provisioning pipelines.
        """
        is_email = "@" in identifier
        stmt = select(User).where(User.email == identifier if is_email else User.phone == identifier)
        res = await db.execute(stmt)
        existing = res.scalars().first()

        target_role = RoleEnum.SUPER_ADMIN if role.upper() == "SUPER_ADMIN" else RoleEnum.ADMIN

        if existing:
            existing.role = target_role
            existing.full_name = full_name or existing.full_name
            await db.commit()
            await db.refresh(existing)
            return existing

        new_admin = User(
            email=identifier if is_email else None,
            phone=identifier if not is_email else None,
            full_name=full_name,
            role=target_role,
            is_active=True,
            is_verified=True
        )
        db.add(new_admin)
        await db.commit()
        await db.refresh(new_admin)
        return new_admin

    @staticmethod
    async def generate_tokens(
        db: AsyncSession,
        user: User,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str, int, bool]:
        """
        Generates access and refresh tokens, recording a persistent UserSession
        with the SHA-256 hashed refresh token for revocation tracking.
        Binds the access token to the created UserSession.
        """
        refresh_token = create_refresh_token(subject=user.id)
        token_hash = hash_token(refresh_token)

        session_record = UserSession(
            user_id=user.id,
            refresh_token_hash=token_hash,
            device_info=device_info or "Web / API Client",
            ip_address=ip_address,
            is_revoked=False,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(session_record)
        await db.flush()  # Populate session_record.id

        access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            session_id=session_record.id
        )
        await db.commit()

        # Check if user has business profile
        stmt = select(BusinessProfile).where(BusinessProfile.user_id == user.id)
        res = await db.execute(stmt)
        has_biz = res.scalars().first() is not None

        return access_token, refresh_token, 3600 * 24, has_biz

    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        refresh_token: str,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str, int]:
        """
        Validates refresh token claim (type=='refresh') and verifies that the corresponding
        UserSession exists and has not been revoked. Uses row-level locking (with_for_update)
        to prevent race conditions on concurrent refresh requests. Rotates the session token hash.
        """
        decoded = decode_token(refresh_token)
        user_id = decoded.get("sub")
        token_type = decoded.get("type")

        # Explicit token type check
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token. Token type must be 'refresh'."
            )

        token_hash = hash_token(refresh_token)
        stmt = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.refresh_token_hash == token_hash
            )
        ).with_for_update()
        res = await db.execute(stmt)
        session = res.scalars().first()

        if not session or session.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh session has been revoked or is invalid."
            )

        now = datetime.now(timezone.utc)
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            session.is_revoked = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh session has expired."
            )

        user = await db.get(User, user_id)
        if not user or not user.is_active:
            session.is_revoked = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or disabled."
            )

        # Issue fresh access token bound to session and rotate refresh token
        new_access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            session_id=session.id
        )
        new_refresh_token = create_refresh_token(subject=user.id)
        
        # Update session with new rotated hash
        session.refresh_token_hash = hash_token(new_refresh_token)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        if device_info:
            session.device_info = device_info
        if ip_address:
            session.ip_address = ip_address
        await db.commit()

        return new_access_token, new_refresh_token, 3600 * 24

    @staticmethod
    async def revoke_session(
        db: AsyncSession,
        user_id: str,
        refresh_token: Optional[str] = None,
        session_id: Optional[str] = None,
        all_devices: bool = False
    ) -> int:
        """
        Revokes user session(s).
        If all_devices is True: revokes all active sessions for the user.
        If refresh_token is supplied: revokes only that session by token hash.
        If session_id is supplied: revokes only that specific session by ID.
        If neither is supplied and all_devices is False: returns 0 (prevents unintentionally revoking unrelated devices).
        """
        if all_devices:
            stmt = select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.is_revoked == False
                )
            )
        elif refresh_token:
            token_hash = hash_token(refresh_token)
            stmt = select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.refresh_token_hash == token_hash,
                    UserSession.is_revoked == False
                )
            )
        elif session_id:
            stmt = select(UserSession).where(
                and_(
                    UserSession.user_id == user_id,
                    UserSession.id == session_id,
                    UserSession.is_revoked == False
                )
            )
        else:
            return 0

        res = await db.execute(stmt)
        sessions = res.scalars().all()
        count = len(sessions)
        for s in sessions:
            s.is_revoked = True

        await db.commit()
        return count
