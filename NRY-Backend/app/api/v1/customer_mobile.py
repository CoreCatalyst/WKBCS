"""
Noryvanta Customer Mobile API Module
Dedicated endpoints for NRY-Mobile-App frontend.
Routes: /api/v1/customer/*
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product, ListingType, ListingStatus
from app.models.network import (
    NetworkMember,
    NetworkCycle,
    NetworkLevelRecord,
    RewardLedger,
    Referral,
    ReferralTransaction,
    LevelProgressionLedger,
    LevelQualificationAllocation
)
from app.services.uaid_service import uaid_service
from app.services.otp_service import OTPService
from app.services.auth_service import AuthService
from app.services.customer_reward_service import customer_reward_service, CUSTOMER_ENTRY_THRESHOLD, CUSTOMER_UNIT_PER_LEVEL
from app.services.quarterly_activity_service import quarterly_service
from app.services.network_service import RANKS_SPECIFICATION, get_rank_spec_for_level
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, decode_token

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class CustomerOTPRequest(BaseModel):
    phone_or_email: str
    channel: str = "sms"  # sms, whatsapp, email

class CustomerOTPVerify(BaseModel):
    phone_or_email: str
    otp_code: str
    full_name: Optional[str] = None
    referral_code: Optional[str] = None

class CustomerRegisterRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    referral_code: Optional[str] = None

class CustomerLoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str

class CustomerRefreshTokenRequest(BaseModel):
    refresh_token: str

class CustomerRefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class CustomerLogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
    all_devices: bool = False

class CustomerAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: Optional[str]
    uaid: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    role: str
    has_referral: bool
    is_reward_eligible: bool

class CustomerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

class CustomerAddress(BaseModel):
    id: Optional[str] = None
    recipient_name: str
    phone: str
    address_line: str
    city: str
    district: Optional[str] = None
    state: str
    country: str = "India"
    postal_code: str
    is_default: bool = False

class CustomerReferralValidateReq(BaseModel):
    referral_code: str

class CustomerReferralApplyReq(BaseModel):
    referral_code: str

class CartItemPayload(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1)

class CheckoutRequest(BaseModel):
    shipping_address: CustomerAddress
    payment_method: str = "RAZORPAY"  # RAZORPAY, CASHFREE, UPI, COD
    notes: Optional[str] = None
    points_to_redeem: float = Field(0.0, ge=0.0)

class ServiceBookingRequest(BaseModel):
    service_id: str
    scheduled_date: str
    address: CustomerAddress
    notes: Optional[str] = None

# In-memory customer addresses store per user
_CUSTOMER_ADDRESSES: Dict[str, List[Dict[str, Any]]] = {}

# In-memory cart store per user
_CUSTOMER_CARTS: Dict[str, List[Dict[str, Any]]] = {}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Authentication & Onboarding Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/auth/request-otp", summary="Customer OTP dispatch")
async def customer_request_otp(payload: CustomerOTPRequest, db: AsyncSession = Depends(get_db)):
    clean_id = payload.phone_or_email.strip()
    if not clean_id:
        raise HTTPException(status_code=400, detail="Phone or email cannot be empty.")

    otp_code = await OTPService.create_otp(
        db, clean_id, ttl_minutes=settings.OTP_TTL_MINUTES, channel=payload.channel
    )
    dev_preview = otp_code if settings.is_dev_otp_allowed else None

    return {
        "success": True,
        "message": f"Verification code sent via {payload.channel}.",
        "ttl_seconds": settings.OTP_TTL_MINUTES * 60,
        "dev_otp_preview": dev_preview
    }

@router.post("/auth/verify-otp", response_model=CustomerAuthResponse, summary="Verify OTP and Login/Register Customer")
async def customer_verify_otp(payload: CustomerOTPVerify, db: AsyncSession = Depends(get_db)):
    clean_id = payload.phone_or_email.strip()
    is_valid = await OTPService.verify_otp(db, clean_id, payload.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code.")

    # Get or create customer user (role strictly CUSTOMER)
    user = await AuthService.get_or_create_user_by_identifier(
        db, identifier=clean_id, full_name=payload.full_name, role="CUSTOMER"
    )

    # Ensure Customer UAID is permanently assigned
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(user.id, db)
    user.uaid = uaid_val

    # Apply referral if provided during onboarding
    if payload.referral_code:
        await customer_reward_service.apply_customer_referral(user.id, payload.referral_code, db)

    access_token, refresh_token, _, _ = await AuthService.generate_tokens(db, user)

    status_data = await customer_reward_service.get_customer_reward_status(user.id, db)

    return CustomerAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        uaid=uaid_val,
        phone=user.phone,
        email=user.email,
        role=user.role.value,
        has_referral=status_data["has_valid_referral"],
        is_reward_eligible=status_data["is_reward_eligible"]
    )

@router.post("/auth/register", response_model=CustomerAuthResponse, summary="Customer Direct Registration")
async def customer_register(payload: CustomerRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Validate identifier
    identifier = (payload.email or payload.phone or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone is required.")

    # Check if user already exists
    stmt = select(User).where(or_(User.email == payload.email, User.phone == payload.phone))
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email/phone already exists.")

    hashed_pw = get_password_hash(payload.password) if payload.password else None

    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        role=RoleEnum.CUSTOMER,
        is_active=True,
        is_verified=True,
        hashed_password=hashed_pw
    )
    db.add(user)
    await db.flush()

    # Assign Customer UAID
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(user.id, db)
    user.uaid = uaid_val

    # Apply referral if provided
    has_ref = False
    if payload.referral_code:
        ref_res = await customer_reward_service.apply_customer_referral(user.id, payload.referral_code, db)
        has_ref = ref_res["valid"]

    await db.commit()
    await db.refresh(user)

    access_token, refresh_token, _, _ = await AuthService.generate_tokens(db, user)

    return CustomerAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        uaid=uaid_val,
        phone=user.phone,
        email=user.email,
        role=user.role.value,
        has_referral=has_ref,
        is_reward_eligible=False
    )

@router.post("/auth/login", response_model=CustomerAuthResponse, summary="Customer Email/Phone & Password Login")
async def customer_login(payload: CustomerLoginRequest, db: AsyncSession = Depends(get_db)):
    clean_id = payload.identifier.strip()
    stmt = select(User).where(or_(User.email == clean_id, User.phone == clean_id))
    user = (await db.execute(stmt)).scalars().first()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid login credentials.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    # Idempotent: repeated login NEVER changes or regenerates existing UAID
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(user.id, db)

    access_token, refresh_token, _, _ = await AuthService.generate_tokens(db, user)
    status_data = await customer_reward_service.get_customer_reward_status(user.id, db)

    return CustomerAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        uaid=uaid_val,
        phone=user.phone,
        email=user.email,
        role=user.role.value,
        has_referral=status_data["has_valid_referral"],
        is_reward_eligible=status_data["is_reward_eligible"]
    )

@router.post("/auth/refresh", response_model=CustomerRefreshTokenResponse, summary="Customer Token Refresh (Native Mobile)")
async def customer_refresh_token(
    payload: CustomerRefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Dedicated token refresh endpoint for native mobile clients.
    Accepts the refresh token via JSON payload and returns the rotated token pair.

    Security Architecture:
    - Enforces single-use refresh token rotation with immediate hash invalidation.
    - Uses row-level locking (with_for_update) to prevent race conditions.
    - Bound to persistent UserSession in PostgreSQL.
    - Does not use cookies; safe from cross-site request forgery (CSRF).
    """
    device_info = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None

    new_access_token, new_refresh_token, expires_in = await AuthService.rotate_refresh_token(
        db=db,
        refresh_token=payload.refresh_token,
        device_info=device_info,
        ip_address=ip_address
    )

    return CustomerRefreshTokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=expires_in
    )

@router.post("/auth/logout", summary="Customer Session Logout (Native Mobile)")
async def customer_logout(
    request: Request,
    payload: Optional[CustomerLogoutRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Terminates the customer's native mobile session.
    Revokes the specific session in UserSession or all sessions if all_devices=True.
    """
    target_token = payload.refresh_token if payload else None
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

    return {
        "success": True,
        "message": "Customer mobile session terminated.",
        "sessions_revoked": revoked_count
    }

# ─────────────────────────────────────────────────────────────────────────────
# 3. Profile & UAID Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile", summary="Get Customer Profile")
async def get_customer_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(current_user.id, db)
    status_data = await customer_reward_service.get_customer_reward_status(current_user.id, db)

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "uaid": uaid_val,
        "role": current_user.role.value,
        "has_referral": status_data["has_valid_referral"],
        "referrer_uaid": status_data["referrer_uaid"],
        "is_reward_eligible": status_data["is_reward_eligible"],
        "qualifying_purchase_total": status_data["qualifying_purchase_total"],
        "reward_entry_threshold": CUSTOMER_ENTRY_THRESHOLD,
        "current_level": status_data["current_level"],
        "current_rank": status_data["current_rank"],
        "current_cycle": status_data["current_cycle"],
        "quarterly_status": status_data["quarterly_activity_status"],
        "created_at": current_user.created_at
    }

@router.put("/profile", summary="Update Customer Profile (UAID remains unchanged)")
async def update_customer_profile(
    payload: CustomerProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Rule 4: Profile updates MUST NOT change the UAID
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.email is not None:
        current_user.email = payload.email

    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Profile updated successfully. UAID remains permanent and unchanged.",
        "full_name": current_user.full_name,
        "email": current_user.email,
        "uaid": current_user.uaid
    }

@router.get("/uaid", summary="Display Customer UAID with QR code and share data")
async def get_customer_uaid(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(current_user.id, db)
    return {
        "uaid": uaid_val,
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "qr_payload": f"NRY_CUSTOMER:{uaid_val}",
        "share_url": f"https://noryvanta.in/c/join?ref={uaid_val}",
        "can_copy": True
    }

@router.get("/profile/addresses", response_model=List[CustomerAddress], summary="Get Customer Addresses")
async def get_customer_addresses(current_user: User = Depends(get_current_user)):
    return _CUSTOMER_ADDRESSES.get(current_user.id, [])

@router.post("/profile/addresses", response_model=CustomerAddress, summary="Save Customer Address")
async def save_customer_address(
    payload: CustomerAddress,
    current_user: User = Depends(get_current_user)
):
    addr_dict = payload.model_dump()
    addr_dict["id"] = addr_dict.get("id") or str(uuid.uuid4())

    if current_user.id not in _CUSTOMER_ADDRESSES:
        _CUSTOMER_ADDRESSES[current_user.id] = []

    if payload.is_default:
        for a in _CUSTOMER_ADDRESSES[current_user.id]:
            a["is_default"] = False

    _CUSTOMER_ADDRESSES[current_user.id].append(addr_dict)
    return CustomerAddress(**addr_dict)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Customer Referral Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/referrals/validate", summary="Validate Customer Referral Code")
async def validate_referral_code(
    payload: CustomerReferralValidateReq,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return await customer_reward_service.validate_customer_referral(
        referrer_code_or_uaid=payload.referral_code,
        referee_user_id=user_id or "ANONYMOUS",
        db=db
    )

@router.post("/referrals/apply", summary="Apply Customer Referral Code")
async def apply_referral_code(
    payload: CustomerReferralApplyReq,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await customer_reward_service.apply_customer_referral(
        referee_user_id=current_user.id,
        referrer_code_or_uaid=payload.referral_code,
        db=db
    )
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.get("/referrals/my-code", summary="Get Customer's Own Referral Code & Share Link")
async def get_my_referral_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    uaid_val, _ = await uaid_service.get_or_create_customer_uaid(current_user.id, db)
    return {
        "uaid": uaid_val,
        "referral_code": uaid_val,
        "share_url": f"https://noryvanta.in/c/join?ref={uaid_val}",
        "share_message": f"Join Noryvanta using my referral UAID: {uaid_val} to unlock premium marketplace rewards!",
        "qr_payload": f"NRY_REFERRAL:{uaid_val}"
    }

@router.get("/referrals/network", summary="Get Customer's Referral Network Summary")
async def get_my_referral_network(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Referral)
        .where(Referral.referrer_user_id == current_user.id)
        .order_by(Referral.created_at.desc())
    )
    referrals = (await db.execute(stmt)).scalars().all()

    # Calculate referral volume
    vol_stmt = select(func.coalesce(func.sum(ReferralTransaction.eligible_amount), 0.0)).where(
        and_(
            ReferralTransaction.referrer_user_id == current_user.id,
            ReferralTransaction.is_referral_purchase == True,
            ReferralTransaction.is_self_purchase == False,
            ReferralTransaction.status == "COMPLETED"
        )
    )
    qualifying_vol = float((await db.execute(vol_stmt)).scalar() or 0.0)

    members_list = []
    for r in referrals:
        buyer = await db.get(User, r.referred_user_id)
        members_list.append({
            "referral_id": r.id,
            "referred_uaid": r.referred_uaid or "NRY-C-MEMBER",
            "full_name": buyer.full_name if buyer else "Customer",
            "joined_at": r.created_at,
            "status": r.status
        })

    return {
        "total_referrals": len(referrals),
        "qualifying_referral_volume": round(qualifying_vol, 2),
        "members": members_list
    }

# ─────────────────────────────────────────────────────────────────────────────
# 5. Product & Service Marketplace Browsing
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/marketplace/products", summary="Browse Marketplace Products")
async def browse_marketplace_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).where(
        and_(
            Product.type == ListingType.PRODUCT,
            Product.is_active == True,
            Product.status.in_([ListingStatus.ACTIVE, ListingStatus.APPROVED, ListingStatus.PUBLISHED])
        )
    )

    if category:
        query = query.where(Product.category.ilike(f"%{category}%"))
    if search:
        query = query.where(or_(Product.title.ilike(f"%{search}%"), Product.description.ilike(f"%{search}%")))
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)

    query = query.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    products = (await db.execute(query)).scalars().all()

    return [
        {
            "id": p.id,
            "title": p.title,
            "category": p.category,
            "subcategory": p.subcategory,
            "base_price": p.base_price,
            "currency": p.currency,
            "unit": p.unit,
            "moq": p.moq,
            "stock_quantity": p.stock_quantity,
            "images": p.images or [],
            "short_description": p.short_description
        }
        for p in products
    ]

@router.get("/marketplace/products/{product_id}", summary="Get Product Details")
async def get_marketplace_product_detail(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found.")

    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "short_description": product.short_description,
        "category": product.category,
        "subcategory": product.subcategory,
        "base_price": product.base_price,
        "currency": product.currency,
        "unit": product.unit,
        "moq": product.moq,
        "stock_quantity": product.stock_quantity,
        "gst_rate": product.gst_rate,
        "images": product.images or [],
        "specifications": product.specifications or {},
        "business_id": product.business_id
    }

@router.get("/marketplace/services", summary="Browse Marketplace Services")
async def browse_marketplace_services(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).where(
        and_(
            Product.type == ListingType.SERVICE,
            Product.is_active == True,
            Product.status.in_([ListingStatus.ACTIVE, ListingStatus.APPROVED, ListingStatus.PUBLISHED])
        )
    )

    if category:
        query = query.where(Product.category.ilike(f"%{category}%"))
    if search:
        query = query.where(or_(Product.title.ilike(f"%{search}%"), Product.description.ilike(f"%{search}%")))

    query = query.order_by(Product.created_at.desc()).offset(offset).limit(limit)
    services = (await db.execute(query)).scalars().all()

    return [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "base_price": s.base_price,
            "currency": s.currency,
            "unit": s.unit,
            "images": s.images or [],
            "short_description": s.short_description
        }
        for s in services
    ]

@router.get("/marketplace/services/{service_id}", summary="Get Service Details")
async def get_marketplace_service_detail(service_id: str, db: AsyncSession = Depends(get_db)):
    service = await db.get(Product, service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found.")

    return {
        "id": service.id,
        "title": service.title,
        "description": service.description,
        "short_description": service.short_description,
        "category": service.category,
        "base_price": service.base_price,
        "currency": service.currency,
        "unit": service.unit,
        "gst_rate": service.gst_rate,
        "images": service.images or [],
        "specifications": service.specifications or {},
        "provider_id": service.business_id
    }

# ─────────────────────────────────────────────────────────────────────────────
# 6. Cart & Checkout Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cart", summary="Get Customer Shopping Cart")
async def get_cart(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user_items = _CUSTOMER_CARTS.get(current_user.id, [])
    output_items = []
    subtotal = 0.0
    gst_total = 0.0

    for item in user_items:
        p = await db.get(Product, item["product_id"])
        if not p:
            continue
        line_sub = round(p.base_price * item["quantity"], 2)
        line_gst = round(line_sub * ((p.gst_rate or 18.0) / 100.0), 2)
        line_tot = line_sub + line_gst
        subtotal += line_sub
        gst_total += line_gst

        output_items.append({
            "item_id": item["item_id"],
            "product_id": p.id,
            "title": p.title,
            "unit_price": p.base_price,
            "gst_rate": p.gst_rate or 18.0,
            "quantity": item["quantity"],
            "line_total": line_tot,
            "images": p.images or []
        })

    return {
        "items": output_items,
        "subtotal": round(subtotal, 2),
        "gst_total": round(gst_total, 2),
        "delivery_charges": 0.0,
        "total_payable": round(subtotal + gst_total, 2),
        "item_count": sum(it["quantity"] for it in output_items)
    }

@router.post("/cart/items", summary="Add Item to Cart")
async def add_cart_item(
    payload: CartItemPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    product = await db.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found or inactive.")

    if current_user.id not in _CUSTOMER_CARTS:
        _CUSTOMER_CARTS[current_user.id] = []

    existing = next((i for i in _CUSTOMER_CARTS[current_user.id] if i["product_id"] == payload.product_id), None)
    if existing:
        existing["quantity"] += payload.quantity
    else:
        _CUSTOMER_CARTS[current_user.id].append({
            "item_id": str(uuid.uuid4()),
            "product_id": payload.product_id,
            "quantity": payload.quantity
        })

    return await get_cart(current_user, db)

@router.patch("/cart/items/{item_id}", summary="Update Cart Item Quantity")
async def update_cart_item_qty(
    item_id: str,
    quantity: int = Query(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_items = _CUSTOMER_CARTS.get(current_user.id, [])
    item = next((i for i in user_items if i["item_id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    item["quantity"] = quantity
    return await get_cart(current_user, db)

@router.delete("/cart/items/{item_id}", summary="Remove Item from Cart")
async def remove_cart_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.id in _CUSTOMER_CARTS:
        _CUSTOMER_CARTS[current_user.id] = [i for i in _CUSTOMER_CARTS[current_user.id] if i["item_id"] != item_id]
    return await get_cart(current_user, db)

@router.post("/cart/checkout", summary="Checkout Customer Cart to Order")
async def checkout_cart(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_items = _CUSTOMER_CARTS.get(current_user.id, [])
    if not user_items:
        raise HTTPException(status_code=400, detail="Cart is empty.")

    # Calculate authoritative order totals from database products
    subtotal = 0.0
    gst_total = 0.0
    order_items_to_add = []
    business_id = None

    for item in user_items:
        p = await db.get(Product, item["product_id"])
        if not p:
            continue
        if not business_id:
            business_id = p.business_id
        line_sub = round(p.base_price * item["quantity"], 2)
        line_gst = round(line_sub * ((p.gst_rate or 18.0) / 100.0), 2)
        line_tot = line_sub + line_gst
        subtotal += line_sub
        gst_total += line_gst

        order_items_to_add.append(
            OrderItem(
                product_id=p.id,
                quantity=item["quantity"],
                unit_price=p.base_price,
                gst_rate=p.gst_rate or 18.0,
                line_total=line_tot
            )
        )

    if not business_id:
        # Fallback vendor if not found
        business_id = "default-business-id"

    order_num = f"ORD-C-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

    # Handle Section 7 Non-withdrawable Reward Points redemption
    points_redeemed = 0.0
    if payload.points_to_redeem > 0:
        reward_status = await customer_reward_service.get_customer_reward_status(current_user.id, db)
        avail_redeemable = float(reward_status.get("wallet", {}).get("redeemable_points", 0.0))
        if payload.points_to_redeem > avail_redeemable:
            raise HTTPException(
                status_code=400,
                detail=f"Requested points ({payload.points_to_redeem}) exceed available redeemable points ({avail_redeemable})."
            )
        # Cannot redeem more than subtotal
        points_redeemed = min(payload.points_to_redeem, subtotal)

    net_payable = max(0.0, round(subtotal + gst_total - points_redeemed, 2))

    order = Order(
        order_number=order_num,
        customer_id=current_user.id,
        business_id=business_id,
        subtotal=round(subtotal, 2),
        merchant_discount=round(points_redeemed, 2),
        gst_total=round(gst_total, 2),
        customer_charges=0.0,
        total_customer_payable=net_payable,
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.SUCCESSFUL,
        payment_method=payload.payment_method,
        shipping_address=payload.shipping_address.model_dump(),
        notes=payload.notes,
        items=order_items_to_add
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # If points were redeemed, append immutable ledger entry
    if points_redeemed > 0:
        member = await customer_reward_service.get_or_create_customer_member(current_user.id, db)
        redemption_log = RewardLedger(
            user_id=current_user.id,
            member_id=member.id,
            cycle_number=member.current_cycle_number,
            rank_number=0,
            rank_name="Points Redemption",
            qualification_level=0,
            business_type="CUSTOMER",
            gross_amount=points_redeemed,
            tax_amount=0.0,
            eligible_amount=points_redeemed,
            qualification_amount=0.0,
            reward_rate=0.0,
            reward_amount=-points_redeemed,
            currency="INR",
            reward_type="POINTS_REDEMPTION",
            status="REDEEMED",
            transaction_id=order.id,
            verified_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        db.add(redemption_log)
        await db.commit()

    # Empty user's cart
    _CUSTOMER_CARTS[current_user.id] = []

    # Process Customer Reward qualification and referral upline
    eval_res = await customer_reward_service.process_customer_purchase(order.id, db)

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "subtotal": order.subtotal,
        "points_redeemed": points_redeemed,
        "total_amount": order.total_customer_payable,
        "order_status": order.order_status.value,
        "payment_status": order.payment_status.value,
        "reward_evaluation": eval_res
    }

# ─────────────────────────────────────────────────────────────────────────────
# 7. Orders & Service Bookings
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/orders", summary="Get Customer Order History")
async def get_customer_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.customer_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": o.id,
            "order_number": o.order_number,
            "subtotal": o.subtotal,
            "gst_total": o.gst_total,
            "total_amount": o.total_customer_payable,
            "order_status": o.order_status.value,
            "payment_status": o.payment_status.value,
            "created_at": o.created_at,
            "items_count": len(o.items),
            "items": [
                {
                    "title": it.product.title if it.product else "Product",
                    "quantity": it.quantity,
                    "unit_price": it.unit_price,
                    "line_total": it.line_total,
                    "images": it.product.images if it.product else []
                }
                for it in o.items
            ]
        }
        for o in orders
    ]

@router.get("/orders/{order_id}", summary="Get Order Details")
async def get_customer_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(and_(Order.id == order_id, Order.customer_id == current_user.id))
    )
    order = (await db.execute(stmt)).scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {
        "id": order.id,
        "order_number": order.order_number,
        "subtotal": order.subtotal,
        "gst_total": order.gst_total,
        "shipping_charges": order.customer_charges,
        "total_amount": order.total_customer_payable,
        "order_status": order.order_status.value,
        "payment_status": order.payment_status.value,
        "payment_method": order.payment_method,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at,
        "items": [
            {
                "product_id": it.product_id,
                "title": it.product.title if it.product else "Product",
                "quantity": it.quantity,
                "unit_price": it.unit_price,
                "line_total": it.line_total,
                "images": it.product.images if it.product else []
            }
            for it in order.items
        ]
    }

@router.post("/orders/{order_id}/cancel", summary="Cancel Customer Order and Reconcile")
async def cancel_customer_order(
    order_id: str,
    reason: str = Query("Customer requested cancellation"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    order = await db.get(Order, order_id)
    if not order or order.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.order_status in [OrderStatus.DELIVERED, OrderStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail="Delivered orders cannot be cancelled directly. Request return/refund instead.")

    order.order_status = OrderStatus.CANCELLED
    order.payment_status = PaymentStatus.REFUND_INITIATED
    await db.commit()

    # Check if this order had reward points redeemed, and compensate
    red_stmt = select(RewardLedger).where(
        and_(
            RewardLedger.transaction_id == order.id,
            RewardLedger.reward_type == "POINTS_REDEMPTION",
            RewardLedger.status == "REDEEMED"
        )
    )
    red_entry = (await db.execute(red_stmt)).scalars().first()
    refunded_points = 0.0
    if red_entry:
        member = await customer_reward_service.get_or_create_customer_member(current_user.id, db)
        refunded_points = abs(red_entry.reward_amount)
        comp_log = RewardLedger(
            user_id=current_user.id,
            member_id=member.id,
            cycle_number=member.current_cycle_number,
            rank_number=0,
            rank_name="Points Refund",
            qualification_level=0,
            business_type="CUSTOMER",
            gross_amount=refunded_points,
            tax_amount=0.0,
            eligible_amount=refunded_points,
            qualification_amount=0.0,
            reward_rate=0.0,
            reward_amount=refunded_points,
            currency="INR",
            reward_type="POINTS_REFUND",
            status="APPROVED",
            transaction_id=order.id,
            verified_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        db.add(comp_log)

    # Reconcile customer reward ledger & level reversals
    rec_res = await customer_reward_service.reconcile_refund_or_cancellation(
        order_id=order.id,
        refund_amount=order.total_customer_payable,
        reason=reason,
        db=db
    )

    return {
        "success": True,
        "order_id": order.id,
        "order_status": "CANCELLED",
        "refund_status": "REFUND_INITIATED",
        "refunded_points": refunded_points,
        "reconciliation": rec_res
    }

@router.post("/bookings/create", summary="Create Service Booking")
async def create_service_booking(
    payload: ServiceBookingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = await db.get(Product, payload.service_id)
    if not service or service.type != ListingType.SERVICE:
        raise HTTPException(status_code=404, detail="Service not found.")

    booking_num = f"BK-C-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    line_sub = service.base_price
    line_gst = round(line_sub * ((service.gst_rate or 18.0) / 100.0), 2)
    tot = line_sub + line_gst

    order = Order(
        order_number=booking_num,
        customer_id=current_user.id,
        business_id=service.business_id,
        subtotal=line_sub,
        gst_total=line_gst,
        total_customer_payable=tot,
        order_status=OrderStatus.CONFIRMED,
        payment_status=PaymentStatus.SUCCESSFUL,
        shipping_address=payload.address.model_dump(),
        notes=f"Scheduled Date: {payload.scheduled_date}. Note: {payload.notes or ''}",
        items=[
            OrderItem(
                product_id=service.id,
                quantity=1,
                unit_price=service.base_price,
                gst_rate=service.gst_rate or 18.0,
                line_total=tot
            )
        ]
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Process reward qualification
    eval_res = await customer_reward_service.process_customer_purchase(order.id, db)

    return {
        "success": True,
        "booking_id": order.id,
        "booking_number": order.order_number,
        "service_title": service.title,
        "scheduled_date": payload.scheduled_date,
        "total_amount": tot,
        "reward_evaluation": eval_res
    }

@router.get("/bookings", summary="Get Customer Service Bookings")
async def get_customer_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(Order.customer_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = (await db.execute(stmt)).scalars().all()

    bookings = []
    for o in orders:
        if o.order_number.startswith("BK-") or any(it.product and it.product.type == ListingType.SERVICE for it in o.items):
            first_item = o.items[0] if o.items else None
            bookings.append({
                "id": o.id,
                "booking_number": o.order_number,
                "service_title": first_item.product.title if first_item and first_item.product else "Service Booking",
                "status": o.order_status.value,
                "total_amount": o.total_customer_payable,
                "notes": o.notes,
                "created_at": o.created_at
            })
    return bookings

# ─────────────────────────────────────────────────────────────────────────────
# 8. Customer Rewards, Levels, Ranks, Cycles & Quarterly Activity
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/rewards/status", summary="Authoritative Customer Reward Status")
async def get_reward_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await customer_reward_service.get_customer_reward_status(current_user.id, db)

@router.get("/rewards/rates", summary="Authoritative 1.10% to 2.20% Reward Rate Structure")
async def get_reward_rates():
    return {
        "minimum_unit_per_level": CUSTOMER_UNIT_PER_LEVEL,
        "entry_threshold": CUSTOMER_ENTRY_THRESHOLD,
        "ranks": [
            {
                "rank_number": r["number"],
                "rank_name": r["name"],
                "start_level": r["start"],
                "end_level": r["end"],
                "completion_level": r["completion"],
                "reward_rate": r["default_rate"],
                "rate_display": f"{r['default_rate']:.2f}%"
            }
            for r in RANKS_SPECIFICATION
        ]
    }

@router.get("/levels", summary="120-Level Progression and Qualification Details")
async def get_levels_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    member = await customer_reward_service.get_or_create_customer_member(current_user.id, db)

    curr_cycle_stmt = select(NetworkCycle).where(
        and_(
            NetworkCycle.member_id == member.id,
            NetworkCycle.cycle_number == member.current_cycle_number
        )
    )
    curr_cycle = (await db.execute(curr_cycle_stmt)).scalars().first()

    stmt = select(NetworkLevelRecord).where(
        and_(
            NetworkLevelRecord.member_id == member.id,
            NetworkLevelRecord.cycle_id == (curr_cycle.id if curr_cycle else None)
        )
    ).order_by(NetworkLevelRecord.level_number.asc())

    records = (await db.execute(stmt)).scalars().all() if curr_cycle else []

    return [
        {
            "level_number": l.level_number,
            "rank_name": l.rank_name,
            "status": l.status.value,
            "level_required_amount": CUSTOMER_UNIT_PER_LEVEL,
            "qualification_status": l.qualification_status,
            "verification_status": l.verification_status,
            "completed_at": l.completed_at
        }
        for l in records
    ]

@router.get("/ranks", summary="12-Rank Progression Summary")
async def get_ranks_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    member = await customer_reward_service.get_or_create_customer_member(current_user.id, db)
    curr_lvl = member.current_level_number

    # Query paid rank rewards
    r_stmt = select(RewardLedger).where(
        and_(
            RewardLedger.user_id == current_user.id,
            RewardLedger.cycle_number == member.current_cycle_number,
            RewardLedger.reward_type == "RANK_COMPLETION"
        )
    )
    paid_rewards = {r.rank_number: r.status for r in (await db.execute(r_stmt)).scalars().all()}

    ranks_out = []
    for r in RANKS_SPECIFICATION:
        is_completed = curr_lvl >= r["completion"]
        is_current = r["start"] <= curr_lvl <= r["end"]
        status_val = paid_rewards.get(r["number"], "REWARDED") if is_completed else ("IN_PROGRESS" if is_current else "LOCKED")

        ranks_out.append({
            "rank_number": r["number"],
            "rank_name": r["name"],
            "start_level": r["start"],
            "end_level": r["end"],
            "completion_level": r["completion"],
            "reward_rate": r["default_rate"],
            "rate_display": f"{r['default_rate']:.2f}%",
            "is_completed": is_completed,
            "is_current": is_current,
            "status": status_val
        })

    return ranks_out

@router.get("/cycles", summary="Cycle 1 and Historical Cycle Tracker")
async def get_cycles_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    member = await customer_reward_service.get_or_create_customer_member(current_user.id, db)
    stmt = select(NetworkCycle).where(NetworkCycle.member_id == member.id).order_by(NetworkCycle.cycle_number.asc())
    cycles = (await db.execute(stmt)).scalars().all()

    return [
        {
            "cycle_number": c.cycle_number,
            "status": c.status.value,
            "current_level": c.current_level,
            "carry_forward_in": c.carry_forward_in,
            "carry_forward_out": c.carry_forward_out,
            "started_at": c.started_at,
            "completed_at": c.completed_at
        }
        for c in cycles
    ]

@router.get("/rewards/ledger", summary="Customer Reward Ledger")
async def get_customer_reward_ledger(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(RewardLedger)
        .where(RewardLedger.user_id == current_user.id)
        .order_by(RewardLedger.created_at.desc())
    )
    records = (await db.execute(stmt)).scalars().all()

    return [
        {
            "id": r.id,
            "cycle_number": r.cycle_number,
            "rank_number": r.rank_number,
            "rank_name": r.rank_name,
            "qualification_level": r.qualification_level,
            "reward_rate": r.reward_rate,
            "reward_amount": r.reward_amount,
            "currency": r.currency,
            "reward_type": r.reward_type,
            "status": r.status,
            "created_at": r.created_at
        }
        for r in records
    ]

@router.get("/activity/quarterly", summary="Customer Quarterly Purchase Activity & Warnings")
async def get_quarterly_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    evaluation = await quarterly_service.evaluate_progressive_account_status(current_user.id, db)

    # Fetch recorded quarter activities
    stmt = (
        select(QuarterlyAccountActivity)
        .where(QuarterlyAccountActivity.user_id == current_user.id)
        .order_by(QuarterlyAccountActivity.calendar_year.desc(), QuarterlyAccountActivity.quarter.desc())
    )
    history = (await db.execute(stmt)).scalars().all()

    curr_year, curr_quarter = quarterly_service.get_quarter_for_date()

    return {
        "current_quarter": f"{curr_quarter} {curr_year}",
        "account_activity_status": evaluation["account_activity_status"],
        "warning_stage": evaluation["current_warning_stage"],
        "warning_message": evaluation["warning_message"],
        "missed_quarter_count": evaluation["missed_quarter_count"],
        "grace_period_end_date": evaluation["grace_period_end_date"],
        "is_reward_eligible": evaluation["is_reward_eligible"],
        "history": [
            {
                "year": h.calendar_year,
                "quarter": h.quarter,
                "qualifying_purchase_count": h.qualifying_purchase_count,
                "quarter_status": h.quarter_status,
                "evaluated_at": h.evaluated_at
            }
            for h in history
        ]
    }

@router.get("/notifications", summary="Customer In-App Notifications and Alerts")
async def get_customer_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    status_data = await customer_reward_service.get_customer_reward_status(current_user.id, db)
    notifications = []

    if not status_data["has_valid_referral"]:
        notifications.append({
            "id": "notif-referral-needed",
            "title": "Enter a Referral Code",
            "message": "Enter your Customer Referral UAID (NRY-C-XXXX) to unlock the Customer Reward Program.",
            "type": "info",
            "created_at": datetime.now(timezone.utc)
        })

    if status_data["has_valid_referral"] and not status_data["threshold_satisfied"]:
        remaining = max(0.0, round(CUSTOMER_ENTRY_THRESHOLD - status_data["qualifying_purchase_total"], 2))
        notifications.append({
            "id": "notif-threshold-progress",
            "title": "Reward Threshold Progress",
            "message": f"You have INR {status_data['qualifying_purchase_total']} in purchases. Purchase INR {remaining} more to enter the Reward System!",
            "type": "reward",
            "created_at": datetime.now(timezone.utc)
        })

    if status_data["is_reward_eligible"]:
        notifications.append({
            "id": "notif-reward-active",
            "title": "Reward System Active!",
            "message": f"You are actively earning rewards! Current Rank: {status_data['current_rank']} (Level {status_data['current_level']}).",
            "type": "success",
            "created_at": datetime.now(timezone.utc)
        })

    return notifications

# ─────────────────────────────────────────────────────────────────────────────
# 9. Non-Withdrawable Reward Points Policy Enforcement (Section 7)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/rewards/withdraw", summary="Reject Cash Withdrawal of Reward Points")
async def customer_withdraw_points(current_user: User = Depends(get_current_user)):
    """
    Enforces Section 7:
    Customer rewards are strictly non-withdrawable store points (1 Pt = INR 1).
    Points cannot be converted to bank deposits, UPI transfers, or cash.
    They can only be used as checkout purchase credits for eligible Products and Services on Noryvanta.
    """
    raise HTTPException(
        status_code=400,
        detail=(
            "Customer reward points are non-withdrawable. Points are strictly non-cash store credits "
            "with INR-equivalent value (1 Pt = ₹1) that can only be redeemed towards eligible Product and "
            "Service purchases on Noryvanta. Bank and UPI transfers are not permitted."
        )
    )

# ─────────────────────────────────────────────────────────────────────────────
# 10. Customer UAID Reactivation Form & Processing (Section 14)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reactivation/requirement", summary="Get Customer Reactivation Requirement")
async def get_customer_reactivation_requirement(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates server-side required reactivation purchase:
    Formula: Required Amount = INR 2,000 × number of missed quarters.
    (e.g., 4 missed quarters = INR 8,000).
    Never trusts frontend-provided amounts.
    """
    return await quarterly_service.calculate_reactivation_requirement(user_id=current_user.id, db=db)

@router.post("/reactivation/submit", summary="Submit Customer Reactivation Form")
async def submit_customer_reactivation_form(
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits customer reactivation form. Backend calculates requirement authoritatively.
    """
    return await quarterly_service.submit_reactivation_form(
        user_id=current_user.id,
        db=db,
        notes=notes
    )

@router.post("/reactivation/process", summary="Process Customer Qualifying Reactivation Purchase")
async def process_customer_reactivation_purchase(
    reactivation_id: str,
    order_id: str,
    amount_paid: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies qualifying purchase and restores customer account status:
    - Amount paid must satisfy required amount (INR 2,000 × missed quarters).
    - Preserves existing Customer UAID (zero duplicate UAIDs created).
    - Preserves all historical cycles, ranks, rewards, and orders.
    """
    return await quarterly_service.process_reactivation_purchase(
        user_id=current_user.id,
        reactivation_id=reactivation_id,
        order_id=order_id,
        amount_paid=amount_paid,
        payment_status="PAYMENT_SUCCESS",
        order_status="COMPLETED",
        db=db
    )
