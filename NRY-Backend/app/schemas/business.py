from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class BusinessRegister(BaseModel):
    legal_name: str
    trade_name: str
    owner_name: Optional[str] = None
    business_type: str = "Retailer"  # Wholesaler, Distributor, Retailer, Service Provider
    business_classification: Optional[str] = "STANDARD_PRODUCT_BUSINESS"  # SKILLED_SMALL_SCALE_HOME_SERVICE, REGISTERED_SERVICE_BUSINESS
    business_category: str = "General Commerce"
    description: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    country: str = "India"
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gst_number: Optional[str] = None
    gst_status: str = "REGISTERED"
    pan: Optional[str] = None
    tan: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    terms_version_accepted: Optional[str] = "v1.0-2026"

class BusinessUpdate(BaseModel):
    trade_name: Optional[str] = None
    description: Optional[str] = None
    business_category: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    logo: Optional[str] = None

class BusinessOut(BaseModel):
    id: str
    user_id: str
    legal_name: str
    trade_name: str
    owner_name: Optional[str] = None
    business_type: str
    business_category: str
    primary_category: Optional[str] = None
    description: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    country: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    gstin: Optional[str] = None
    gst_status: str
    pan: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    virtual_escrow_account_id: Optional[str] = None
    uaid: Optional[str] = None
    verification_status: str
    kyc_status: str
    tier: str
    rating: float = 5.0
    total_sales_volume: float = 0.0
    logo: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PublicBusinessProfile(BaseModel):
    id: str
    trade_name: str
    business_type: str
    business_category: str
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str
    verification_status: str
    kyc_status: str
    tier: str
    rating: float
    logo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BusinessDashboardMetrics(BaseModel):
    total_listings: int = 0
    active_listings: int = 0
    orders: int = 0
    successful_transactions: int = 0
    gross_sales: float = 0.0
    platform_fees: float = 0.0
    net_settlement: float = 0.0

class BusinessDashboardSummary(BaseModel):
    business: BusinessOut
    metrics: BusinessDashboardMetrics
