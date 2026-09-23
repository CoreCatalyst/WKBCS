import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), index=True, nullable=False)
    hsn_code = Column(String(10), nullable=False)
    gst_rate = Column(Float, default=18.0, nullable=False)
    base_price = Column(Float, nullable=False)
    moq = Column(Integer, default=1, nullable=False)
    stock_quantity = Column(Integer, default=100, nullable=False)
    images = Column(JSON, default=list)
    specifications = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("BusinessProfile", back_populates="products")
    tiered_prices = relationship("TieredPrice", back_populates="product", cascade="all, delete-orphan")

class TieredPrice(Base):
    __tablename__ = "tiered_prices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    min_quantity = Column(Integer, nullable=False)
    max_quantity = Column(Integer, nullable=True)  # None indicates upper bound infinity
    unit_price = Column(Float, nullable=False)

    product = relationship("Product", back_populates="tiered_prices")
