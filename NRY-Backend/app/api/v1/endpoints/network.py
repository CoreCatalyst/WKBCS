from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.network import (
    NetworkProgressResponse,
    NetworkLevelOut,
    RankProgressOut,
    LevelDetailOut,
    CycleHistoryOut,
    LevelProgressionLedgerOut,
    LevelQualificationAllocationOut
)
from app.services.network_service import network_service, RANKS_SPECIFICATION

router = APIRouter()

@router.get("/progress", response_model=NetworkProgressResponse, summary="Get 120-Level Network Progress & Current Rank")
async def get_network_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the comprehensive 120-level network progression for the authenticated member.
    Covers all 12 ranks, dynamic summary counters, active level (Level 37 Gold),
    and verified KYC status.
    """
    return await network_service.get_progress_data(user_id=current_user.id, db=db)

@router.get("/levels", response_model=List[NetworkLevelOut], summary="Get All 120 Network Levels")
async def get_all_levels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all 120 level records with statuses, rank names, and level values.
    """
    progress = await network_service.get_progress_data(user_id=current_user.id, db=db)
    return progress.levels

@router.get("/levels/{level_number}", response_model=LevelDetailOut, summary="Get Level Detail & 5-Step Activity Timeline")
async def get_level_details(
    level_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns granular status and 5-step verification timeline for any specific level (1-120).
    Transaction Received -> Verification Started -> Verification Completed -> Qualification Confirmed -> Reward Processing.
    """
    if level_number < 1 or level_number > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Level number must be between 1 and 120."
        )
    return await network_service.get_level_detail(
        user_id=current_user.id,
        level_number=level_number,
        db=db
    )

@router.get("/ranks", response_model=List[RankProgressOut], summary="Get All 12 Rank Progress Cards")
async def get_all_ranks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns progress for all 12 ranks (Bronze to Legendary), including qualification amount,
    multiplier, reward rate, and one-time rank reward status.
    """
    return await network_service.get_ranks_summary(user_id=current_user.id, db=db)

@router.get("/ranks/{rank_number}", response_model=RankProgressOut, summary="Get Specific Rank Progress")
async def get_rank_detail(
    rank_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns progress and potential reward for a specific rank (1 to 12).
    """
    if rank_number < 1 or rank_number > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rank number must be between 1 and 12."
        )
    ranks = await network_service.get_ranks_summary(user_id=current_user.id, db=db)
    target = next((r for r in ranks if r.rank_number == rank_number), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rank {rank_number} not found."
        )
    return target

@router.get("/cycles/history", response_model=List[CycleHistoryOut], summary="Get Member Cycle History")
async def get_cycle_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns active Cycle 1 and future locked cycles.
    """
    return await network_service.get_cycle_history(user_id=current_user.id, db=db)

@router.get("/level-ledger", response_model=List[LevelProgressionLedgerOut], summary="Get Level Qualification & Progression Ledger")
async def get_level_progression_ledger(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Section 33.14 & 33.26: Returns immutable level qualification ledger events:
    LEVEL_COMPLETED, RANK_COMPLETED, LEVEL_REVERSED.
    """
    return await network_service.get_level_progression_ledger(
        user_id=current_user.id,
        db=db,
        skip=skip,
        limit=limit
    )

@router.get("/allocations", response_model=List[LevelQualificationAllocationOut], summary="Get Level Qualification Allocation Audit Ledger")
async def get_qualification_allocations(
    cycle_number: Optional[int] = Query(None, ge=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Section 35.1: Qualification Allocation Ledger.
    Proves exactly how every level qualification was funded across transactions.
    """
    return await network_service.get_qualification_allocations(
        user_id=current_user.id,
        db=db,
        cycle_number=cycle_number,
        skip=skip,
        limit=limit
    )

# ─── UAID BLOCKED REACTIVATION PURCHASE WORKFLOW ──────────────────────────────

@router.get("/reactivation/calculate", summary="Calculate Required Reactivation Purchase (Formula: Unit × Missed Quarters)")
async def calculate_reactivation_amount(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Server-side dynamic calculation of required reactivation purchase.
    Required Amount = Business Minimum Purchase Amount × Number of Missed Quarters.
    Never trusts client input.
    """
    from app.services.quarterly_activity_service import quarterly_service
    return await quarterly_service.calculate_reactivation_requirement(user_id=current_user.id, db=db)

@router.post("/reactivation/submit", summary="Submit UAID Reactivation Form")
async def submit_reactivation_form(
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits the Reactivation Form. Server calculates missed quarters and required purchase unit.
    All frontend values are ignored; backend calculation is authoritative.
    """
    from app.services.quarterly_activity_service import quarterly_service
    return await quarterly_service.submit_reactivation_form(
        user_id=current_user.id,
        db=db,
        notes=notes
    )

@router.post("/reactivation/process", summary="Process Qualifying Reactivation Purchase")
async def process_reactivation_purchase(
    reactivation_id: str,
    order_id: str,
    amount_paid: float,
    payment_status: str = "PAYMENT_SUCCESS",
    order_status: str = "COMPLETED",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies qualifying purchase and completes reactivation:
    - Failed/refunded/cancelled orders cannot activate UAID.
    - Amount paid must satisfy required reactivation amount.
    - Preserves existing UAID (zero secondary UAID created).
    - Previous missed quarters remain historically recorded (not retroactively qualified).
    - Reactivation transaction is independently auditable.
    """
    from app.services.quarterly_activity_service import quarterly_service
    result = await quarterly_service.process_reactivation_purchase(
        user_id=current_user.id,
        reactivation_id=reactivation_id,
        order_id=order_id,
        amount_paid=amount_paid,
        payment_status=payment_status,
        order_status=order_status,
        db=db
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Reactivation failed")
        )
    return result

