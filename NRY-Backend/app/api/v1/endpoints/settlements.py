from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile
from app.models.escrow import Settlement, FinancialLedger
from app.schemas.escrow import SettlementOut, FinancialLedgerOut

router = APIRouter()

@router.get("", response_model=List[SettlementOut], summary="List Settlements & Platform Fee Ledger for Business Owner")
async def list_settlements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    biz_stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    biz_res = await db.execute(biz_stmt)
    biz = biz_res.scalars().first()
    if not biz and current_user.role != RoleEnum.ADMIN:
        return []

    stmt = select(Settlement)
    if current_user.role != RoleEnum.ADMIN:
        stmt = stmt.where(Settlement.business_id == biz.id)

    stmt = stmt.order_by(Settlement.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{id}", response_model=SettlementOut, summary="Get Single Transaction Settlement Breakdown (Stitch Screen 9)")
async def get_settlement_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Settlement).where(Settlement.id == id)
    res = await db.execute(stmt)
    settle = res.scalars().first()
    if not settle:
        raise HTTPException(status_code=404, detail="Settlement record not found.")

    # Authorization guard: only business owner or admin
    if current_user.role != RoleEnum.ADMIN:
        biz_stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
        biz = (await db.execute(biz_stmt)).scalars().first()
        if not biz or biz.id != settle.business_id:
            raise HTTPException(status_code=403, detail="Forbidden from viewing this settlement.")

    return settle

@router.get("/{id}/ledger", response_model=List[FinancialLedgerOut], summary="Get Audit Ledger Entries for Settlement")
async def get_settlement_ledger_entries(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(FinancialLedger).where(FinancialLedger.reference_id == id)
    res = await db.execute(stmt)
    return res.scalars().all()
