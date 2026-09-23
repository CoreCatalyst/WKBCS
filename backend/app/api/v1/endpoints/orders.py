import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.escrow import EscrowTransaction, EscrowStatus
from app.schemas.order import OrderCreate, OrderOut
from app.core.config import settings

router = APIRouter()

@router.post("", response_model=OrderOut, summary="Create a new B2B Purchase Order with Escrow")
async def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item.")

    subtotal = 0.0
    gst_total = 0.0
    vendor_id = None
    order_items_to_add = []

    for item_in in payload.items:
        stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == item_in.product_id)
        res = await db.execute(stmt)
        prod = res.scalars().first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found.")

        if vendor_id is None:
            vendor_id = prod.business_id

        # Determine price based on tiered pricing or base price
        unit_price = prod.base_price
        for tier in prod.tiered_prices:
            if item_in.quantity >= tier.min_quantity:
                if tier.max_quantity is None or item_in.quantity <= tier.max_quantity:
                    unit_price = tier.unit_price
                    break

        line_subtotal = round(unit_price * item_in.quantity, 2)
        line_gst = round(line_subtotal * (prod.gst_rate / 100.0), 2)
        line_total = line_subtotal + line_gst

        subtotal += line_subtotal
        gst_total += line_gst

        order_items_to_add.append({
            "product_id": prod.id,
            "quantity": item_in.quantity,
            "unit_price": unit_price,
            "gst_rate": prod.gst_rate,
            "line_total": line_total
        })

    platform_fee = round(subtotal * (settings.PLATFORM_COMMISSION_PERCENT / 100.0), 2)
    total_amount = subtotal + gst_total

    order_number = f"NORY-{uuid.uuid4().hex[:8].upper()}"

    new_order = Order(
        order_number=order_number,
        buyer_id=current_user.id,
        vendor_id=vendor_id,
        subtotal=subtotal,
        gst_total=gst_total,
        platform_fee=platform_fee,
        total_amount=total_amount,
        status=OrderStatus.CREATED,
        shipping_address=payload.shipping_address
    )
    db.add(new_order)
    await db.flush()

    for itm in order_items_to_add:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=itm["product_id"],
            quantity=itm["quantity"],
            unit_price=itm["unit_price"],
            gst_rate=itm["gst_rate"],
            line_total=itm["line_total"]
        )
        db.add(order_item)

    # Initialize empty Escrow record
    escrow = EscrowTransaction(
        order_id=new_order.id,
        buyer_id=current_user.id,
        vendor_id=vendor_id,
        amount_locked=0.0,
        platform_fee_retained=platform_fee,
        status=EscrowStatus.INITIATED
    )
    db.add(escrow)

    await db.commit()
    await db.refresh(new_order)

    # Load items
    stmt_reload = select(Order).options(selectinload(Order.items)).where(Order.id == new_order.id)
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalars().first()

@router.get("", response_model=List[OrderOut], summary="List orders for current user")
async def list_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)\
):
    stmt = select(Order).options(selectinload(Order.items))

    if current_user.role == RoleEnum.BUYER:
        # Buyer sees only their own orders
        stmt = stmt.where(Order.buyer_id == current_user.id)
    elif current_user.role == RoleEnum.VENDOR:
        # Vendor sees orders placed against their business — requires business profile lookup
        from sqlalchemy import select as sel
        from app.models.business import BusinessProfile
        biz_stmt = sel(BusinessProfile.id).where(BusinessProfile.user_id == current_user.id)
        biz_res = await db.execute(biz_stmt)
        biz_id = biz_res.scalar()
        if biz_id:
            stmt = stmt.where(Order.vendor_id == biz_id)
        else:
            return []  # No business profile yet
    # ADMIN: sees all orders (no additional filter)

    stmt = stmt.order_by(Order.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{order_id}", response_model=OrderOut, summary="Get single order detail")
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
