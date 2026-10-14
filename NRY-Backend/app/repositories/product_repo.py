"""
Product and Service Listings Repository
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.product import Product, ListingType, ListingStatus

class ProductRepository:
    @staticmethod
    async def get_by_id(db: AsyncSession, product_id: str) -> Optional[Product]:
        stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    @staticmethod
    async def list_by_business(db: AsyncSession, business_id: str) -> List[Product]:
        stmt = (
            select(Product)
            .options(selectinload(Product.tiered_prices))
            .where(Product.business_id == business_id)
            .order_by(Product.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()
