"""
Business Profile Repository
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.business import BusinessProfile

class BusinessRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, business_id: str) -> Optional[BusinessProfile]:
        return await db.get(BusinessProfile, business_id)

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: str) -> Optional[BusinessProfile]:
        stmt = select(BusinessProfile).where(BusinessProfile.user_id == user_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def get_by_uaid(db: AsyncSession, uaid: str) -> Optional[BusinessProfile]:
        stmt = select(BusinessProfile).where(BusinessProfile.virtual_escrow_account_id == uaid)
        res = await db.execute(stmt)
        return res.scalars().first()
