from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EscrowDepositRequest(BaseModel):
    payment_reference: str
    amount_paid: float
    payment_method: Optional[str] = "NEFT_RTGS"

class EscrowDepositResponse(BaseModel):
    order_id: str
    escrow_id: str
    status: str
    amount_locked: float
    message: str

class EscrowReleaseResponse(BaseModel):
    order_id: str
    escrow_status: str
    amount_disbursed_to_vendor: float
    tds_deducted: float
    platform_commission_retained: float
    settlement_reference: str
    message: str

class FeeLedgerOut(BaseModel):
    id: str
    fee_type: str
    amount: float
    tax_percentage: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EscrowOut(BaseModel):
    id: str
    order_id: str
    buyer_id: str
    vendor_id: str
    amount_locked: float
    platform_fee_retained: float
    tds_deducted: float
    amount_disbursed: float
    status: str
    payment_reference: Optional[str] = None
    settlement_reference: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    created_at: datetime
    fee_ledgers: List[FeeLedgerOut] = []

    model_config = ConfigDict(from_attributes=True)

# ── Financial & Settlement Schemas ──

class SettlementOut(BaseModel):
    id: str
    order_id: str
    business_id: str
    gross_amount: float
    platform_fee_rate: float
    platform_fee_amount: float
    tds_rate: float
    tds_amount: float
    gateway_fee_amount: float
    net_settlement_amount: float
    status: str
    payout_reference: Optional[str] = None
    disbursed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlatformFeeConfigOut(BaseModel):
    id: str
    fee_type: str
    rate_percentage: float
    fixed_amount: float
    is_active: bool
    description: str

    model_config = ConfigDict(from_attributes=True)

class PlatformFeeConfigUpdate(BaseModel):
    rate_percentage: float
    fee_type: Optional[str] = "PERCENTAGE"
    fixed_amount: Optional[float] = 0.0
    description: Optional[str] = None

class FinancialLedgerOut(BaseModel):
    id: str
    entry_type: str
    reference_type: str
    reference_id: str
    amount: float
    currency: str
    debit_account: Optional[str] = None
    credit_account: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaymentSessionCreate(BaseModel):
    order_id: str
    gateway: str = "RAZORPAY"  # RAZORPAY, CASHFREE

class PaymentSessionOut(BaseModel):
    order_id: str
    gateway: str
    gateway_order_id: str
    amount: float
    currency: str
    key_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
