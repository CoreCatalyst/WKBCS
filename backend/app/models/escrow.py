import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EscrowStatus(str, Enum):
    INITIATED = "INITIATED"
    FUNDED = "FUNDED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    RELEASED = "RELEASED"
    DISPUTED = "DISPUTED"
    REFUNDED = "REFUNDED"

class EscrowTransaction(Base):
    __tablename__ = "escrow_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), unique=True, nullable=False)
    buyer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("business_profiles.id"), nullable=False)
    amount_locked = Column(Float, nullable=False)
    platform_fee_retained = Column(Float, nullable=False)
    tds_deducted = Column(Float, default=0.0, nullable=False)
    amount_disbursed = Column(Float, default=0.0, nullable=False)
    status = Column(SQLEnum(EscrowStatus), default=EscrowStatus.INITIATED, nullable=False)
    payment_reference = Column(String(100), nullable=True)
    settlement_reference = Column(String(100), nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="escrow")
    fee_ledgers = relationship("FeeLedger", back_populates="escrow", cascade="all, delete-orphan")

class FeeLedger(Base):
    __tablename__ = "fee_ledgers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    escrow_id = Column(String(36), ForeignKey("escrow_transactions.id", ondelete="CASCADE"), nullable=False)
    fee_type = Column(String(50), nullable=False)  # 'PLATFORM_COMMISSION', 'TDS_SECTION_194O'
    amount = Column(Float, nullable=False)
    tax_percentage = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    escrow = relationship("EscrowTransaction", back_populates="fee_ledgers")
