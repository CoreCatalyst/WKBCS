"""
Noryvanta UAID (Universal Account Identifier) API Module
Section 5: UAID Management, Generation, Resolution, and Status
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import BusinessProfile, BusinessVerificationStatus
from app.services.uaid_service import UAIDService

router = APIRouter()


class UAIDMeResponse(BaseModel):
    uaid: Optional[str]
    user_id: str
    full_name: Optional[str]
    role: str
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: bool
    qr_code_url: Optional[str] = None


class UAIDResolveResponse(BaseModel):
    uaid: str
    trade_name: str
    legal_name: str
    business_type: str
    city: Optional[str]
    state: Optional[str]
    is_verified: bool


@router.get("/me", response_model=UAIDMeResponse, summary="Get authenticated user's UAID")
async def get_my_uaid(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the user's permanent UAID and associated business profile information.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()

    uaid_val = current_user.uaid or (biz.virtual_escrow_account_id if biz else None)

    qr_url = f"/api/v1/qr/uaid/{uaid_val}" if uaid_val else None

    return UAIDMeResponse(
        uaid=uaid_val,
        user_id=current_user.id,
        full_name=current_user.full_name,
        role=current_user.role.value,
        business_id=biz.id if biz else None,
        business_name=(biz.trade_name or biz.legal_name) if biz else None,
        business_type=biz.business_type if biz else None,
        verification_status=biz.verification_status.value if biz and hasattr(biz.verification_status, "value") else (str(biz.verification_status) if biz else None),
        is_active=current_user.is_active,
        qr_code_url=qr_url
    )


@router.get("/resolve/{uaid_string}", response_model=UAIDResolveResponse, summary="Resolve public info from UAID")
async def resolve_uaid(
    uaid_string: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Resolves public business identity for a given UAID string.
    Ensures private banking and tax attributes are never exposed.
    """
    clean_uaid = uaid_string.strip().upper()
    stmt = select(BusinessProfile).where(
        BusinessProfile.virtual_escrow_account_id == clean_uaid
    )
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active business found for UAID '{clean_uaid}'."
        )

    return UAIDResolveResponse(
        uaid=clean_uaid,
        trade_name=biz.trade_name or biz.legal_name,
        legal_name=biz.legal_name,
        business_type=biz.business_type or "Retailer",
        city=biz.city,
        state=biz.state,
        is_verified=(biz.verification_status == BusinessVerificationStatus.VERIFIED)
    )
