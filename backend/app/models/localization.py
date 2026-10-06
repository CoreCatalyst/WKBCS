import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Float
from app.core.database import Base

class CountryConfig(Base):
    __tablename__ = "country_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(10), unique=True, index=True, nullable=False)  # IN, US, GB, AE, SG, AU, CA
    name = Column(String(100), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    phone_code = Column(String(10), default="+91", nullable=False)
    flag_emoji = Column(String(10), default="🇮🇳", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    cod_enabled = Column(Boolean, default=True, nullable=False)
    cod_max_limit = Column(Float, default=10000.0, nullable=False)
    supported_gateways = Column(JSON, default=lambda: ["RAZORPAY", "CASHFREE"], nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class LanguageConfig(Base):
    __tablename__ = "language_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(10), unique=True, index=True, nullable=False)  # en, hi, mr, bn, ta, te, gu, kn, ml, pa
    name = Column(String(100), nullable=False)
    native_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class GatewayConfig(Base):
    __tablename__ = "gateway_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gateway_name = Column(String(50), unique=True, index=True, nullable=False)  # RAZORPAY, CASHFREE
    display_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    priority = Column(String(10), default="PRIMARY", nullable=False)  # PRIMARY, SECONDARY
    supported_methods = Column(JSON, default=lambda: ["UPI", "CARD", "NETBANKING", "WALLET"], nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
