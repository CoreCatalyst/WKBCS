from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: str = "BUYER"

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class UserOut(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
