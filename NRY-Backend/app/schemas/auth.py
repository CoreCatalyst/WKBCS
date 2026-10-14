from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator

class OTPRequest(BaseModel):
    identifier: str  # Phone number or email
    channel: str = "sms"  # 'sms' or 'email'
    turnstile_token: Optional[str] = None

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
    turnstile_token: Optional[str] = None
    client_type: Optional[str] = None

class EmailPasswordLogin(BaseModel):
    email: str
    password: str
    turnstile_token: Optional[str] = None
    client_type: Optional[str] = None

class UserRegisterRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    full_name: str
    role: str = "CUSTOMER"  # CUSTOMER, BUYER, VENDOR
    turnstile_token: Optional[str] = None
    client_type: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_public_registration_role(cls, v: Optional[str]) -> str:
        if not v:
            return "CUSTOMER"
        clean = v.upper().strip()
        if clean in ("ADMIN", "SUPER_ADMIN", "SUPPORT", "STAFF"):
            raise ValueError("Privileged administrative roles cannot be assigned through public registration.")
        if clean not in ("CUSTOMER", "BUYER", "VENDOR", "BUSINESS_OWNER"):
            raise ValueError(f"Invalid registration role '{v}'. Permitted public roles: CUSTOMER, BUYER, VENDOR.")
        return clean

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    uaid: Optional[str] = None
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    has_business_profile: bool = False

    model_config = ConfigDict(from_attributes=True)

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None
    client_type: Optional[str] = None

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
    all_devices: bool = False

class AdminUserProvisionRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: str
    role: str = "ADMIN"  # "ADMIN" | "SUPER_ADMIN"

    @field_validator("role")
    @classmethod
    def validate_admin_role(cls, v: str) -> str:
        clean = v.upper().strip()
        if clean not in ("ADMIN", "SUPER_ADMIN"):
            raise ValueError("Role must be ADMIN or SUPER_ADMIN.")
        return clean

class OAuthLoginRequest(BaseModel):
    provider: str
    id_token: str
    role: Optional[str] = "BUYER"
    turnstile_token: Optional[str] = None
    client_type: Optional[str] = None

class GoogleOAuthRequest(BaseModel):
    id_token: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "BUYER"
    turnstile_token: Optional[str] = None
    client_type: Optional[str] = None
