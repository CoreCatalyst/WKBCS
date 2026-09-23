from typing import Optional
from pydantic import BaseModel, EmailStr

class OTPRequest(BaseModel):
    identifier: str  # Phone number or email
    channel: str = "sms"  # 'sms' or 'email'

class OTPResponse(BaseModel):
    success: bool
    message: str
    ttl_seconds: int = 300
    dev_otp_preview: Optional[str] = None

class OTPVerify(BaseModel):
    identifier: str
    otp_code: str
    full_name: Optional[str] = None
    role: Optional[str] = "BUYER"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    has_business_profile: bool = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class OAuthLoginRequest(BaseModel):
    provider: str
    id_token: str
    role: Optional[str] = "BUYER"
