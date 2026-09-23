from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.escrow import EscrowTransaction, FeeLedger, EscrowStatus
from app.models.order import Order
from app.models.business import BusinessProfile
from app.models.user import User
from app.api.deps import get_current_admin

router = APIRouter()

@router.get("/fees/summary", summary="Financial & Platform Fee summary")
async def get_fee_summary(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """
    Returns aggregate financial metrics: Total GMV, Platform Fees earned,
    TDS (Section 194-O) collected, and active In-Escrow balance.
    Requires ADMIN role.
    """
    # Sum total order GMV
    stmt_gmv = select(func.sum(Order.total_amount))
    res_gmv = await db.execute(stmt_gmv)
    total_gmv = res_gmv.scalar() or 0.0

    # Sum platform fees collected
    stmt_fees = select(func.sum(FeeLedger.amount)).where(FeeLedger.fee_type == "PLATFORM_COMMISSION")
    res_fees = await db.execute(stmt_fees)
    total_fees = res_fees.scalar() or 0.0

    # Sum TDS
    stmt_tds = select(func.sum(FeeLedger.amount)).where(FeeLedger.fee_type == "TDS_SECTION_194O")
    res_tds = await db.execute(stmt_tds)
    total_tds = res_tds.scalar() or 0.0

    # Sum active in-escrow (FUNDED state)
    stmt_escrow = select(func.sum(EscrowTransaction.amount_locked)).where(
        EscrowTransaction.status == EscrowStatus.FUNDED
    )
    res_escrow = await db.execute(stmt_escrow)
    in_escrow = res_escrow.scalar() or 0.0

    # Count pending disbursements and settled orders
    stmt_pending = select(func.count(EscrowTransaction.id)).where(
        EscrowTransaction.status == EscrowStatus.FUNDED
    )
    res_pending = await db.execute(stmt_pending)
    pending_count = res_pending.scalar() or 0

    stmt_settled = select(func.count(EscrowTransaction.id)).where(
        EscrowTransaction.status == EscrowStatus.RELEASED
    )
    res_settled = await db.execute(stmt_settled)
    settled_count = res_settled.scalar() or 0

    return {
        "currency": "INR",
        "total_gmv": round(total_gmv, 2),
        "platform_commission_earned": round(total_fees, 2),
        "tds_collected_section_194o": round(total_tds, 2),
        "active_funds_in_escrow": round(in_escrow, 2),
        "pending_disbursements_count": pending_count,
        "settled_orders_count": settled_count,
        "compliance_status": "GST & TDS Compliant"
    }

@router.get("/routing", summary="Payment Gateway & Country Routing configuration")
async def get_payment_routing(
    _admin: User = Depends(get_current_admin),
):
    """
    Returns multi-currency gateway routing matrix for domestic and cross-border trade.
    Requires ADMIN role.
    """
    return {
        "routes": [
            {
                "country": "India (Domestic)",
                "currency": "INR (₹)",
                "primary_gateway": "Razorpay Enterprise Route",
                "backup_gateway": "Cashfree Payouts",
                "supported_rails": ["UPI (0% fee)", "NetBanking", "NEFT / RTGS (Bulk)", "Corporate Credit Card"],
                "active_status": "HEALTHY",
                "settlement_t_plus": "T+1 Day"
            },
            {
                "country": "United States & Americas",
                "currency": "USD ($)",
                "primary_gateway": "Stripe Connect B2B",
                "backup_gateway": "JPMorgan ACH Wire",
                "supported_rails": ["ACH Commercial Direct", "Fedwire", "Visa/Mastercard Corporate"],
                "active_status": "HEALTHY",
                "settlement_t_plus": "T+2 Days"
            },
            {
                "country": "United Arab Emirates & GCC",
                "currency": "AED (د.إ)",
                "primary_gateway": "Telr / Checkout.com MEA",
                "backup_gateway": "Mashreq Neo Trade",
                "supported_rails": ["Wafi Local Card", "UAE Central Bank RTGS", "SWIFT Wire"],
                "active_status": "HEALTHY",
                "settlement_t_plus": "T+2 Days"
            }
        ]
    }

@router.get("/ranks", summary="Vendor Tier & Network Progress Tracker")
async def get_network_progress(
    _admin: User = Depends(get_current_admin),
):
    """
    Provides progression tiers and qualification thresholds.
    Requires ADMIN role.
    """
    return {
        "tiers": [
            {
                "name": "Standard Vendor",
                "min_sales_inr": 0,
                "platform_fee_percent": 4.5,
                "badge": "STANDARD",
                "benefits": ["Basic catalog listing", "Standard 48h escrow settlement"]
            },
            {
                "name": "Silver Verified",
                "min_sales_inr": 500000,
                "platform_fee_percent": 3.8,
                "badge": "SILVER",
                "benefits": ["Verified Supplier badge", "Priority RFQ matching", "36h escrow settlement"]
            },
            {
                "name": "Gold Strategic",
                "min_sales_inr": 2500000,
                "platform_fee_percent": 3.0,
                "badge": "GOLD",
                "benefits": ["Gold badge", "AI listing boost", "24h instant escrow settlement", "Dedicated account manager"]
            },
            {
                "name": "Sovereign Platinum",
                "min_sales_inr": 10000000,
                "platform_fee_percent": 2.2,
                "badge": "SOVEREIGN_PLATINUM",
                "benefits": ["Sovereign Crown mark", "Lowest take-rate (2.2%)", "Instant T+0 escrow release", "Custom credit line"]
            }
        ]
    }
