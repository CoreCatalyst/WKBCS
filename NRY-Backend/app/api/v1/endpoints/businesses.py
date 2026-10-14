import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, BusinessVerificationStatus, VerificationTier
from app.models.kyc import KYCStatus
from app.models.product import Product
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.escrow import Settlement
from app.schemas.business import (
    BusinessRegister,
    BusinessUpdate,
    BusinessOut,
    PublicBusinessProfile,
    BusinessDashboardSummary,
    BusinessDashboardMetrics
)
from app.services.maps_service import MapsService
from app.services.notification_service import NotificationService
from app.services.uaid_service import UAIDService

router = APIRouter()

@router.post("/register", response_model=BusinessOut, summary="Register Business Profile (Stitch Onboarding Flow)")
@router.post("/onboard", response_model=BusinessOut, summary="Onboard Business Profile (Legacy alias)")
async def register_business(
    payload: BusinessRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    existing_biz = res.scalars().first()
    if existing_biz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an associated business profile."
        )

    # GST Validation Rule:
    # GST is mandatory for Product businesses (Wholesaler, Distributor, Retailer, Manufacturer)
    # and Registered Service Businesses.
    # It is NOT mandatory for Skilled Small-Scale Home Service Providers.
    is_skilled_home_service = (
        payload.business_type.lower() in ("service provider", "service", "skilled service")
        and payload.business_classification == "SKILLED_SMALL_SCALE_HOME_SERVICE"
    )
    if not is_skilled_home_service:
        if not payload.gst_number or not payload.gst_number.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GST number is mandatory for Product businesses and Registered Service Businesses."
            )

    # Generate unique Noryvanta UAID:
    # Wholesaler: NRY-HS-[SHORT]-[RANDOM]
    # Distributor: NRY-DS-[SHORT]-[RANDOM]
    # Retailer: NRY-RT-[SHORT]-[RANDOM]
    # Service Provider: NRY-SR-[SHORT]-[RANDOM]
    generated_uaid = await UAIDService.generate_uaid(
        db=db,
        business_type=payload.business_type,
        business_name=payload.trade_name or payload.legal_name
    )

    # Geocode address components to lat/long coordinates
    coords = await MapsService.geocode_address(
        address=payload.address,
        city=payload.city,
        district=payload.district,
        state=payload.state,
        country=payload.country,
        pin_code=payload.postal_code
    )

    new_profile = BusinessProfile(
        user_id=current_user.id,
        legal_name=payload.legal_name,
        trade_name=payload.trade_name,
        owner_name=payload.owner_name or current_user.full_name,
        business_type=payload.business_type,
        business_category=payload.business_category,
        description=payload.description,
        email=payload.email or current_user.email,
        mobile=payload.mobile or current_user.phone,
        country=payload.country,
        state=payload.state,
        district=payload.district,
        city=payload.city,
        postal_code=payload.postal_code,
        address=payload.address,
        latitude=coords.get("latitude"),
        longitude=coords.get("longitude"),
        gst_number=payload.gst_number.upper() if payload.gst_number else None,
        gst_status=payload.gst_status,
        pan=payload.pan.upper() if payload.pan else None,
        bank_account_number=payload.bank_account_number,
        bank_ifsc=payload.bank_ifsc.upper() if payload.bank_ifsc else None,
        virtual_escrow_account_id=generated_uaid,
        verification_status=BusinessVerificationStatus.SUBMITTED,
        kyc_status=KYCStatus.SUBMITTED,
        tier=VerificationTier.STANDARD,
        rating=5.0,
        terms_version_accepted=payload.terms_version_accepted,
        terms_accepted_at=datetime.now(timezone.utc)
    )
    db.add(new_profile)

    # Elevate user role
    current_user.role = RoleEnum.BUSINESS_OWNER
    await db.commit()
    await db.refresh(new_profile)

    # Attach uaid attribute for response serialization
    new_profile.uaid = generated_uaid

    # Dispatch welcome & registration confirmation email
    if new_profile.email:
        try:
            await NotificationService.send_business_registered(
                to_email=new_profile.email,
                business_name=new_profile.trade_name or new_profile.legal_name,
                owner_name=new_profile.owner_name or current_user.full_name or "Partner"
            )
        except Exception:
            pass

    return new_profile

@router.get("/my-business", response_model=BusinessOut, summary="Get active business owner profile")
@router.get("/me", response_model=BusinessOut, summary="Get active business owner profile (Legacy alias)")
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

@router.put("/my-business", response_model=BusinessOut, summary="Update business profile details")
@router.patch("/me", response_model=BusinessOut, summary="Update business profile details (Standard REST)")
@router.put("/me", response_model=BusinessOut, summary="Update business profile details (Standard REST alias)")
async def update_my_business(
    payload: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Business profile not found.")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, val)

    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.get("/me/orders", summary="Get orders received by business")
async def get_my_business_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business profile not found.")

    from sqlalchemy.orm import selectinload
    orders_stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.business_id == biz.id)
        .order_by(Order.created_at.desc())
    )
    ores = await db.execute(orders_stmt)
    return ores.scalars().all()

@router.get("/me/transactions", summary="Get business settlements & financial transactions")
async def get_my_business_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business profile not found.")

    settle_stmt = (
        select(Settlement)
        .where(Settlement.business_id == biz.id)
        .order_by(Settlement.created_at.desc())
    )
    sres = await db.execute(settle_stmt)
    return sres.scalars().all()

@router.post("/me/products", summary="Create product for current business")
async def create_my_business_product(
    from_endpoints_products = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    pass


@router.get("/dashboard/summary", response_model=BusinessDashboardSummary, summary="Business Dashboard Summary & Financial Breakdown (Stitch Screen 7)")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns KPIs for Stitch Business Dashboard:
    Total listings, active listings, order counts, gross sales, category platform fees (3.20% - 8.20%), net settlement.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="No business profile found for this user.")

    # Calculate listings
    prod_stmt = select(func.count(Product.id)).where(Product.business_id == biz.id)
    total_listings = (await db.execute(prod_stmt)).scalar() or 0

    active_stmt = select(func.count(Product.id)).where(Product.business_id == biz.id, Product.is_active == True)
    active_listings = (await db.execute(active_stmt)).scalar() or 0

    # Calculate orders
    orders_stmt = select(func.count(Order.id)).where(Order.business_id == biz.id)
    orders_count = (await db.execute(orders_stmt)).scalar() or 0

    # Calculate settlements & gross sales
    settle_stmt = select(Settlement).where(Settlement.business_id == biz.id)
    sres = await db.execute(settle_stmt)
    settlements = sres.scalars().all()

    gross_sales = sum(s.gross_amount for s in settlements)
    platform_fees = sum(s.platform_fee_amount for s in settlements)
    net_settlement = sum(s.net_settlement_amount for s in settlements)
    successful_txs = len(settlements)

    metrics = BusinessDashboardMetrics(
        total_listings=total_listings,
        active_listings=active_listings,
        orders=orders_count,
        successful_transactions=successful_txs,
        gross_sales=round(gross_sales, 2),
        platform_fees=round(platform_fees, 2),
        net_settlement=round(net_settlement, 2)
    )

    return BusinessDashboardSummary(
        business=biz,
        metrics=metrics
    )

@router.get("/{id}/public-profile", response_model=PublicBusinessProfile, summary="Get sanitized public business profile")
async def get_public_profile(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.id == id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found.")
    return biz

@router.get("/profile", response_model=BusinessOut, summary="Get own private profile")
async def get_own_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="No profile found for current user.")
    biz.uaid = biz.virtual_escrow_account_id
    return biz

@router.get("/profile/{target_user_id}", response_model=BusinessOut, summary="Get private profile with strict privacy isolation")
async def get_private_profile_by_id(
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Enforces strict privacy invariant (Section 27 & 71):
    Merchant A can NEVER access Merchant B's private profile.
    Returns 403 Forbidden if an unauthorized user requests another user's private data.
    """
    if target_user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot access another user's private profile."
        )

    stmt = select(BusinessProfile).where(BusinessProfile.user_id == target_user_id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business profile not found.")
    biz.uaid = biz.virtual_escrow_account_id
    return biz

