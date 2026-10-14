"""
Noryvanta Role-Based Access Control (RBAC) and Security Permissions Engine
Section 11: Comprehensive Role and Category Enforcement
"""

from enum import Enum
from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile, BusinessVerificationStatus


class PlatformRole(str, Enum):
    CUSTOMER = "CUSTOMER"
    BUYER = "BUYER"
    BUSINESS_OWNER = "BUSINESS_OWNER"
    VENDOR = "VENDOR"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    SUPPORT = "SUPPORT"


class BusinessCategory(str, Enum):
    WHOLESALER = "WHOLESALER"
    DISTRIBUTOR = "DISTRIBUTOR"
    RETAILER = "RETAILER"
    SERVICES = "SERVICES"
    SERVICE_PROVIDER = "SERVICE_PROVIDER"


def require_roles(allowed_roles: List[RoleEnum]) -> Callable:
    """
    Dependency factory that verifies the current user has one of the allowed roles.
    Raises HTTP 403 Forbidden if not authorized.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}."
            )
        return current_user
    return role_checker


# Predefined role dependencies
require_admin = require_roles([RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN])
require_business_user = require_roles([
    RoleEnum.BUSINESS_OWNER,
    RoleEnum.VENDOR,
    RoleEnum.ADMIN,
    RoleEnum.SUPER_ADMIN
])
require_customer = require_roles([
    RoleEnum.CUSTOMER,
    RoleEnum.BUYER,
    RoleEnum.ADMIN,
    RoleEnum.SUPER_ADMIN
])


async def require_business_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BusinessProfile:
    """
    Verifies that the user has an active registered business profile.
    Returns the BusinessProfile instance.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation requires an active business profile."
        )
    return biz


def require_business_type(allowed_types: List[str]) -> Callable:
    """
    Verifies that the user's business profile matches one of the allowed business types
    (e.g., WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER).
    """
    normalized_allowed = [t.strip().upper() for t in allowed_types]

    async def type_checker(
        biz: BusinessProfile = Depends(require_business_profile)
    ) -> BusinessProfile:
        current_type = (biz.business_type or "").strip().upper()
        if not any(allowed in current_type for allowed in normalized_allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to business categories: {allowed_types}."
            )
        return biz
    return type_checker


def verify_resource_ownership(owner_id: str, current_user_id: str, is_admin: bool = False) -> None:
    """
    Strict privacy isolation invariant:
    Users cannot access another user's private data (orders, profiles, transactions, addresses)
    unless they hold the platform ADMIN role.
    """
    if owner_id != current_user_id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access or modify this resource."
        )
