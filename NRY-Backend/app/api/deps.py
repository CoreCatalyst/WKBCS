from datetime import datetime, timezone
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, RoleEnum, UserSession
from app.models.business import BusinessProfile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/otp/verify", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate JWT and return the authenticated User. Raises 401 if missing/invalid/revoked/unbound."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    user_id: Optional[str] = payload.get("sub")
    token_type: Optional[str] = payload.get("type")
    session_id: Optional[str] = payload.get("sid")

    # Strict token type isolation: Bearer tokens must have type == 'access'
    if not user_id or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Token type must be 'access'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Strict session binding: Access token must contain a valid session ID ('sid')
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing session binding ('sid'). Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sess_stmt = select(UserSession).where(UserSession.id == str(session_id))
    sess_res = await db.execute(sess_stmt)
    session = sess_res.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session not found or invalid session binding.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify session belongs to the authenticated user
    if session.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session does not match authenticated user.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify session is not revoked
    if session.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify session is not expired
    now = datetime.now(timezone.utc)
    exp = session.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        session.is_revoked = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account.")

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency for admin-only endpoints.
    Raises HTTP 403 if the authenticated user does not hold the ADMIN role.
    """
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to platform administrators.",
        )
    return current_user


async def get_current_vendor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Tuple[User, Optional[BusinessProfile]]:
    """Dependency for vendor-only endpoints. Returns (user, business_profile)."""
    if current_user.role not in [RoleEnum.VENDOR, RoleEnum.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action restricted to verified business vendors."
        )

    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    return current_user, biz
