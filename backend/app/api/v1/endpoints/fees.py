from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.escrow import PlatformFeeRule

router = APIRouter()

class FeeTierOut(BaseModel):
    business_type: str
    rate_percentage: float
    description: str

class PlatformFeeScheduleOut(BaseModel):
    registration_fee: float = 0.0
    currency: str = "INR"
    notice: str = "Platform fees apply strictly to successful transactions processed through Noryvanta. Registration is 100% free."
    fees: List[FeeTierOut]

# Standard Noryvanta Business Category Fee Schedule
FEE_SCHEDULE = [
    FeeTierOut(business_type="Wholesaler", rate_percentage=3.20, description="Wholesale transactions platform fee"),
    FeeTierOut(business_type="Distributor", rate_percentage=5.20, description="Distributor transactions platform fee"),
    FeeTierOut(business_type="Services", rate_percentage=5.20, description="Commercial & professional services platform fee"),
    FeeTierOut(business_type="Service Provider", rate_percentage=5.20, description="Registered service provider transactions platform fee"),
    FeeTierOut(business_type="Retailer", rate_percentage=8.20, description="Retail merchant transactions platform fee")
]

@router.get("", response_model=PlatformFeeScheduleOut, summary="Public Noryvanta Platform Fee Schedule")
@router.get("/schedule", response_model=PlatformFeeScheduleOut, summary="Public Noryvanta Platform Fee Schedule Alias")
async def get_platform_fees(db: AsyncSession = Depends(get_db)):
    """
    Returns the server-configured fee schedule from active versioned rules:
    - Wholesaler: 3.20%
    - Distributor: 5.20%
    - Services: 5.20%
    - Retailer: 8.20%
    - Registration: FREE (₹0)
    Allows frontend to dynamically render fees without hardcoding values.
    """
    try:
        stmt = select(PlatformFeeRule).where(PlatformFeeRule.status == "ACTIVE").order_by(PlatformFeeRule.business_type)
        res = await db.execute(stmt)
        rules = res.scalars().all()
        if rules:
            tier_list = []
            for r in rules:
                tier_list.append(FeeTierOut(
                    business_type=r.business_type.title(),
                    rate_percentage=float(r.fee_percentage),
                    description=r.change_reason or f"{r.business_type.title()} transactions platform fee"
                ))
            has_sp = any(t.business_type.lower() in ("service provider", "registered service provider") for t in tier_list)
            services_tier = next((t for t in tier_list if t.business_type.lower() == "services"), None)
            if services_tier and not has_sp:
                tier_list.append(FeeTierOut(
                    business_type="Service Provider",
                    rate_percentage=services_tier.rate_percentage,
                    description="Registered service provider transactions platform fee"
                ))
            return PlatformFeeScheduleOut(
                registration_fee=0.0,
                currency="INR",
                fees=tier_list
            )
    except Exception:
        pass

    return PlatformFeeScheduleOut(
        registration_fee=0.0,
        currency="INR",
        fees=FEE_SCHEDULE
    )

def get_platform_fee_rate_for_type(business_type: str) -> float:
    """Helper to resolve the fee percentage for a given business type."""
    normalized = (business_type or "").strip().lower()
    mapping = {
        "wholesaler": 3.20,
        "distributor": 5.20,
        "services": 5.20,
        "service": 5.20,
        "service provider": 5.20,
        "registered service provider": 5.20,
        "skilled service": 5.20,
        "retailer": 8.20,
        "shop": 8.20,
        "manufacturer": 3.20
    }
    return mapping.get(normalized, 5.20)  # Default fallback 5.20% (never 10%)
