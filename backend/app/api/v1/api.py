from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    businesses,
    products,
    orders,
    escrow,
    admin,
    health
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & OTP"])
api_router.include_router(businesses.router, prefix="/businesses", tags=["Business & Vendor KYC"])
api_router.include_router(products.router, prefix="/products", tags=["Products & AI Assistant"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders & Invoicing"])
api_router.include_router(escrow.router, prefix="/escrow", tags=["B2B Escrow Engine"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin & Platform Fees"])
