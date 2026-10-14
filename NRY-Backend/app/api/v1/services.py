"""
Noryvanta Services & Service Booking API Module
Section 5: Public Services Marketplace and Customer Bookings
"""

import uuid
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import BusinessProfile, BusinessVerificationStatus
from app.models.product import Product, ListingType, ListingStatus
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.schemas.marketplace import MarketplaceListingOut, PublicMerchantOut

router = APIRouter()

ACTIVE_STATUSES = [ListingStatus.ACTIVE, ListingStatus.PUBLISHED, ListingStatus.APPROVED]


class ServiceBookingCreate(BaseModel):
    service_id: str
    booking_date: Optional[str] = None
    notes: Optional[str] = None
    contact_phone: Optional[str] = None
    service_address: Optional[str] = None


class ServiceBookingOut(BaseModel):
    id: str
    booking_number: str
    service_id: str
    service_title: str
    provider_id: str
    customer_id: str
    status: str
    total_amount: float
    created_at: datetime
    notes: Optional[str] = None


def _to_service_listing(prod: Product) -> MarketplaceListingOut:
    merchant_out = None
    if prod.business:
        b = prod.business
        merchant_out = PublicMerchantOut(
            id=b.id,
            trade_name=b.trade_name or b.legal_name,
            legal_name=b.legal_name,
            business_type=b.business_type or "Service Provider",
            business_category=b.business_category or "Services",
            city=b.city,
            state=b.state,
            country=b.country or "India",
            rating=b.rating or 5.0,
            is_verified=(b.verification_status == BusinessVerificationStatus.VERIFIED),
            logo=b.logo or "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80"
        )

    return MarketplaceListingOut(
        id=prod.id,
        business_id=prod.business_id,
        type="SERVICE",
        title=prod.title,
        slug=prod.slug,
        short_description=prod.short_description or (prod.description[:160] if prod.description else None),
        description=prod.description,
        category=prod.category,
        subcategory=prod.subcategory,
        currency=prod.currency or "INR",
        base_price=prod.base_price,
        unit=prod.unit or "service",
        hsn_code=prod.hsn_code,
        gst_rate=prod.gst_rate or 18.0,
        moq=prod.moq or 1,
        stock_quantity=prod.stock_quantity or 1,
        availability=prod.availability or "AVAILABLE",
        status=prod.status.value if hasattr(prod.status, "value") else str(prod.status),
        images=prod.images or [],
        specifications=prod.specifications or {},
        tiered_prices=prod.tiered_prices or [],
        created_at=prod.created_at,
        merchant=merchant_out
    )


@router.get("", response_model=List[MarketplaceListingOut], summary="Browse active services")
async def list_services(
    category: Optional[str] = Query(None, description="Filter by service category"),
    city: Optional[str] = Query(None, description="Filter by provider city"),
    min_price: Optional[float] = Query(None, description="Minimum service charge"),
    max_price: Optional[float] = Query(None, description="Maximum service charge"),
    search: Optional[str] = Query(None, description="Search term for service title or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns only ACTIVE / APPROVED services for public customer browsing and booking.
    Protects provider tax/financial data by returning sanitized profiles.
    """
    stmt = (
        select(Product)
        .join(BusinessProfile, Product.business_id == BusinessProfile.id)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    if city and city != "All India":
        stmt = stmt.where(BusinessProfile.city.ilike(f"%{city}%"))

    if min_price is not None:
        stmt = stmt.where(Product.base_price >= min_price)

    if max_price is not None:
        stmt = stmt.where(Product.base_price <= max_price)

    if search:
        s_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(s_fmt),
                Product.description.ilike(s_fmt),
                BusinessProfile.trade_name.ilike(s_fmt),
                BusinessProfile.legal_name.ilike(s_fmt)
            )
        )

    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    services = res.scalars().all()
    return [_to_service_listing(p) for p in services]


@router.get("/{service_id}", response_model=MarketplaceListingOut, summary="Get service detail")
async def get_service_detail(
    service_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Product)
        .options(selectinload(Product.tiered_prices), selectinload(Product.business))
        .where(
            or_(Product.id == service_id, Product.slug == service_id),
            Product.type == ListingType.SERVICE,
            Product.status.in_(ACTIVE_STATUSES),
            Product.is_active == True
        )
    )
    res = await db.execute(stmt)
    service = res.scalars().first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service listing not found.")
    return _to_service_listing(service)


@router.post("/bookings", response_model=ServiceBookingOut, summary="Book a service")
async def create_booking(
    payload: ServiceBookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a service booking order with customer price protection (0% customer platform fee).
    """
    stmt = select(Product).options(selectinload(Product.business)).where(Product.id == payload.service_id)
    res = await db.execute(stmt)
    service = res.scalars().first()
    if not service or service.type != ListingType.SERVICE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    booking_num = f"BK-{uuid.uuid4().hex[:8].upper()}"
    base_charge = service.base_price
    gst_amt = round(base_charge * ((service.gst_rate or 18.0) / 100.0), 2)
    total_payable = round(base_charge + gst_amt, 2)

    order = Order(
        order_number=booking_num,
        customer_id=current_user.id,
        business_id=service.business_id,
        gross_business_value=base_charge,
        subtotal=base_charge,
        gst_total=gst_amt,
        customer_charges=0.0,
        total_customer_payable=total_payable,
        platform_fee_base_amount=base_charge,
        platform_fee=round(base_charge * 0.052, 2),  # 5.20% Services platform fee
        order_status=OrderStatus.CREATED,
        payment_status=PaymentStatus.INITIATED,
        payment_method="ONLINE",
        shipping_address=payload.service_address or "Customer Location"
    )
    db.add(order)
    await db.flush()

    item = OrderItem(
        order_id=order.id,
        product_id=service.id,
        quantity=1,
        unit_price=base_charge,
        gst_rate=service.gst_rate or 18.0,
        line_total=total_payable
    )
    db.add(item)
    await db.commit()
    await db.refresh(order)

    return ServiceBookingOut(
        id=order.id,
        booking_number=order.order_number,
        service_id=service.id,
        service_title=service.title,
        provider_id=service.business_id,
        customer_id=current_user.id,
        status=order.order_status.value,
        total_amount=order.total_customer_payable,
        created_at=order.created_at,
        notes=payload.notes
    )


@router.get("/bookings/{booking_id}", response_model=ServiceBookingOut, summary="Get booking detail")
async def get_booking_detail(
    booking_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(or_(Order.id == booking_id, Order.order_number == booking_id))
    )
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if order.customer_id != current_user.id and current_user.role.value != "ADMIN":
        # Check if the user is the service provider
        biz_stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
        biz_res = await db.execute(biz_stmt)
        biz = biz_res.scalars().first()
        if not biz or biz.id != order.business_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this booking.")

    item = order.items[0] if order.items else None
    service_id = item.product_id if item else "UNKNOWN"
    service_title = item.product.title if item and item.product else "Service Booking"

    return ServiceBookingOut(
        id=order.id,
        booking_number=order.order_number,
        service_id=service_id,
        service_title=service_title,
        provider_id=order.business_id,
        customer_id=order.customer_id,
        status=order.order_status.value,
        total_amount=order.total_customer_payable,
        created_at=order.created_at
    )


@router.post("/bookings/{booking_id}/cancel", summary="Cancel a service booking")
async def cancel_booking(
    booking_id: str,
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Order).where(or_(Order.id == booking_id, Order.order_number == booking_id))
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if order.customer_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to cancel this booking.")

    if order.order_status in [OrderStatus.COMPLETED, OrderStatus.DELIVERED]:
        raise HTTPException(status_code=400, detail="Completed services cannot be cancelled.")

    order.order_status = OrderStatus.CANCELLED
    if order.payment_status == PaymentStatus.SUCCESSFUL:
        order.payment_status = PaymentStatus.REFUND_INITIATED

    await db.commit()
    return {
        "success": True,
        "booking_id": order.id,
        "status": "CANCELLED",
        "message": "Service booking successfully cancelled."
    }
