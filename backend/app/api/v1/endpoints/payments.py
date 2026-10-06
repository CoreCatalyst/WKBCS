from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.order import Order, OrderStatus, PaymentStatus
from app.schemas.escrow import (
    PaymentSessionCreate,
    PaymentSessionOut,
    SettlementOut
)
from app.services.payment_service import payment_service

router = APIRouter()

@router.post("/create-session", response_model=PaymentSessionOut, summary="Initiate Payment Gateway Session (Razorpay / Cashfree)")
async def create_payment_session(
    payload: PaymentSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Order).where(Order.id == payload.order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to pay for this order.")

    session_info = await payment_service.create_checkout_session(
        order=order,
        gateway_name=payload.gateway,
        db=db
    )

    return PaymentSessionOut(
        order_id=order.id,
        gateway=session_info["gateway"],
        gateway_order_id=session_info["gateway_order_id"],
        amount=session_info["amount"],
        currency=session_info["currency"],
        key_id=session_info["key_id"],
        customer_name=current_user.full_name,
        customer_phone=current_user.phone,
        customer_email=current_user.email
    )

@router.post("/webhook/{gateway}", summary="Secure Payment Gateway Webhook Receiver")
async def payment_webhook(
    gateway: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Cryptographically verifies webhook payload from Razorpay or Cashfree.
    Executes idempotent double-entry ledger allocation and settlement creation.
    """
    raw_body = await request.body()
    gateway_upper = gateway.upper()
    adapter = payment_service.get_adapter(gateway_upper)

    signature = (
        request.headers.get("x-razorpay-signature")
        or request.headers.get("x-cashfree-signature")
        or request.headers.get("x-webhook-signature")
        or ""
    )

    is_valid = adapter.verify_webhook_signature(raw_body, signature)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment webhook signature."
        )

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    order_id = payload.get("order_id") or payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {}).get("order_id")
    gateway_payment_id = payload.get("payment_id") or payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id") or f"pay_{gateway_upper.lower()}_mock"
    gateway_order_id = payload.get("gateway_order_id") or "gw_order_mock"
    amount = float(payload.get("amount", 0.0))

    if not order_id:
        return {"success": True, "message": "Webhook acknowledged (untracked order event)"}

    stmt = select(Order).where(Order.id == order_id)
    res = await db.execute(stmt)
    order = res.scalars().first()
    if not order:
        return {"success": True, "message": "Order not found or already purged"}

    settlement = await payment_service.process_successful_payment(
        order=order,
        gateway=gateway_upper,
        gateway_payment_id=gateway_payment_id,
        gateway_order_id=gateway_order_id,
        amount=amount or order.total_customer_payable,
        raw_payload=payload,
        db=db
    )

    return {
        "success": True,
        "order_id": order.id,
        "settlement_id": settlement.id,
        "status": "CONFIRMED"
    }
