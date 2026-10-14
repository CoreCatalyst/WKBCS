import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum as SQLEnum, ForeignKey, JSON, Numeric, Integer, CheckConstraint, UniqueConstraint
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

class SettlementStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"
    ON_HOLD = "ON_HOLD"
    REVERSED = "REVERSED"

class LedgerEntryType(str, Enum):
    ORDER_CREATED = "ORDER_CREATED"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PLATFORM_FEE = "PLATFORM_FEE"
    GATEWAY_FEE = "GATEWAY_FEE"
    TDS_194O = "TDS_194O"
    REFUND = "REFUND"
    ADJUSTMENT = "ADJUSTMENT"
    BUSINESS_SETTLEMENT = "BUSINESS_SETTLEMENT"
    REVERSAL = "REVERSAL"

class PlatformFeeConfig(Base):
    __tablename__ = "platform_fee_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fee_type = Column(String(50), default="PERCENTAGE", nullable=False)  # PERCENTAGE, FIXED, HYBRID
    rate_percentage = Column(Float, default=5.20, nullable=False)  # Category default 5.20%
    fixed_amount = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(String(255), default="Noryvanta Category Business Platform Fee")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class PlatformFeeRule(Base):
    """
    Versioned, auditable category-based platform fee rules.
    Enforces strict decimal percentage and time-ranged active status.
    """
    __tablename__ = "platform_fee_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_type = Column(String(50), nullable=False, index=True)
    fee_percentage = Column(Numeric(5, 2), nullable=False)  # Decimal: 3.20, 5.20, 8.20
    currency_scope = Column(String(10), default="INR", nullable=False)
    effective_from = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    effective_to = Column(DateTime, nullable=True)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)  # ACTIVE, INACTIVE, SCHEDULED, EXPIRED
    version = Column(Integer, default=1, nullable=False)
    change_reason = Column(String(255), nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("fee_percentage >= 0 AND fee_percentage <= 100", name="ck_platform_fee_percentage_valid"),
        CheckConstraint("status IN ('ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED')", name="ck_platform_fee_status_valid"),
        UniqueConstraint("business_type", "version", name="uq_fee_rule_biz_version"),
    )

class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    gateway = Column(String(50), nullable=False)  # RAZORPAY, CASHFREE, MANUAL
    gateway_order_id = Column(String(100), index=True, nullable=True)
    gateway_payment_id = Column(String(100), index=True, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="INITIATED", nullable=False)  # SUCCESSFUL, FAILED, PENDING
    signature = Column(String(255), nullable=True)
    signature_verified = Column(Boolean, default=False, nullable=False)
    raw_payload = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="payments")

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_id = Column(String(36), ForeignKey("business_profiles.id"), nullable=False)
    
    # Financial breakdown
    gross_amount = Column(Float, nullable=False)
    eligible_business_value = Column(Float, nullable=True)
    merchant_discount_amount = Column(Float, default=0.0, nullable=False)
    shipping_amount = Column(Float, default=0.0, nullable=False)
    platform_fee_base_amount = Column(Float, nullable=True)
    platform_fee_rate = Column(Float, default=5.20, nullable=False)
    platform_fee_amount = Column(Float, nullable=False)
    tds_rate = Column(Float, default=1.0, nullable=False)  # Section 194-O (1%)
    tds_amount = Column(Float, default=0.0, nullable=False)
    gateway_fee_amount = Column(Float, default=0.0, nullable=False)
    net_settlement_amount = Column(Float, nullable=False)

    # Applied fee rule version snapshot (for audit and immutability)
    business_type = Column(String(50), nullable=True)
    applied_fee_rule_id = Column(String(36), nullable=True)
    applied_fee_rule_version = Column(Integer, nullable=True)
    fee_calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    status = Column(SQLEnum(SettlementStatus), default=SettlementStatus.PENDING, nullable=False)
    payout_reference = Column(String(100), nullable=True)
    disbursed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    order = relationship("Order", back_populates="settlement")

class FinancialLedger(Base):
    __tablename__ = "financial_ledgers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_type = Column(SQLEnum(LedgerEntryType), nullable=False)
    reference_type = Column(String(50), nullable=False)  # ORDER, PAYMENT, SETTLEMENT, REFUND
    reference_id = Column(String(36), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    debit_account = Column(String(100), nullable=True)
    credit_account = Column(String(100), nullable=True)
    created_by = Column(String(36), nullable=True)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    payment_id = Column(String(36), ForeignKey("order_payments.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    refunded_eligible_business_value = Column(Float, default=0.0, nullable=False)
    original_platform_fee_rate = Column(Float, nullable=True)
    platform_fee_reversal_amount = Column(Float, default=0.0, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(String(50), default="REQUESTED", nullable=False)  # REQUESTED, APPROVED, PROCESSED, REJECTED
    gateway_refund_id = Column(String(100), nullable=True)
    requested_by = Column(String(36), nullable=False)
    processed_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

# Backward-compatible EscrowTransaction & FeeLedger
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
    fee_type = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    tax_percentage = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    escrow = relationship("EscrowTransaction", back_populates="fee_ledgers")
