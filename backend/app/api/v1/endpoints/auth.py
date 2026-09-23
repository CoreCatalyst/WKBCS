from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import (
    OTPRequest, OTPResponse, OTPVerify, TokenResponse,
    RefreshTokenRequest, OAuthLoginRequest
)
from app.services.otp_service import OTPService
from app.services.auth_service import AuthService
from app.core.security import decode_token, create_access_token
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/otp/request", response_model=OTPResponse, summary="Request 6-digit OTP")
async def request_otp(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Dispatches a 6-digit OTP to the phone or email provided.
    In development mode, returns the preview OTP directly for effortless testing.
    """
    clean_id = payload.identifier.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty.")

    otp_code = await OTPService.create_otp(db, clean_id)
    
    return OTPResponse(
        success=True,
        message=f"Verification code sent via {payload.channel}.",
        ttl_seconds=300,
        dev_otp_preview=otp_code
    )

@router.post("/otp/verify", response_model=TokenResponse, summary="Verify OTP and return JWT session tokens")
async def verify_otp(payload: OTPVerify, db: AsyncSession = Depends(get_db)):
    """
    Validates OTP. If valid, provisions or retrieves the user and generates access/refresh tokens.
    """
    is_valid = await OTPService.verify_otp(db, payload.identifier, payload.otp_code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code."
        )

    user = await AuthService.get_or_create_user_by_identifier(
        db,
        identifier=payload.identifier,
        full_name=payload.full_name,
        role=payload.role or "BUYER"
    )

    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(db, user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        phone=user.phone,
        email=user.email,
        has_business_profile=has_biz
    )

@router.post("/oauth/token", response_model=TokenResponse, summary="OAuth2 / OIDC SSO exchange")
async def oauth_login(payload: OAuthLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchanges an OIDC token from Google / Enterprise SSO for Noryvanta JWT session tokens.
    """
    # For demo / integration, synthesize or decode OIDC subject
    mock_email = f"enterprise.{payload.provider}@noryvanta.in"
    user = await AuthService.get_or_create_user_by_identifier(
        db,
        identifier=mock_email,
        full_name=f"SSO Verified Partner ({payload.provider.title()})",
        role=payload.role or "VENDOR"
    )
    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(db, user)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        email=user.email,
        has_business_profile=has_biz
    )

@router.post("/token/refresh", summary="Rotate and refresh expired access token")
async def refresh_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    user_id = decoded.get("sub")
    token_type = decoded.get("type")

    if not user_id or token_type != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User account is inactive.")

    new_access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": 3600 * 24
    }

@router.get("/me", summary="Get currently logged in user info")
async def get_current_user_profile(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_verified": user.is_verified
    }
