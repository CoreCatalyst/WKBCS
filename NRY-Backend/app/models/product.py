import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class ListingType(str, Enum):
    PRODUCT = "PRODUCT"
    SERVICE = "SERVICE"

class ListingStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    # Backwards-compatible aliases
    PUBLISHED = "PUBLISHED"
    PENDING_REVIEW = "PENDING_REVIEW"


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False)
    type = Column(SQLEnum(ListingType), default=ListingType.PRODUCT, nullable=False)
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    short_description = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    subcategory = Column(String(100), nullable=True)
    keywords = Column(JSON, default=list, nullable=False)
    
    # Pricing & Currency
    currency = Column(String(10), default="INR", nullable=False)
    base_price = Column(Float, nullable=False)
    unit = Column(String(50), default="piece", nullable=False)
    
    # Regulatory & Tax
    hsn_code = Column(String(10), nullable=True)
    gst_rate = Column(Float, default=18.0, nullable=False)
    
    # Inventory & Fulfillment
    moq = Column(Integer, default=1, nullable=False)
    stock_quantity = Column(Integer, default=100, nullable=False)
    availability = Column(String(50), default="IN_STOCK", nullable=False)
    
    # State & Verification
    status = Column(SQLEnum(ListingStatus), default=ListingStatus.DRAFT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Media & Specs
    images = Column(JSON, default=list)  # URLs for quick access (4-10 images)
    videos = Column(JSON, default=list)  # URLs for optional videos (max 2)
    specifications = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("BusinessProfile", back_populates="products")
    tiered_prices = relationship("TieredPrice", back_populates="product", cascade="all, delete-orphan")
    listing_images = relationship("ListingImage", back_populates="product", cascade="all, delete-orphan")

class MediaProcessingStatus(str, Enum):
    PENDING_UPLOAD = "PENDING_UPLOAD"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class ListingImage(Base):
    __tablename__ = "listing_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    listing_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    storage_key = Column(String(500), nullable=False)
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    thumbnail_key = Column(String(500), nullable=True)
    media_type = Column(String(20), default="image", nullable=False)  # "image" | "video"
    status = Column(String(50), default="READY", nullable=False)      # PENDING_UPLOAD, UPLOADED, PROCESSING, READY, FAILED
    is_primary = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)                            # Current / optimized size in bytes
    original_size = Column(Integer, nullable=True)                    # Original pre-optimization size
    optimized_size = Column(Integer, nullable=True)                   # Final optimized size
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)                   # Video duration
    processing_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="listing_images")

class TieredPrice(Base):
    __tablename__ = "tiered_prices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    min_quantity = Column(Integer, nullable=False)
    max_quantity = Column(Integer, nullable=True)  # None indicates infinity
    unit_price = Column(Float, nullable=False)

    product = relationship("Product", back_populates="tiered_prices")
