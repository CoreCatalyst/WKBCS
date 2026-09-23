from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class BusinessOnboardRequest(BaseModel):
    legal_name: str
    trade_name: str
    business_type: str
    gstin: str
    pan: str
    bank_account_number: str
    bank_ifsc: str
    primary_category: Optional[str] = "Industrial & Machinery"

class BusinessOut(BaseModel):
    id: str
    user_id: str
    legal_name: str
    trade_name: str
    business_type: str
    gstin: str
    pan: str
    virtual_escrow_account_id: Optional[str] = None
    primary_category: str
    kyc_status: str
    tier: str
    rating: float
    total_sales_volume: float
    created_at: datetime

    class Config:
        from_attributes = True
