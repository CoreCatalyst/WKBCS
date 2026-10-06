from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.product import TieredPriceSchema

class PublicMerchantOut(BaseModel):
    """
    Public marketplace merchant profile.
    STRICT PRIVACY GUARANTEE: Never exposes bank account numbers, IFSC, PAN,
    virtual escrow accounts, or private tax identifiers to public customers.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    trade_name: str
    legal_name: Optional[str] = None
    business_type: str
    business_category: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    rating: float = 5.0
    is_verified: bool = False
    logo: Optional[str] = None

class MarketplaceListingOut(BaseModel):
    """
    Public marketplace listing for Products and Services.
    Consumable by Web, Mobile, Android, iOS, and Admin clients.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    type: str  # "PRODUCT" | "SERVICE"
    title: str
    slug: str
    short_description: Optional[str] = None
    description: str
    category: str
    subcategory: Optional[str] = None
    currency: str = "INR"
    base_price: float
    unit: str = "piece"
    hsn_code: Optional[str] = None
    gst_rate: float = 18.0
    moq: int = 1
    stock_quantity: int = 100
    availability: str = "IN_STOCK"
    status: str = "ACTIVE"
    images: List[str] = []
    specifications: Dict[str, Any] = {}
    tiered_prices: List[TieredPriceSchema] = []
    created_at: datetime
    merchant: Optional[PublicMerchantOut] = None
    shipping_info: Optional[Dict[str, Any]] = None

class MarketplaceCategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    icon_name: str
    product_count: int
    service_count: int
    total_listings: int

class MarketplaceFeaturedResponse(BaseModel):
    products: List[MarketplaceListingOut]
    services: List[MarketplaceListingOut]

class MarketplaceSearchResponse(BaseModel):
    items: List[MarketplaceListingOut]
    total: int
    product_count: int
    service_count: int
    page: int = 1
    limit: int = 50
