from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.network import RewardLedger
from app.schemas.network import (
    RewardWalletOut,
    RewardLedgerOut,
    RewardLedgerSummaryOut,
    RewardRulesResponse
)
from app.services.network_service import network_service

router = APIRouter()

@router.get("/me", response_model=RewardWalletOut, summary="Get Own Reward Balance & Wallet Summary")
@router.get("/summary", response_model=RewardWalletOut, summary="Get Reward Balance & Wallet Summary")
async def get_reward_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns user reward ledger wallet summary:
    Total Earned, Available, Pending, Redeemed, Reversed.
    Clarifies non-withdrawable cash status under current terms.
    """
    return await network_service.get_reward_wallet(user_id=current_user.id, db=db)

@router.get("/ledger", response_model=RewardLedgerSummaryOut, summary="Get Paginated Immutable Reward Ledger")
async def get_reward_ledger(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns user's immutable rank reward ledger records, including
    qualifying rank, level, qualification amount, rate, reward amount, and reversal status.
    """
    return await network_service.get_reward_ledger(
        user_id=current_user.id,
        db=db,
        skip=skip,
        limit=limit
    )

@router.get("/rules", response_model=RewardRulesResponse, summary="Get Configurable Reward Rules for Business Type")
async def get_reward_rules(
    business_type: str = Query("WHOLESALER", description="WHOLESALER, DISTRIBUTOR, RETAILER, or SERVICE_PROVIDER")
):
    """
    Returns configured 12 rank rules, qualification multipliers, rates, and benchmark reward amounts.
    """
    return await network_service.get_reward_rules_for_type(business_type=business_type)

@router.get("/{reward_id}", response_model=RewardLedgerOut, summary="Get Specific Reward Ledger Record")
async def get_reward_detail(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns detailed audit information for an individual reward ledger entry.
    Enforces privacy: User can only access their own reward records.
    """
    stmt = (
        select(RewardLedger)
        .where(RewardLedger.id == reward_id)
        .where(RewardLedger.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    record = res.scalars().first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward ledger record not found or unauthorized."
        )
    return record
