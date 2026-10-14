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
from app.models.business import BusinessProfile
from app.api.v1.endpoints.fees import get_platform_fee_rate_for_type
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.escrow import EscrowTransaction, EscrowStatus, Settlement
from app.schemas.order import OrderCreate, OrderOut, FinancialBreakdownOut
from app.services.fee_calculation_service import fee_calculation_service
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

    rate = settings.PLATFORM_COMMISSION_PERCENT
    biz_type = "SERVICES"
    if vendor_id:
        biz_stmt = select(BusinessProfile).where(BusinessProfile.id == vendor_id)
        biz_res = await db.execute(biz_stmt)
        biz = biz_res.scalars().first()
        if biz and biz.business_type:
            biz_type = biz.business_type.strip().upper()
            rate = get_platform_fee_rate_for_type(biz.business_type)

    merchant_discount = getattr(payload, "merchant_discount", 0.0) or 0.0
    platform_discount = getattr(payload, "platform_discount", 0.0) or 0.0
    shipping_charges = payload.customer_charges

    gross_business_val = subtotal
    eligible_net_val = float(fee_calculation_service.calculate_eligible_net_business_value(
        gross_value=gross_business_val,
        merchant_discount=merchant_discount,
        platform_discount=platform_discount
    ))

    platform_fee = float(fee_calculation_service.calculate_platform_fee(
        eligible_business_value=eligible_net_val,
        fee_rate_percentage=rate
    ))

    total_customer_payable = float(fee_calculation_service.calculate_customer_payable(
        eligible_business_value=max(0.0, eligible_net_val - platform_discount),
        tax_amount=gst_total,
        shipping_amount=shipping_charges
    ))

    order_number = f"NORY-{uuid.uuid4().hex[:8].upper()}"

    new_order = Order(
        order_number=order_number,
        customer_id=current_user.id,
        business_id=vendor_id,
        gross_business_value=gross_business_val,
        merchant_discount=merchant_discount,
        platform_discount=platform_discount,
        eligible_net_business_value=eligible_net_val,
        subtotal=subtotal,
        gst_total=gst_total,
        customer_charges=shipping_charges,
        total_customer_payable=total_customer_payable,
        platform_fee_base_amount=eligible_net_val,
        platform_fee=platform_fee,
        order_status=OrderStatus.CREATED,
        payment_status=PaymentStatus.COD_PENDING if payload.is_cod else PaymentStatus.INITIATED,
        payment_method=payload.payment_method,
        is_cod=payload.is_cod,
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

@router.get("/{order_id}/financial-breakdown", response_model=FinancialBreakdownOut, summary="Transparent Financial Breakdown (Section 32.21)")
async def get_order_financial_breakdown(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Order).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Look up settlement if already settled
    settle_stmt = select(Settlement).where(Settlement.order_id == order.id)
    settle_res = await db.execute(settle_stmt)
    settlement = settle_res.scalars().first()

    gross = order.gross_business_value or order.subtotal
    m_disc = order.merchant_discount or 0.0
    p_disc = order.platform_discount or 0.0
    eligible = order.eligible_net_business_value or (gross - m_disc)
    shipping = order.customer_charges or 0.0
    tax = order.gst_total or 0.0

    if settlement:
        rate = settlement.platform_fee_rate
        fee = settlement.platform_fee_amount
        net_settle = settlement.net_settlement_amount
        tds = settlement.tds_amount
        rule_id = settlement.applied_fee_rule_id
        rule_ver = settlement.applied_fee_rule_version
        b_type = settlement.business_type
    else:
        rate = 5.20
        if order.business_id:
            biz_stmt2 = select(BusinessProfile).where(BusinessProfile.id == order.business_id)
            biz2 = (await db.execute(biz_stmt2)).scalars().first()
            if biz2 and biz2.business_type:
                rate = get_platform_fee_rate_for_type(biz2.business_type)
        fee = float(fee_calculation_service.calculate_platform_fee(eligible, rate))
        tds = round(eligible * 0.01, 2)
        net_settle = round(eligible - fee - tds, 2)
        rule_id = None
        rule_ver = None
        b_type = None

    return FinancialBreakdownOut(
        currency=order.currency or "INR",
        gross_business_value=gross,
        merchant_discount_amount=m_disc,
        platform_discount_amount=p_disc,
        eligible_business_value=eligible,
        tax_amount=tax,
        shipping_amount=shipping,
        payment_fee_amount=0.0,
        platform_fee_percentage=rate,
        platform_fee_base_amount=eligible,
        platform_fee_amount=fee,
        customer_payable_amount=order.total_customer_payable,
        business_settlement_amount=net_settle,
        tds_amount=tds,
        business_type=b_type,
        applied_fee_rule_id=rule_id,
        applied_fee_rule_version=rule_ver
    )
