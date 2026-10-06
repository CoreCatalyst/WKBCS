import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RoleEnum(str, Enum):
    CUSTOMER = "CUSTOMER"
    BUYER = "BUYER"
    BUSINESS_OWNER = "BUSINESS_OWNER"
    VENDOR = "VENDOR"
    BUSINESS_STAFF = "BUSINESS_STAFF"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    SUPPORT = "SUPPORT"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    uaid = Column(String(30), unique=True, index=True, nullable=True)  # e.g., NRY-A100 or NRY-XXXX
    phone = Column(String(20), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    business_profile = relationship("BusinessProfile", back_populates="user", uselist=False)
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    network_member = relationship("NetworkMember", back_populates="user", uselist=False)

class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    identifier = Column(String(255), index=True, nullable=False)  # Phone or email
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash = Column(String(255), nullable=False)
    device_info = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="sessions")
