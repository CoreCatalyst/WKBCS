from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

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

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True
