"""
Order Repository
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.order import Order

class OrderRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, order_id: str) -> Optional[Order]:
        stmt = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def list_by_customer(db: AsyncSession, customer_id: str) -> List[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def list_by_business(db: AsyncSession, business_id: str) -> List[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.business_id == business_id)
            .order_by(Order.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()
