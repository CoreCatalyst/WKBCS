import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.order import Order, OrderStatus
from app.models.escrow import EscrowTransaction, FeeLedger, EscrowStatus
from app.core.config import settings

class EscrowService:
    @staticmethod
    async def deposit_funds(
        db: AsyncSession,
        order_id: str,
        payment_reference: str,
        amount_paid: float
    ) -> EscrowTransaction:
        # Fetch order
        stmt = select(Order).where(Order.id == order_id)
        res = await db.execute(stmt)
        order = res.scalars().first()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # Find or create EscrowTransaction
        stmt_escrow = select(EscrowTransaction).where(EscrowTransaction.order_id == order_id)
        res_escrow = await db.execute(stmt_escrow)
        escrow = res_escrow.scalars().first()

        if not escrow:
            escrow = EscrowTransaction(
                order_id=order.id,
                buyer_id=order.buyer_id,
                vendor_id=order.vendor_id,
                amount_locked=amount_paid,
                platform_fee_retained=order.platform_fee,
                status=EscrowStatus.FUNDED,
                payment_reference=payment_reference
            )
            db.add(escrow)
        else:
            escrow.status = EscrowStatus.FUNDED
            escrow.amount_locked = amount_paid
            escrow.payment_reference = payment_reference

        # Update order status
        order.status = OrderStatus.PAID_IN_ESCROW
        await db.commit()
        await db.refresh(escrow)
        return escrow

    @staticmethod
    async def release_funds(
        db: AsyncSession,
        order_id: str
    ) -> EscrowTransaction:
        stmt = select(EscrowTransaction).where(EscrowTransaction.order_id == order_id)
        res = await db.execute(stmt)
        escrow = res.scalars().first()

        if not escrow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escrow transaction not found")

        if escrow.status == EscrowStatus.RELEASED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Funds have already been disbursed")

        # Calculation of platform commission and statutory TDS (Sec 194-O: 1%)
        # Total locked funds represent Gross Sales + GST
        gross_order_amount = escrow.amount_locked
        platform_fee = escrow.platform_fee_retained
        
        # 1% TDS on gross transaction value (pre-GST / base taxable order value)
        tds_amount = round(gross_order_amount * (settings.TDS_SECTION_194O_PERCENT / 100.0), 2)
        net_disbursed = round(gross_order_amount - platform_fee - tds_amount, 2)

        escrow.status = EscrowStatus.RELEASED
        escrow.tds_deducted = tds_amount
        escrow.amount_disbursed = net_disbursed
        escrow.settlement_reference = f"UTR_NORY_{uuid.uuid4().hex[:10].upper()}"
        escrow.disbursed_at = datetime.now(timezone.utc)

        # Record Platform Commission Ledger
        platform_ledger = FeeLedger(
            escrow_id=escrow.id,
            fee_type="PLATFORM_COMMISSION",
            amount=platform_fee,
            tax_percentage=18.0
        )
        db.add(platform_ledger)

        # Record TDS Section 194-O Ledger
        tds_ledger = FeeLedger(
            escrow_id=escrow.id,
            fee_type="TDS_SECTION_194O",
            amount=tds_amount,
            tax_percentage=settings.TDS_SECTION_194O_PERCENT
        )
        db.add(tds_ledger)

        # Update order status to COMPLETED
        stmt_order = select(Order).where(Order.id == order_id)
        res_order = await db.execute(stmt_order)
        order = res_order.scalars().first()
        if order:
            order.status = OrderStatus.COMPLETED

        await db.commit()
        await db.refresh(escrow)
        return escrow
