import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base

class OrderStatus(str, Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PAID_IN_ESCROW = "PAID_IN_ESCROW"
    PROCESSING = "PROCESSING"
    DISPATCHED = "DISPATCHED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REFUND_REQUESTED = "REFUND_REQUESTED"
    REFUNDED = "REFUNDED"
    DISPUTED = "DISPUTED"

class PaymentStatus(str, Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESSFUL = "SUCCESSFUL"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUND_INITIATED = "REFUND_INITIATED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    REFUNDED = "REFUNDED"
    COD_PENDING = "COD_PENDING"
    COD_COLLECTED = "COD_COLLECTED"

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = Column(String(30), unique=True, index=True, nullable=False)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    buyer_id = synonym("customer_id")
    business_id = Column(String(36), ForeignKey("business_profiles.id"), nullable=False)
    vendor_id = synonym("business_id")
    currency = Column(String(10), default="INR", nullable=False)
    
    # Financial breakdown (Customer-Facing — ZERO Noryvanta platform fee charged here!)
    gross_business_value = Column(Float, nullable=True)
    merchant_discount = Column(Float, default=0.0, nullable=False)
    platform_discount = Column(Float, default=0.0, nullable=False)
    eligible_net_business_value = Column(Float, nullable=True)
    subtotal = Column(Float, nullable=False)
    gst_total = Column(Float, default=0.0, nullable=False)
    customer_charges = Column(Float, default=0.0, nullable=False)  # Shipping / delivery
    shipping_amount = synonym("customer_charges")
    total_customer_payable = Column(Float, nullable=False)  # subtotal + gst_total + customer_charges
    total_amount = synonym("total_customer_payable")
    
    # Internal business-side category commission snapshot (3.20% to 8.20%)
    platform_fee_base_amount = Column(Float, nullable=True)
    platform_fee = Column(Float, default=0.0, nullable=False)
    
    # Order & Payment States
    order_status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    status = synonym("order_status")
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.INITIATED, nullable=False)
    payment_method = Column(String(50), default="RAZORPAY", nullable=False)  # RAZORPAY, CASHFREE, COD, UPI
    is_cod = Column(Boolean, default=False, nullable=False)
    
    shipping_address = Column(JSON, default=dict)
    billing_address = Column(JSON, default=dict)
    tracking_number = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    escrow = relationship("EscrowTransaction", back_populates="order", uselist=False)
    payments = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan")
    settlement = relationship("Settlement", back_populates="order", uselist=False)

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    gst_rate = Column(Float, default=18.0, nullable=False)
    line_total = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
