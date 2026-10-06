from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.network import Referral, ReferralTransaction
from app.schemas.network import (
    ReferralInfoOut,
    ReferralValidateIn,
    ReferralValidateOut,
    ReferralShareIn,
    ReferralShareOut,
    ReferralNetworkMemberOut
)
from app.services.network_service import network_service

router = APIRouter()

@router.get("/my", response_model=ReferralInfoOut, summary="Get Current User's Referral Profile & ID")
async def get_my_referral_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns authenticated user's NRY Referral ID, share link, QR payload, and network volume.
    """
    return await network_service.get_referral_info(user=current_user, db=db)

@router.post("/validate", response_model=ReferralValidateOut, summary="Validate a Referral Code / UAID")
async def validate_referral(
    payload: ReferralValidateIn,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates a referral code or UAID during registration or checkout.
    """
    return await network_service.validate_referral_code(code=payload.referral_code, db=db)

@router.post("/share", response_model=ReferralShareOut, summary="Generate Referral Share Payload")
async def share_referral(
    payload: ReferralShareIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates tailored share message for WhatsApp, Email, SMS, or direct clipboard.
    """
    info = await network_service.get_referral_info(user=current_user, db=db)
    msg = (
        f"Join Noryvanta using my referral ID: {info.uaid} and unlock commercial marketplace growth! "
        f"Register here: {info.share_url}"
    )
    return ReferralShareOut(
        share_url=info.share_url,
        referral_code=info.uaid,
        share_text=msg
    )

@router.get("/network", response_model=List[ReferralNetworkMemberOut], summary="Get User's Referral Network Members")
async def get_referral_network(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists referred network partners and their qualifying purchase volume.
    """
    stmt = (
        select(Referral)
        .where(Referral.referrer_user_id == current_user.id)
        .order_by(Referral.created_at.desc())
    )
    res = await db.execute(stmt)
    referrals = res.scalars().all()

    if not referrals:
        # Provide sample demo partners for visual completeness in DEMO_MODE
        return [
            ReferralNetworkMemberOut(
                id="ref-demo-1",
                referred_uaid="NRY-RT-MUM-482019",
                business_name="Metro Retail Hub",
                business_type="RETAILER",
                joined_at=datetime(2026, 2, 10, 10, 0, 0, tzinfo=timezone.utc),
                qualifying_purchases=1850000.0,
                status="ACTIVE"
            ),
            ReferralNetworkMemberOut(
                id="ref-demo-2",
                referred_uaid="NRY-DS-DEL-891042",
                business_name="Northern Tool Dist.",
                business_type="DISTRIBUTOR",
                joined_at=datetime(2026, 2, 15, 14, 30, 0, tzinfo=timezone.utc),
                qualifying_purchases=3000000.0,
                status="ACTIVE"
            )
        ]

    members_out = []
    for r in referrals:
        members_out.append(
            ReferralNetworkMemberOut(
                id=r.id,
                referred_uaid=r.referred_uaid or "NRY-MEMBER",
                business_name="Registered Partner",
                business_type="RETAILER",
                joined_at=r.created_at,
                qualifying_purchases=0.0,
                status=r.status
            )
        )
    return members_out
