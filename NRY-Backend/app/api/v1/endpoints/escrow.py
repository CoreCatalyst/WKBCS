from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.escrow import EscrowTransaction
from app.schemas.escrow import (
    EscrowDepositRequest, EscrowDepositResponse,
    EscrowReleaseResponse, EscrowOut
)
from app.services.escrow_service import EscrowService

router = APIRouter()

@router.post("/{order_id}/deposit", response_model=EscrowDepositResponse, summary="Fund order into secure escrow")
async def deposit_escrow(
    order_id: str,
    payload: EscrowDepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Locks payment in escrow, transitions order status to PAID_IN_ESCROW,
    authorizing the vendor to manufacture and dispatch.
    """
    escrow = await EscrowService.deposit_funds(
        db=db,
        order_id=order_id,
        payment_reference=payload.payment_reference,
        amount_paid=payload.amount_paid
    )

    return EscrowDepositResponse(
        order_id=escrow.order_id,
        escrow_id=escrow.id,
        status=escrow.status.value,
        amount_locked=escrow.amount_locked,
        message="Payment verified and successfully locked in Noryvanta Escrow."
    )

@router.post("/{order_id}/release", response_model=EscrowReleaseResponse, summary="Release escrow funds to vendor")
async def release_escrow(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Releases funds from escrow, automatically deducting platform commission
    and 1% TDS (Section 194-O), and crediting net funds to vendor bank account.
    """
    escrow = await EscrowService.release_funds(db=db, order_id=order_id)

    return EscrowReleaseResponse(
        order_id=escrow.order_id,
        escrow_status=escrow.status.value,
        amount_disbursed_to_vendor=escrow.amount_disbursed,
        tds_deducted=escrow.tds_deducted,
        platform_commission_retained=escrow.platform_fee_retained,
        settlement_reference=escrow.settlement_reference or "NORY_SETTLEMENT_PROCESSED",
        message="Milestone verified. Funds successfully disbursed to vendor bank account."
    )

@router.get("/{order_id}", response_model=EscrowOut, summary="Get escrow status and fee ledgers")
async def get_escrow_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(EscrowTransaction).options(
        selectinload(EscrowTransaction.fee_ledgers)
    ).where(EscrowTransaction.order_id == order_id)
    res = await db.execute(stmt)
    escrow = res.scalars().first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow transaction not found.")
    return escrow
