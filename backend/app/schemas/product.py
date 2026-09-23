from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, field_validator, ConfigDict

# Minimum images required to publish a product listing.
# This is a BUSINESS RULE enforced server-side — frontend validation alone is insufficient.
MINIMUM_PRODUCT_IMAGES = 6


class TieredPriceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    min_quantity: int
    max_quantity: Optional[int] = None
    unit_price: float


class ProductCreate(BaseModel):
    """
    Schema for creating a new product listing.
    IMPORTANT: At least 6 image URLs are required before a listing can be published.
    This rule is enforced at the API layer — not just the frontend.
    """
    title: str
    description: str
    category: str
    hsn_code: str
    gst_rate: Optional[float] = 18.0
    base_price: float
    moq: int = 1
    stock_quantity: int = 100
    images: List[str]           # Required, not optional — must supply at least 6
    specifications: Optional[Dict[str, Any]] = {}
    tiered_prices: Optional[List[TieredPriceSchema]] = []
    is_draft: bool = False      # If True, skip the 6-image minimum (allow saving drafts)

    @field_validator("images")
    @classmethod
    def validate_minimum_images(cls, v: List[str], info) -> List[str]:
        """
        Enforce the Noryvanta minimum 6-image policy.
        Draft listings are exempt to allow saving incomplete work-in-progress.
        """
        # Strip empty strings
        clean = [url.strip() for url in v if url and url.strip()]

        # Get is_draft value from sibling fields (available in model_fields_set after v2 validator)
        # We check via info.data if available
        is_draft = False
        if info and hasattr(info, "data") and info.data:
            is_draft = info.data.get("is_draft", False)

        if not is_draft and len(clean) < MINIMUM_PRODUCT_IMAGES:
            raise ValueError(
                f"A minimum of {MINIMUM_PRODUCT_IMAGES} product images are required to publish a listing. "
                f"Received {len(clean)}. "
                f"To save as a draft without images, set is_draft=true."
            )
        return clean

    @field_validator("base_price")
    @classmethod
    def validate_base_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Base price must be greater than zero.")
        return round(v, 2)

    @field_validator("moq")
    @classmethod
    def validate_moq(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Minimum order quantity must be at least 1.")
        return v

    @field_validator("hsn_code")
    @classmethod
    def validate_hsn_code(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) not in (4, 6, 8):
            raise ValueError("HSN code must be a numeric string of 4, 6, or 8 digits.")
        return v


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    title: str
    slug: str
    description: str
    category: str
    hsn_code: str
    gst_rate: float
    base_price: float
    moq: int
    stock_quantity: int
    images: List[str]
    specifications: Dict[str, Any]
    is_active: bool
    created_at: datetime
    tiered_prices: List[TieredPriceSchema] = []


class AIListingRequest(BaseModel):
    raw_title: str
    category_hint: Optional[str] = None
    features: Optional[List[str]] = []


class AIListingResponse(BaseModel):
    optimized_title: str
    suggested_hsn: str
    gst_rate_percent: float
    seo_description: str
    suggested_tags: List[str]
    suggested_tiers: List[TieredPriceSchema]
