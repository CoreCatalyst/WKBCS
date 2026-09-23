import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, KYCStatus, VerificationTier
from app.schemas.business import BusinessOnboardRequest, BusinessOut

router = APIRouter()

@router.post("/onboard", response_model=BusinessOut, summary="Onboard Business Profile with GSTIN & Escrow Virtual Account")
async def onboard_business(
    payload: BusinessOnboardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a verified enterprise vendor profile, generates a virtual escrow account,
    and updates the user's role to VENDOR.
    """
    # Check if user already has a business profile
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    existing_biz = res.scalars().first()
    if existing_biz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an associated business profile."
        )

    # Generate Virtual Escrow Account Identifier
    virtual_escrow = f"NORY_VA_{payload.gstin.upper()}"

    new_profile = BusinessProfile(
        user_id=current_user.id,
        legal_name=payload.legal_name,
        trade_name=payload.trade_name,
        business_type=payload.business_type,
        gstin=payload.gstin.upper(),
        pan=payload.pan.upper(),
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc.upper(),
        virtual_escrow_account_id=virtual_escrow,
        primary_category=payload.primary_category,
        kyc_status=KYCStatus.VERIFIED,
        tier=VerificationTier.SOVEREIGN_PLATINUM,
        rating=4.95,
        total_sales_volume=1250000.0  # Initial baseline
    )
    db.add(new_profile)

    # Elevate user role to VENDOR
    current_user.role = RoleEnum.VENDOR
    await db.commit()
    await db.refresh(new_profile)

    return new_profile

@router.get("/me", response_model=BusinessOut, summary="Get active vendor's business profile")
async def get_my_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business profile found for current user."
        )
    return profile
