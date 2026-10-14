import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.config import settings
from app.models.escrow import (
    EscrowTransaction,
    FeeLedger,
    EscrowStatus,
    Settlement,
    FinancialLedger,
    PlatformFeeConfig
)
from app.models.order import Order
from app.models.business import BusinessProfile, BusinessVerificationStatus
from app.models.network import (
    NetworkMember,
    NetworkLevelRecord,
    NetworkLevelStatus,
    LevelStatusHistory
)
from app.models.audit import AuditLog
from app.models.user import User
from app.api.deps import get_current_admin
from app.schemas.escrow import PlatformFeeConfigOut, PlatformFeeConfigUpdate, FinancialLedgerOut
from app.schemas.business import BusinessOut
from app.schemas.auth import AdminUserProvisionRequest
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/users/provision", summary="Authorized administrative user provisioning")
async def provision_admin(
    payload: AdminUserProvisionRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Explicitly authorized server-side administrative user provisioning.
    Requires existing ADMIN privileges.
    """
    identifier = (payload.email or payload.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Identifier (email or phone) is required.")

    user = await AuthService.provision_admin_user(
        db=db,
        identifier=identifier,
        full_name=payload.full_name,
        role=payload.role
    )
    return {
        "success": True,
        "message": f"Administrative user '{user.full_name}' provisioned successfully with role {user.role.value}.",
        "user_id": user.id,
        "role": user.role.value,
        "email": user.email,
        "phone": user.phone
    }

@router.get("/fees/summary", summary="Financial & Platform Fee summary (Stitch Screen 11)")
async def get_fee_summary(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Returns aggregate financial metrics: Total GMV, Platform Fees earned,
    TDS (Section 194-O) collected, and active In-Escrow balance.
    Requires ADMIN role.
    """
    stmt_gmv = select(func.sum(Order.total_amount))
    res_gmv = await db.execute(stmt_gmv)
    total_gmv = res_gmv.scalar() or 0.0

    # Sum platform fees collected from settlements
    stmt_fees = select(func.sum(Settlement.platform_fee_amount))
    res_fees = await db.execute(stmt_fees)
    total_fees = res_fees.scalar() or 0.0

    # Sum TDS collected
    stmt_tds = select(func.sum(Settlement.tds_amount))
    res_tds = await db.execute(stmt_tds)
    total_tds = res_tds.scalar() or 0.0

    # Sum active settlements pending
    stmt_pending = select(func.sum(Settlement.net_settlement_amount)).where(
        Settlement.status == "PENDING"
    )
    res_pending = await db.execute(stmt_pending)
    pending_payouts = res_pending.scalar() or 0.0

    return {
        "currency": "INR",
        "total_gmv": round(total_gmv, 2),
        "platform_commission_earned": round(total_fees, 2),
        "platform_fee_rate_percent": settings.PLATFORM_COMMISSION_PERCENT,
        "tds_collected_section_194o": round(total_tds, 2),
        "pending_vendor_payouts": round(pending_payouts, 2),
        "compliance_status": "GST & Section 194-O TDS Compliant"
    }

@router.get("/fees/config", response_model=PlatformFeeConfigOut, summary="Get Active Platform Fee Configuration")
async def get_fee_config(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    stmt = select(PlatformFeeConfig).where(PlatformFeeConfig.is_active == True)
    res = await db.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        cfg = PlatformFeeConfig(
            fee_type="PERCENTAGE",
            rate_percentage=settings.PLATFORM_COMMISSION_PERCENT,
            fixed_amount=0.0,
            is_active=True,
            description="Default Noryvanta Category Business-side Platform Fee"
        )
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg

@router.put("/fees/config", response_model=PlatformFeeConfigOut, summary="Update Platform Fee Configuration (Versioned)")
async def update_fee_config(
    payload: PlatformFeeConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Deactivates previous fee config and creates a new active version.
    Historical transactions permanently retain their original rate.
    """
    stmt = select(PlatformFeeConfig).where(PlatformFeeConfig.is_active == True)
    res = await db.execute(stmt)
    existing = res.scalars().all()
    for e in existing:
        e.is_active = False

    cfg_id = str(uuid.uuid4())
    new_cfg = PlatformFeeConfig(
        id=cfg_id,
        fee_type=payload.fee_type or "PERCENTAGE",
        rate_percentage=payload.rate_percentage,
        fixed_amount=payload.fixed_amount or 0.0,
        is_active=True,
        description=payload.description or f"Noryvanta {payload.rate_percentage}% Platform Fee (Updated)"
    )
    db.add(new_cfg)

    # Log audit entry
    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action="UPDATE_PLATFORM_FEE_CONFIG",
        entity_type="PLATFORM_FEE",
        entity_id=cfg_id,
        new_values={"rate": payload.rate_percentage}
    ))

    await db.commit()
    await db.refresh(new_cfg)
    return new_cfg

@router.get("/ledger", response_model=List[FinancialLedgerOut], summary="Auditable Financial Ledger (Section Q)")
async def get_financial_ledger(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    stmt = select(FinancialLedger).order_by(FinancialLedger.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/businesses", response_model=List[BusinessOut], summary="List All Businesses for Admin Verification")
async def list_businesses(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    stmt = select(BusinessProfile)
    if status_filter:
        stmt = stmt.where(BusinessProfile.verification_status == status_filter)
    stmt = stmt.order_by(BusinessProfile.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/businesses/{id}/verify", response_model=BusinessOut, summary="Verify or Reject Business Profile")
async def verify_business(
    id: str,
    action: str = Query(..., pattern="^(APPROVE|REJECT|SUSPEND)$"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    stmt = select(BusinessProfile).where(BusinessProfile.id == id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found.")

    old_status = biz.verification_status.value
    if action == "APPROVE":
        biz.verification_status = BusinessVerificationStatus.VERIFIED
    elif action == "REJECT":
        biz.verification_status = BusinessVerificationStatus.REJECTED
    elif action == "SUSPEND":
        biz.verification_status = BusinessVerificationStatus.SUSPENDED

    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action=f"BUSINESS_VERIFICATION_{action}",
        entity_type="BUSINESS",
        entity_id=biz.id,
        old_values={"status": old_status},
        new_values={"status": biz.verification_status.value}
    ))

    await db.commit()
    await db.refresh(biz)
    return biz

@router.post("/network/transition", summary="Authorize Network Level State Transition or Reversal")
async def admin_transition_level(
    member_uaid: str,
    level_number: int,
    new_status: str,
    reason: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Enforces server-side authority:
    Only authorized administrative processes can promote to QUALIFIED, REWARD_APPROVED, or execute REVERSED.
    """
    stmt = select(NetworkMember).where(NetworkMember.uaid == member_uaid)
    res = await db.execute(stmt)
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Network member not found.")

    from app.services.network_service import network_service
    status_enum = NetworkLevelStatus(new_status)
    record = await network_service.transition_level_status(
        member_id=member.id,
        level_number=level_number,
        new_status=status_enum,
        reason=reason,
        performed_by=_admin.id,
        reference_id=f"ADMIN-ACTION-{_admin.id[:8]}",
        db=db
    )

    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action=f"NETWORK_LEVEL_TRANSITION_{new_status}",
        entity_type="NETWORK_LEVEL",
        entity_id=record.id,
        new_values={"level": level_number, "status": new_status, "reason": reason}
    ))
    await db.commit()

    return {
        "success": True,
        "level_number": record.level_number,
        "new_status": record.status.value,
        "updated_at": record.updated_at
    }

@router.get("/audit-logs", summary="Centralized System Audit Logs (Section AD)")
async def get_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/routing", summary="Payment Gateway & Country Routing configuration (Stitch Screen 12)")
async def get_payment_routing(
    _admin: User = Depends(get_current_admin),
):
    return {
        "routes": [
            {
                "country": "India (Domestic)",
                "currency": "INR (₹)",
                "primary_gateway": "Razorpay Enterprise Route",
                "backup_gateway": "Cashfree Payouts",
                "supported_rails": ["UPI (0% fee)", "NetBanking", "Corporate Cards", "COD"],
                "active_status": "HEALTHY",
                "settlement_t_plus": "T+1 Day"
            },
            {
                "country": "International (Cross-Border)",
                "currency": "USD, EUR, GBP, AED, SGD",
                "primary_gateway": "Razorpay Global Route",
                "backup_gateway": "Cashfree Cross-Border",
                "supported_rails": ["International Credit Card", "Wire Transfer"],
                "active_status": "HEALTHY",
                "settlement_t_plus": "T+2 Days"
            }
        ]
    }

@router.get("/uaid/logs", summary="UAID Generation & Duplicate Attempt Audit Log (Rule 1 & 9)")
async def get_uaid_generation_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.network import UAIDGenerationLog
    stmt = select(UAIDGenerationLog).order_by(UAIDGenerationLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/quarterly-activity/{user_id}", summary="Quarterly Purchase Compliance Audit (Rule 2, 7 & 9)")
async def get_user_quarterly_activity(
    user_id: str,
    year: int = 2026,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.services.quarterly_activity_service import quarterly_service
    return await quarterly_service.get_annual_quarterly_status(
        user_id=user_id,
        calendar_year=year,
        db=db
    )

@router.post("/uaid/block", summary="Block UAID for Non-Compliance (Rule 2 Failure Rule)")
async def admin_block_uaid(
    user_id: str,
    reason: str = "Quarterly purchase requirement failure",
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.services.quarterly_activity_service import quarterly_service
    success = await quarterly_service.block_uaid(user_id=user_id, reason=reason, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="User network profile not found.")
    return {"status": "SUCCESS", "message": f"UAID blocked: {reason}. Historical records preserved."}

@router.post("/uaid/reactivate", summary="Reactivate Blocked UAID without New UAID Generation (Rule 2 & 9)")
async def admin_reactivate_uaid(
    user_id: str,
    reason: str = "Authorized compliance review completed",
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.services.quarterly_activity_service import quarterly_service
    success = await quarterly_service.reactivate_uaid(user_id=user_id, reason=reason, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="User network profile not found.")
    return {"status": "SUCCESS", "message": f"UAID reactivated: {reason}. Existing UAID unchanged."}

@router.get("/quarterly-activity/progressive/{user_id}", summary="Progressive Lifecycle Status (Warning/Grace/Block)")
async def get_progressive_status(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.services.quarterly_activity_service import quarterly_service
    return await quarterly_service.evaluate_progressive_account_status(user_id=user_id, db=db)

@router.get("/anti-abuse/{user_id}", summary="Anti-Abuse Audit Trail Summary")
async def get_anti_abuse_audit(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.services.quarterly_activity_service import quarterly_service
    return await quarterly_service.get_anti_abuse_audit_summary(user_id=user_id, db=db)

@router.get("/reactivation-audits", summary="UAID Reactivation Audit Log")
async def get_reactivation_audits(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.network import UAIDReactivationAudit
    stmt = select(UAIDReactivationAudit).order_by(UAIDReactivationAudit.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/reactivation-transactions", summary="All Reactivation Form & Purchase Transactions")
async def get_reactivation_transactions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.network import UAIDReactivationTransaction
    stmt = select(UAIDReactivationTransaction).order_by(UAIDReactivationTransaction.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/listings", summary="List All Listings for Admin Review")
async def list_listings_for_admin(
    status_filter: Optional[str] = Query(None, description="Filter by status: SUBMITTED, UNDER_REVIEW, ACTIVE, DRAFT, etc."),
    type_filter: Optional[str] = Query(None, description="Filter by type: PRODUCT, SERVICE"),
    limit: int = 50,
    skip: int = 0,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.product import Product
    stmt = select(Product)
    if status_filter:
        stmt = stmt.where(Product.status == status_filter)
    if type_filter:
        stmt = stmt.where(Product.type == type_filter)
    stmt = stmt.order_by(Product.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/listings/{listing_id}/review", summary="Move Listing to UNDER_REVIEW")
async def review_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.product import Product, ListingStatus
    stmt = select(Product).where(Product.id == listing_id)
    res = await db.execute(stmt)
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Listing not found.")

    old_status = prod.status.value if hasattr(prod.status, "value") else str(prod.status)
    prod.status = ListingStatus.UNDER_REVIEW
    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action="LISTING_STATUS_UNDER_REVIEW",
        entity_type="PRODUCT_LISTING",
        entity_id=prod.id,
        old_values={"status": old_status},
        new_values={"status": "UNDER_REVIEW"}
    ))
    await db.commit()
    await db.refresh(prod)
    return {"success": True, "listing_id": prod.id, "status": prod.status.value}

@router.post("/listings/{listing_id}/approve", summary="Approve and Activate Listing for Marketplace Visibility")
async def approve_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.product import Product, ListingStatus
    stmt = select(Product).where(Product.id == listing_id)
    res = await db.execute(stmt)
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Listing not found.")

    old_status = prod.status.value if hasattr(prod.status, "value") else str(prod.status)
    prod.status = ListingStatus.ACTIVE
    prod.is_active = True

    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action="LISTING_APPROVE_ACTIVE",
        entity_type="PRODUCT_LISTING",
        entity_id=prod.id,
        old_values={"status": old_status, "is_active": False},
        new_values={"status": "ACTIVE", "is_active": True}
    ))
    await db.commit()
    await db.refresh(prod)
    return {
        "success": True,
        "listing_id": prod.id,
        "title": prod.title,
        "type": prod.type.value if hasattr(prod.type, "value") else str(prod.type),
        "status": prod.status.value,
        "is_active": prod.is_active,
        "message": "Listing approved and activated. It is now live on Noryvanta Home Page and Marketplace APIs."
    }

@router.post("/listings/{listing_id}/reject", summary="Reject Listing")
async def reject_listing(
    listing_id: str,
    reason: str = Query(..., description="Reason for rejection"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.product import Product, ListingStatus
    stmt = select(Product).where(Product.id == listing_id)
    res = await db.execute(stmt)
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Listing not found.")

    old_status = prod.status.value if hasattr(prod.status, "value") else str(prod.status)
    prod.status = ListingStatus.REJECTED
    prod.is_active = False

    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action="LISTING_REJECT",
        entity_type="PRODUCT_LISTING",
        entity_id=prod.id,
        old_values={"status": old_status},
        new_values={"status": "REJECTED", "reason": reason}
    ))
    await db.commit()
    await db.refresh(prod)
    return {"success": True, "listing_id": prod.id, "status": "REJECTED", "reason": reason}

@router.post("/listings/{listing_id}/suspend", summary="Suspend Active Listing")
async def suspend_listing(
    listing_id: str,
    reason: str = Query(..., description="Reason for suspension"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.product import Product, ListingStatus
    stmt = select(Product).where(Product.id == listing_id)
    res = await db.execute(stmt)
    prod = res.scalars().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Listing not found.")

    old_status = prod.status.value if hasattr(prod.status, "value") else str(prod.status)
    prod.status = ListingStatus.SUSPENDED
    prod.is_active = False

    db.add(AuditLog(
        actor_id=_admin.id,
        actor_role="ADMIN",
        action="LISTING_SUSPEND",
        entity_type="PRODUCT_LISTING",
        entity_id=prod.id,
        old_values={"status": old_status},
        new_values={"status": "SUSPENDED", "reason": reason}
    ))
    await db.commit()
    await db.refresh(prod)
    return {"success": True, "listing_id": prod.id, "status": "SUSPENDED", "reason": reason}
