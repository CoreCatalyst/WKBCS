from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, field_validator, ConfigDict

# Media limits enforced server-side
MINIMUM_PRODUCT_IMAGES = 4
MAXIMUM_PRODUCT_IMAGES = 10
MAXIMUM_PRODUCT_VIDEOS = 2

class TieredPriceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    min_quantity: int
    max_quantity: Optional[int] = None
    unit_price: float

class ProductCreate(BaseModel):
    """
    Schema for creating a new product or service listing.
    Enforces 4-10 images and max 2 videos.
    """
    type: Optional[str] = "PRODUCT"  # "PRODUCT" | "SERVICE"
    title: str
    description: str
    category: str
    subcategory: Optional[str] = None
    sku: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = 18.0
    base_price: float
    unit: Optional[str] = "piece"
    currency: Optional[str] = "INR"
    moq: int = 1
    stock_quantity: int = 100
    is_draft: bool = False             # If True, skip image count checks
    images: List[str]                  # Required: 4 to 10 images
    videos: Optional[List[str]] = []   # Optional: max 2 videos
    specifications: Optional[Dict[str, Any]] = {}
    tiered_prices: Optional[List[TieredPriceSchema]] = []
    shipping_preferences: Optional[Dict[str, Any]] = {}

    @field_validator("images")
    @classmethod
    def validate_image_limits(cls, v: List[str], info) -> List[str]:
        clean = [url.strip() for url in v if url and url.strip()]
        is_draft = False
        if info and hasattr(info, "data") and info.data:
            is_draft = info.data.get("is_draft", False)

        if not is_draft and len(clean) < MINIMUM_PRODUCT_IMAGES:
            raise ValueError(
                f"A minimum of {MINIMUM_PRODUCT_IMAGES} images are required to submit a listing. "
                f"Received {len(clean)}. To save as a draft, set is_draft=true."
            )
        if len(clean) > MAXIMUM_PRODUCT_IMAGES:
            raise ValueError(
                f"A maximum of {MAXIMUM_PRODUCT_IMAGES} images are allowed per listing. "
                f"Received {len(clean)}."
            )
        return clean

    @field_validator("videos")
    @classmethod
    def validate_video_limits(cls, v: Optional[List[str]]) -> List[str]:
        if not v:
            return []
        clean = [url.strip() for url in v if url and url.strip()]
        if len(clean) > MAXIMUM_PRODUCT_VIDEOS:
            raise ValueError(
                f"A maximum of {MAXIMUM_PRODUCT_VIDEOS} videos are allowed per listing. "
                f"Received {len(clean)}."
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
    def validate_hsn_code(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if not v.isdigit() or len(v) not in (4, 6, 8):
            raise ValueError("HSN code must be a numeric string of 4, 6, or 8 digits.")
        return v

class ProductUpdate(BaseModel):
    """
    Schema for updating an existing product or service listing.
    Enforces 4-10 images and max 2 videos when provided.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    sku: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    base_price: Optional[float] = None
    unit: Optional[str] = None
    currency: Optional[str] = None
    moq: Optional[int] = None
    stock_quantity: Optional[int] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    tiered_prices: Optional[List[TieredPriceSchema]] = None
    shipping_preferences: Optional[Dict[str, Any]] = None
    is_draft: Optional[bool] = None

    @field_validator("images")
    @classmethod
    def validate_image_limits(cls, v: Optional[List[str]], info) -> Optional[List[str]]:
        if v is None:
            return None
        clean = [url.strip() for url in v if url and url.strip()]
        is_draft = False
        if info and hasattr(info, "data") and info.data:
            is_draft = info.data.get("is_draft", False)

        if not is_draft and len(clean) < MINIMUM_PRODUCT_IMAGES:
            raise ValueError(
                f"A minimum of {MINIMUM_PRODUCT_IMAGES} images are required for active listings. "
                f"Received {len(clean)}."
            )
        if len(clean) > MAXIMUM_PRODUCT_IMAGES:
            raise ValueError(
                f"A maximum of {MAXIMUM_PRODUCT_IMAGES} images are allowed per listing. "
                f"Received {len(clean)}."
            )
        return clean

    @field_validator("videos")
    @classmethod
    def validate_video_limits(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        clean = [url.strip() for url in v if url and url.strip()]
        if len(clean) > MAXIMUM_PRODUCT_VIDEOS:
            raise ValueError(
                f"A maximum of {MAXIMUM_PRODUCT_VIDEOS} videos are allowed per listing. "
                f"Received {len(clean)}."
            )
        return clean


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    business_id: str
    type: Optional[str] = "PRODUCT"
    title: str
    slug: str
    description: str
    category: str
    unit: Optional[str] = "piece"
    status: Optional[str] = "DRAFT"
    hsn_code: Optional[str] = None
    gst_rate: float
    base_price: float
    moq: int
    stock_quantity: int
    images: List[str]
    videos: Optional[List[str]] = []
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
