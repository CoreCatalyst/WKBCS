from fastapi import APIRouter, Query
from app.api.v1.endpoints import (
    auth,
    businesses,
    products,
    orders,
    escrow,
    settlements,
    payments,
    network,
    rewards,
    referrals,
    kyc,
    localization,
    admin,
    health,
    qr,
    fees,
    marketplace
)
from app.schemas.network import RewardRulesResponse
from app.services.network_service import network_service

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & OTP"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["Marketplace (Products, Services, Categories, Search)"])
api_router.include_router(businesses.router, prefix="/businesses", tags=["Business Profiles & Dashboard"])
api_router.include_router(businesses.router, prefix="/business", tags=["Business Legacy Alias"])
api_router.include_router(products.router, prefix="/products", tags=["Listings & Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & Invoicing"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payment Gateways (Razorpay & Cashfree)"])
api_router.include_router(settlements.router, prefix="/settlements", tags=["Business Settlements & Fee Ledger"])
api_router.include_router(network.router, prefix="/network", tags=["Network Progress & 120-Level Tracker"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["Referral Rewards & Rank Completion Ledger"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["NRY Referral System & Network"])
api_router.include_router(kyc.router, prefix="/kyc", tags=["KYC & Verification"])
api_router.include_router(localization.router, prefix="/localization", tags=["Countries, Languages & Routing"])
api_router.include_router(localization.router, prefix="/locations", tags=["Locations Hierarchy"])
api_router.include_router(escrow.router, prefix="/escrow", tags=["B2B Escrow Engine"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & System Audit"])
api_router.include_router(qr.router, prefix="/qr", tags=["QR Code Generation & Verification"])
api_router.include_router(fees.router, prefix="/platform-fees", tags=["Noryvanta Platform Fees"])

@api_router.get("/reward-rules", response_model=RewardRulesResponse, tags=["Reward Rules Engine"])
async def get_root_reward_rules(
    business_type: str = Query("WHOLESALER", description="Business type: WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER")
):
    """
    Returns configured 12 rank rules, multipliers, rates, and benchmark reward amounts.
    """
    return await network_service.get_reward_rules_for_type(business_type=business_type)
