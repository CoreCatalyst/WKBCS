"""
Noryvanta Data Access Repositories
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

class UserRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        return await db.get(User, user_id)

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_by_phone(db: AsyncSession, phone: str) -> Optional[User]:
        stmt = select(User).where(User.phone == phone)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_by_uaid(db: AsyncSession, uaid: str) -> Optional[User]:
        stmt = select(User).where(User.uaid == uaid)
        res = await db.execute(stmt)
        return res.scalars().first()
