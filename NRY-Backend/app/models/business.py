import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum, ForeignKey, Boolean, JSON, Text
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base
from app.models.kyc import KYCStatus

class BusinessVerificationStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class VerificationTier(str, Enum):
    STANDARD = "STANDARD"
    SILVER = "SILVER"
    GOLD = "GOLD"
    SOVEREIGN_PLATINUM = "SOVEREIGN_PLATINUM"

class BusinessTypeEnum(str, Enum):
    MANUFACTURER = "Manufacturer"
    RETAILER = "Retailer"
    WHOLESALER = "Wholesaler"
    DISTRIBUTOR = "Distributor"
    SERVICE_PROVIDER = "Service Provider"
    REGISTERED_SERVICE_PROVIDER = "Registered Service Provider"
    HOME_SERVICE_PROVIDER = "Skilled Small-Scale Home Service Provider"
    SHOP = "Shop"
    FREELANCER = "Freelancer"
    OTHER = "Other"

class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    legal_name = Column(String(255), nullable=False)
    trade_name = Column(String(255), nullable=False)
    owner_name = Column(String(255), nullable=True)
    business_type = Column(String(100), default=BusinessTypeEnum.RETAILER.value, nullable=False)
    business_category = Column(String(100), default="General Commerce", nullable=False)
    primary_category = synonym("business_category")
    description = Column(Text, nullable=True)
    
    # Contact Information
    email = Column(String(255), nullable=True)
    mobile = Column(String(20), nullable=True)
    
    # Location Hierarchy
    country = Column(String(100), default="India", nullable=False)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Tax & Compliance (Configurable GST)
    gst_number = Column(String(15), unique=True, index=True, nullable=True)
    gstin = synonym("gst_number")
    gst_status = Column(String(50), default="REGISTERED", nullable=False)  # REGISTERED, UNREGISTERED, COMPOSITION
    pan = Column(String(10), nullable=True)

    # Banking & Escrow Settlement
    bank_account_number = Column(String(35), nullable=True)
    bank_ifsc = Column(String(11), nullable=True)
    virtual_escrow_account_id = Column(String(50), unique=True, nullable=True)

    # Statuses
    verification_status = Column(SQLEnum(BusinessVerificationStatus), default=BusinessVerificationStatus.DRAFT, nullable=False)
    kyc_status = Column(SQLEnum(KYCStatus), default=KYCStatus.PENDING_VERIFICATION, nullable=False)
    tier = Column(SQLEnum(VerificationTier), default=VerificationTier.STANDARD, nullable=False)
    rating = Column(Float, default=5.0)
    total_sales_volume = Column(Float, default=0.0)
    logo = Column(String(500), nullable=True)

    # Compliance & Terms
    terms_version_accepted = Column(String(50), default="v1.0-2026", nullable=True)
    terms_accepted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="business_profile")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    staff = relationship("BusinessStaff", back_populates="business", cascade="all, delete-orphan")

class BusinessStaff(Base):
    __tablename__ = "business_staff"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permissions = Column(JSON, default=list, nullable=False)  # e.g. ["orders.view", "products.edit"]
    status = Column(String(20), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("BusinessProfile", back_populates="staff")
