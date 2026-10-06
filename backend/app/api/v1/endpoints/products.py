import uuid
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile
from app.models.product import Product, TieredPrice, ListingType, ListingStatus
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut, AIListingRequest, AIListingResponse, TieredPriceSchema
)
from app.services.ai_service import AIService

router = APIRouter()

@router.get("", response_model=List[ProductOut], summary="List and search products")
async def list_products(
    query: Optional[str] = Query(None, description="Search by title, description or HSN"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.is_active == True)

    if query:
        search_fmt = f"%{query}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                Product.hsn_code.ilike(search_fmt)
            )
        )

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    products = res.scalars().all()
    return products

@router.get("/{product_id}", response_model=ProductOut, summary="Get single product by ID")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
    res = await db.execute(stmt)
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@router.post("", response_model=ProductOut, summary="Create a new wholesale product listing")
async def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify user has business profile
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business profile required to publish products."
        )

    slug = re.sub(r'[^a-zA-Z0-9]+', '-', payload.title.lower()).strip('-') + f"-{uuid.uuid4().hex[:6]}"

    listing_type = ListingType.SERVICE if getattr(payload, "type", "PRODUCT") == "SERVICE" else ListingType.PRODUCT
    initial_status = ListingStatus.DRAFT if payload.is_draft else ListingStatus.SUBMITTED
    is_active_initial = (initial_status == ListingStatus.ACTIVE)

    product = Product(
        business_id=biz.id,
        type=listing_type,
        title=payload.title,
        slug=slug,
        description=payload.description,
        category=payload.category,
        hsn_code=payload.hsn_code,
        gst_rate=payload.gst_rate or 18.0,
        base_price=payload.base_price,
        unit=payload.unit or ("piece" if listing_type == ListingType.PRODUCT else "service"),
        moq=payload.moq,
        stock_quantity=payload.stock_quantity,
        status=initial_status,
        is_active=is_active_initial,
        images=payload.images or ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
        videos=payload.videos or [],
        specifications=payload.specifications or {}
    )
    db.add(product)
    await db.flush()

    # Add tiered pricing if provided
    if payload.tiered_prices:
        for t in payload.tiered_prices:
            tp = TieredPrice(
                product_id=product.id,
                min_quantity=t.min_quantity,
                max_quantity=t.max_quantity,
                unit_price=t.unit_price
            )
            db.add(tp)

    await db.commit()
    await db.refresh(product)
    
    # Reload with tiered prices
    stmt_reload = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product.id)
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalars().first()

@router.put("/{product_id}", response_model=ProductOut, summary="Update an existing product or service listing")
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify business ownership
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business profile required to edit listings."
        )

    stmt_p = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this listing")

    update_data = payload.model_dump(exclude_unset=True)
    if "tiered_prices" in update_data:
        update_data.pop("tiered_prices")

    for field, val in update_data.items():
        setattr(product, field, val)

    await db.commit()
    await db.refresh(product)
    return product

@router.post("/ai-assist", response_model=AIListingResponse, summary="AI Product Listing Assistant")
async def ai_listing_assist(payload: AIListingRequest):
    """
    Analyzes raw product titles and attributes, automatically classifying HSN, GST slabs,
    and generating SEO-optimized commercial descriptions and bulk discount tiers.
    """
    return AIService.generate_listing_metadata(payload)
