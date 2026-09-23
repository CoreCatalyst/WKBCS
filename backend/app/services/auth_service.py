from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile
from app.core.security import create_access_token, create_refresh_token, decode_token

class AuthService:
    @staticmethod
    async def get_or_create_user_by_identifier(
        db: AsyncSession,
        identifier: str,
        full_name: Optional[str] = None,
        role: str = "BUYER"
    ) -> User:
        is_email = "@" in identifier
        if is_email:
            stmt = select(User).where(User.email == identifier)
        else:
            stmt = select(User).where(User.phone == identifier)

        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            # Map role
            try:
                assigned_role = RoleEnum(role.upper())
            except ValueError:
                assigned_role = RoleEnum.BUYER

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
    async def generate_tokens(db: AsyncSession, user: User) -> Tuple[str, str, int, bool]:
        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id)
        
        # Check if user has business profile
        stmt = select(BusinessProfile).where(BusinessProfile.user_id == user.id)
        res = await db.execute(stmt)
        has_biz = res.scalars().first() is not None

        return access_token, refresh_token, 3600 * 24, has_biz
