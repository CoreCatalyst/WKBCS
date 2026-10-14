"""
Noryvanta Customer Operations & Shopping Cart API Module
Section 5: Customer Profiles, Orders, Bookings, Addresses, and Cart
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product, ListingType
from app.schemas.order import OrderOut

router = APIRouter()


class CustomerProfileOut(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    uaid: Optional[str] = None
    role: str
    is_verified: bool
    created_at: datetime


class AddressCreate(BaseModel):
    title: Optional[str] = "Default"
    recipient_name: str
    phone: str
    address_line: str
    city: str
    district: Optional[str] = None
    state: str
    country: str = "India"
    postal_code: str
    is_default: bool = False


class AddressOut(AddressCreate):
    id: str


# In-memory customer addresses store (persisted in user profile session/metadata)
_USER_ADDRESSES: Dict[str, List[Dict[str, Any]]] = {}

# In-memory cart store per user/device
_USER_CARTS: Dict[str, List[Dict[str, Any]]] = {}


class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemOut(BaseModel):
    item_id: str
    product_id: str
    title: str
    unit_price: float
    gst_rate: float
    quantity: int
    line_total: float
    images: List[str]


class CartSummaryOut(BaseModel):
    items: List[CartItemOut]
    subtotal: float
    gst_total: float
    total_payable: float
    item_count: int


@router.get("/me", response_model=CustomerProfileOut, summary="Get customer profile")
async def get_customer_profile(current_user: User = Depends(get_current_user)):
    return CustomerProfileOut(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        full_name=current_user.full_name,
        uaid=current_user.uaid,
        role=current_user.role.value,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )


@router.get("/me/orders", response_model=List[OrderOut], summary="Get customer orders")
async def get_customer_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.customer_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/me/bookings", summary="Get customer service bookings")
async def get_customer_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.customer_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()
    # Filter bookings where items are services or order_number starts with BK-
    bookings = []
    for o in orders:
        is_booking = o.order_number.startswith("BK-") or any(
            it.product and it.product.type == ListingType.SERVICE for it in o.items
        )
        if is_booking:
            first_item = o.items[0] if o.items else None
            bookings.append({
                "id": o.id,
                "booking_number": o.order_number,
                "service_title": first_item.product.title if first_item and first_item.product else "Service",
                "service_id": first_item.product_id if first_item else None,
                "provider_id": o.business_id,
                "status": o.order_status.value,
                "total_amount": o.total_customer_payable,
                "created_at": o.created_at
            })
    return bookings


@router.get("/me/addresses", response_model=List[AddressOut], summary="Get customer addresses")
async def get_customer_addresses(current_user: User = Depends(get_current_user)):
    user_addrs = _USER_ADDRESSES.get(current_user.id, [])
    return user_addrs


@router.post("/me/addresses", response_model=AddressOut, summary="Add new delivery address")
async def add_customer_address(
    payload: AddressCreate,
    current_user: User = Depends(get_current_user)
):
    addr_id = str(uuid.uuid4())
    addr_dict = payload.model_dump()
    addr_dict["id"] = addr_id

    if current_user.id not in _USER_ADDRESSES:
        _USER_ADDRESSES[current_user.id] = []

    if payload.is_default:
        for a in _USER_ADDRESSES[current_user.id]:
            a["is_default"] = False

    _USER_ADDRESSES[current_user.id].append(addr_dict)
    return addr_dict


# ─── Shopping Cart Endpoints ──────────────────────────────────────────

@router.get("/cart", response_model=CartSummaryOut, summary="Get customer cart")
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_items = _USER_CARTS.get(current_user.id, [])
    output_items = []
    subtotal = 0.0
    gst_total = 0.0

    for item in user_items:
        prod_id = item["product_id"]
        qty = item["quantity"]
        p = await db.get(Product, prod_id)
        if not p:
            continue
        line_sub = round(p.base_price * qty, 2)
        line_gst = round(line_sub * ((p.gst_rate or 18.0) / 100.0), 2)
        line_tot = line_sub + line_gst
        subtotal += line_sub
        gst_total += line_gst

        output_items.append(CartItemOut(
            item_id=item["item_id"],
            product_id=p.id,
            title=p.title,
            unit_price=p.base_price,
            gst_rate=p.gst_rate or 18.0,
            quantity=qty,
            line_total=line_tot,
            images=p.images or []
        ))

    return CartSummaryOut(
        items=output_items,
        subtotal=round(subtotal, 2),
        gst_total=round(gst_total, 2),
        total_payable=round(subtotal + gst_total, 2),
        item_count=sum(it.quantity for it in output_items)
    )


@router.post("/cart/items", response_model=CartSummaryOut, summary="Add item to cart")
async def add_to_cart(
    payload: CartItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    product = await db.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found or inactive.")

    if current_user.id not in _USER_CARTS:
        _USER_CARTS[current_user.id] = []

    # Check if product is already in cart
    existing = next((i for i in _USER_CARTS[current_user.id] if i["product_id"] == payload.product_id), None)
    if existing:
        existing["quantity"] += payload.quantity
    else:
        _USER_CARTS[current_user.id].append({
            "item_id": str(uuid.uuid4()),
            "product_id": payload.product_id,
            "quantity": payload.quantity
        })

    return await get_cart(current_user=current_user, db=db)


@router.patch("/cart/items/{item_id}", response_model=CartSummaryOut, summary="Update cart item quantity")
async def update_cart_item(
    item_id: str,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_items = _USER_CARTS.get(current_user.id, [])
    item = next((i for i in user_items if i["item_id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    item["quantity"] = payload.quantity
    return await get_cart(current_user=current_user, db=db)


@router.delete("/cart/items/{item_id}", response_model=CartSummaryOut, summary="Remove item from cart")
async def remove_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.id in _USER_CARTS:
        _USER_CARTS[current_user.id] = [
            i for i in _USER_CARTS[current_user.id] if i["item_id"] != item_id
        ]
    return await get_cart(current_user=current_user, db=db)
