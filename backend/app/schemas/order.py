from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: Dict[str, Any]

class OrderItemOut(BaseModel):
    id: str
    product_id: str
    quantity: int
    unit_price: float
    gst_rate: float
    line_total: float

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: str
    order_number: str
    buyer_id: str
    vendor_id: str
    subtotal: float
    gst_total: float
    platform_fee: float
    total_amount: float
    status: str
    shipping_address: Dict[str, Any]
    tracking_number: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True
