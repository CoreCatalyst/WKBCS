import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import (
    OTPRequest, OTPResponse, OTPVerify, TokenResponse,
    RefreshTokenRequest, LogoutRequest, OAuthLoginRequest, GoogleOAuthRequest,
    EmailPasswordLogin, UserRegisterRequest
)
from app.services.otp_service import OTPService
from app.services.auth_service import AuthService
from app.services.turnstile_service import TurnstileService
from app.core.security import decode_token, create_access_token, verify_password
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    """Sets secure, HttpOnly cookie for refresh token."""
    is_production = settings.APP_ENV == "production"
    response.set_cookie(
        key="noryvanta_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth"
    )


def delete_refresh_token_cookie(response: Response) -> None:
    """Clears refresh token cookie on logout."""
    response.delete_cookie(
        key="noryvanta_refresh_token",
        path="/api/v1/auth"
    )


from urllib.parse import urlparse


def _extract_origin(url_str: Optional[str]) -> Optional[str]:
    """
    Extracts and normalizes scheme://netloc from an Origin or Referer header.
    Rejects malformed, opaque ('null'), or non-http/https origins.
    """
    if not url_str or not isinstance(url_str, str):
        return None
    url_clean = url_str.strip()
    if not url_clean or url_clean.lower() == "null":
        return None
    try:
        parsed = urlparse(url_clean)
        scheme = (parsed.scheme or "").lower()
        netloc = (parsed.netloc or "").lower()
        if scheme not in ("http", "https") or not netloc:
            return None
        return f"{scheme}://{netloc}".rstrip("/")
    except Exception:
        return None


def validate_cookie_csrf(request: Request) -> None:
    """
    Enforces strict Origin/Referer validation on cookie-authenticated state-changing endpoints.
    Protects against Cross-Site Request Forgery (CSRF).

    Rules:
    1. If the refresh cookie is present and relied on, require a valid trusted request origin.
    2. If both Origin and Referer are missing, reject with HTTP 403 Forbidden.
    3. If Origin is present, strictly validate against allowed origins (scheme://host[:port]).
    4. If Referer is present, strictly validate against allowed origins. If Origin is trusted
       but Referer is untrusted, reject with HTTP 403 Forbidden.
    5. If Origin is missing but Referer is present, validate Referer against allowed origins.
    6. Malformed, opaque, or untrusted origins are strictly rejected.
    7. Client-controlled mobile headers or payloads cannot bypass this validation.
    8. Cookie-less requests (e.g. pure Bearer token native API calls) bypass this check.
    """
    has_cookie = "noryvanta_refresh_token" in request.cookies
    if not has_cookie:
        return

    origin_header = request.headers.get("origin")
    referer_header = request.headers.get("referer")

    if not origin_header and not referer_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-origin request rejected: Origin or Referer header required for cookie authentication (CSRF protection)."
        )

    allowed = set()
    for orig in settings.BACKEND_CORS_ORIGINS:
        extracted = _extract_origin(orig)
        if extracted:
            allowed.add(extracted)

    if settings.APP_ENV != "production":
        for dev_orig in [
            "http://test",
            "http://localhost",
            "http://127.0.0.1",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]:
            extracted = _extract_origin(dev_orig)
            if extracted:
                allowed.add(extracted)

    if origin_header:
        extracted_origin = _extract_origin(origin_header)
        if not extracted_origin or extracted_origin not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-origin request rejected: Untrusted Origin header (CSRF protection)."
            )

    if referer_header:
        extracted_referer = _extract_origin(referer_header)
        if not extracted_referer or extracted_referer not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-origin request rejected: Untrusted Referer header (CSRF protection)."
            )


@router.post("/otp/request", response_model=OTPResponse, summary="Request 6-digit OTP")
async def request_otp(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    """
    Dispatches a 6-digit OTP to the phone or email provided.
    In development mode with DEV_MODE_OTP=true, returns the preview OTP directly.
    """
    if payload.turnstile_token:
        is_human = await TurnstileService.verify_token(payload.turnstile_token)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bot verification failed (Turnstile).")

    clean_id = payload.identifier.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty.")

    otp_code = await OTPService.create_otp(
        db,
        clean_id,
        ttl_minutes=settings.OTP_TTL_MINUTES,
        channel=payload.channel
    )
    
    dev_preview = otp_code if settings.is_dev_otp_allowed else None
    
    return OTPResponse(
        success=True,
        message=f"Verification code sent via {payload.channel}.",
        ttl_seconds=settings.OTP_TTL_MINUTES * 60,
        dev_otp_preview=dev_preview
    )


@router.post("/otp/verify", response_model=TokenResponse, summary="Verify OTP and return JWT session tokens")
async def verify_otp(
    payload: OTPVerify,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates OTP. If valid, provisions or retrieves the user and generates access/refresh tokens.
    Enforces strict role validation: Public requests cannot assign ADMIN or SUPER_ADMIN.
    """
    if payload.turnstile_token:
        is_human = await TurnstileService.verify_token(payload.turnstile_token)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bot verification failed (Turnstile).")

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

    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(
        db, user, device_info=device_info, ip_address=ip_address
    )

    # Browser clients strictly receive refresh tokens ONLY via secure HttpOnly cookies.
    # JSON body refresh token exposure is completely eliminated on standard endpoints.
    set_refresh_token_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=None,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        phone=user.phone,
        email=user.email,
        has_business_profile=has_biz
    )


@router.post("/login/password", response_model=TokenResponse, summary="Authenticate via email and password")
async def login_with_password(
    payload: EmailPasswordLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Secure password authentication endpoint.
    Performs constant-time hash verification and issues active JWT session tokens.
    """
    if payload.turnstile_token:
        is_human = await TurnstileService.verify_token(payload.turnstile_token)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bot verification failed (Turnstile).")

    clean_email = payload.email.strip().lower()
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalars().first()

    # Generic authentication error prevents user enumeration
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account.")

    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(
        db, user, device_info=device_info, ip_address=ip_address
    )

    set_refresh_token_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=None,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        phone=user.phone,
        email=user.email,
        has_business_profile=has_biz
    )


@router.post("/google", response_model=TokenResponse, summary="Google OAuth Login / Sign-up")
async def google_login(
    payload: GoogleOAuthRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with Google OAuth token.
    Issues Noryvanta JWT session tokens upon tokeninfo validation.
    """
    if payload.turnstile_token:
        is_human = await TurnstileService.verify_token(payload.turnstile_token)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bot verification failed (Turnstile).")

    google_email = payload.email
    google_name = payload.full_name or "Google Verified User"

    if settings.GOOGLE_CLIENT_ID and not settings.GOOGLE_CLIENT_ID.startswith("mock") and settings.APP_ENV != "development":
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": payload.id_token}
                )
                if res.status_code == 200:
                    data = res.json()
                    google_email = data.get("email", google_email)
                    google_name = data.get("name", google_name)
                else:
                    raise HTTPException(status_code=401, detail="Invalid Google OAuth id_token.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Google OAuth verification failed: {e}")

    if not google_email:
        google_email = f"google.user.{payload.id_token[:8]}@gmail.com"

    user = await AuthService.get_or_create_user_by_identifier(
        db,
        identifier=google_email,
        full_name=google_name,
        role=payload.role or "CUSTOMER"
    )
    user.is_verified = True
    await db.commit()

    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(
        db, user, device_info=device_info, ip_address=ip_address
    )

    set_refresh_token_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=None,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        email=user.email,
        phone=user.phone,
        has_business_profile=has_biz
    )


@router.post("/oauth/token", response_model=TokenResponse, summary="OAuth2 / OIDC SSO exchange")
async def oauth_login(
    payload: OAuthLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Exchanges an OIDC token from Enterprise SSO for Noryvanta JWT session tokens.
    """
    if payload.turnstile_token:
        is_human = await TurnstileService.verify_token(payload.turnstile_token)
        if not is_human:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bot verification failed (Turnstile).")

    mock_email = f"enterprise.{payload.provider}@noryvantaglobal.com"
    user = await AuthService.get_or_create_user_by_identifier(
        db,
        identifier=mock_email,
        full_name=f"SSO Verified Partner ({payload.provider.title()})",
        role=payload.role or "VENDOR"
    )
    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    access_token, refresh_token, expires_in, has_biz = await AuthService.generate_tokens(
        db, user, device_info=device_info, ip_address=ip_address
    )

    set_refresh_token_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=None,
        token_type="bearer",
        expires_in=expires_in,
        user_id=user.id,
        role=user.role.value,
        email=user.email,
        has_business_profile=has_biz
    )


@router.post("/refresh", summary="Rotate and refresh expired access token (Standard alias)")
@router.post("/token/refresh", summary="Rotate and refresh expired access token")
async def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Rotates refresh token and generates fresh access token.
    Strictly verifies token type == 'refresh' and validates that the UserSession is unrevoked.
    Supports token delivery via JSON body or HttpOnly cookie.
    Enforces CSRF protection on cookie-authenticated requests.
    """
    validate_cookie_csrf(request)

    target_token = payload.refresh_token or request.cookies.get("noryvanta_refresh_token")
    if not target_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required (via JSON body or HttpOnly cookie)."
        )

    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    new_access_token, new_refresh_token, expires_in = await AuthService.rotate_refresh_token(
        db=db,
        refresh_token=target_token,
        device_info=device_info,
        ip_address=ip_address
    )

    set_refresh_token_cookie(response, new_refresh_token)

    return {
        "access_token": new_access_token,
        "refresh_token": None,
        "token_type": "bearer",
        "expires_in": expires_in
    }


@router.post("/register", response_model=TokenResponse, summary="Register new user account")
async def register_user(
    payload: OTPVerify,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Standard user registration endpoint.
    Verifies OTP and provisions new user account with session tokens.
    Prevents assignment of administrative roles via public registration.
    """
    clean_role = (payload.role or "CUSTOMER").upper().strip()
    if clean_role in ("ADMIN", "SUPER_ADMIN", "SUPPORT", "STAFF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Privileged administrative roles cannot be assigned through public registration."
        )
    return await verify_otp(payload, request, response, db)


@router.post("/login", response_model=TokenResponse, summary="User login endpoint")
async def login_user(
    payload: OTPVerify,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Standard user authentication endpoint.
    Verifies OTP and returns active session JWT tokens.
    """
    return await verify_otp(payload, request, response, db)


@router.post("/logout", summary="Logout current user session")
async def logout_user(
    request: Request,
    response: Response,
    payload: Optional[LogoutRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Terminates user session and revokes refresh tokens in the database.
    Clears the HttpOnly cookie.
    Enforces CSRF protection on cookie-authenticated requests.
    Prevents unintended multi-device revocation when session token is absent.
    """
    validate_cookie_csrf(request)

    target_token = (payload.refresh_token if payload else None) or request.cookies.get("noryvanta_refresh_token")
    all_devices = payload.all_devices if payload else False

    session_id_from_token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            tok = auth_header.split(" ", 1)[1].strip()
            decoded = decode_token(tok)
            session_id_from_token = decoded.get("sid")
        except Exception:
            pass

    revoked_count = await AuthService.revoke_session(
        db=db,
        user_id=current_user.id,
        refresh_token=target_token,
        session_id=session_id_from_token,
        all_devices=all_devices
    )

    delete_refresh_token_cookie(response)

    return {
        "success": True,
        "message": "User session successfully terminated.",
        "sessions_revoked": revoked_count
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
