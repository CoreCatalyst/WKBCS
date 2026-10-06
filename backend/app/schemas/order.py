from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: Dict[str, Any]
    payment_method: str = "RAZORPAY"
    is_cod: bool = False
    customer_charges: float = 0.0
    merchant_discount: float = 0.0
    platform_discount: float = 0.0

class OrderItemOut(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    gst_rate: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)

class FinancialBreakdownOut(BaseModel):
    currency: str = "INR"
    gross_business_value: float
    merchant_discount_amount: float = 0.0
    platform_discount_amount: float = 0.0
    eligible_business_value: float
    tax_amount: float
    shipping_amount: float = 0.0
    payment_fee_amount: float = 0.0
    platform_fee_percentage: float
    platform_fee_base_amount: float
    platform_fee_amount: float
    customer_payable_amount: float
    business_settlement_amount: float
    tds_amount: float = 0.0
    business_type: Optional[str] = None
    applied_fee_rule_id: Optional[str] = None
    applied_fee_rule_version: Optional[int] = None

class OrderOut(BaseModel):
    id: str
    order_number: str
    customer_id: Optional[str] = None
    buyer_id: Optional[str] = None
    business_id: Optional[str] = None
    vendor_id: Optional[str] = None
    gross_business_value: Optional[float] = None
    merchant_discount: float = 0.0
    platform_discount: float = 0.0
    eligible_net_business_value: Optional[float] = None
    subtotal: float
    gst_total: float
    customer_charges: float = 0.0
    shipping_amount: Optional[float] = 0.0
    total_customer_payable: float
    total_amount: float
    platform_fee_base_amount: Optional[float] = None
    platform_fee: Optional[float] = None
    order_status: str
    status: str
    payment_status: str
    payment_method: str = "RAZORPAY"
    is_cod: bool = False
    shipping_address: Dict[str, Any]
    tracking_number: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)
