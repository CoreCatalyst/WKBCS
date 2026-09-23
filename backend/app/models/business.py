import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class KYCStatus(str, Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class VerificationTier(str, Enum):
    STANDARD = "STANDARD"
    SILVER = "SILVER"
    GOLD = "GOLD"
    SOVEREIGN_PLATINUM = "SOVEREIGN_PLATINUM"

class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    legal_name = Column(String(255), nullable=False)
    trade_name = Column(String(255), nullable=False)
    business_type = Column(String(100), nullable=False)
    gstin = Column(String(15), unique=True, index=True, nullable=False)
    pan = Column(String(10), nullable=False)
    bank_account_number = Column(String(35), nullable=False)
    bank_ifsc = Column(String(11), nullable=False)
    virtual_escrow_account_id = Column(String(50), unique=True, nullable=True)
    primary_category = Column(String(100), default="Industrial & Machinery")
    kyc_status = Column(SQLEnum(KYCStatus), default=KYCStatus.PENDING_VERIFICATION, nullable=False)
    tier = Column(SQLEnum(VerificationTier), default=VerificationTier.STANDARD, nullable=False)
    rating = Column(Float, default=5.0)
    total_sales_volume = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="business_profile")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
