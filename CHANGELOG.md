# CHANGELOG
All notable changes to the Noryvanta Business Marketplace Platform.

Format: `[DATE] | [TYPE] | [SCOPE] | [Description]`
Types: `SECURITY` | `FIX` | `FEAT` | `REFACTOR` | `DOCS` | `TEST` | `INFRA`

---

## [2026-09-24] — Priority 1 Security & Correctness Fixes

### SECURITY | CORS
- **File:** `backend/app/main.py`
- **Change:** Replaced `allow_origins=["*"]` with `settings.BACKEND_CORS_ORIGINS` (explicit list).
  - `allow_origins=["*"]` combined with `allow_credentials=True` is invalid per the browser CORS spec
    (browsers reject credentialed requests to wildcard origins).
  - Explicit methods and headers now enumerated instead of `["*"]`.
- **Impact:** CORS will now correctly allow the configured frontend origins only.

### SECURITY | Admin API Authentication
- **File:** `backend/app/api/deps.py`
- **Change:** Added `get_current_admin` FastAPI dependency that enforces `RoleEnum.ADMIN`.
  Raises HTTP 403 if authenticated user is not an admin.
- **File:** `backend/app/api/v1/endpoints/admin.py`
- **Change:** All three admin routes (`/fees/summary`, `/routing`, `/ranks`) now require
  `_admin: User = Depends(get_current_admin)`. Previously callable by any unauthenticated request.

### SECURITY | OTP Master Bypass
- **File:** `backend/app/services/otp_service.py`
- **Change:** Master OTP code `"123456"` is now gated behind `settings.APP_ENV == "development"`.
  In staging/production (`APP_ENV=staging` or `APP_ENV=production`), the bypass is fully disabled.
  All OTPs must be genuinely verified against the database.
- **Config required:** Set `APP_ENV=production` in `.env` before deploying.

### FIX | Platform Fee Business Rule
- **File:** `backend/app/core/config.py`
- **Change:** `PLATFORM_COMMISSION_PERCENT` corrected from `3.0` to `10.0`.
  - Business specification: Noryvanta charges the BUSINESS OWNER a 10% platform fee.
  - This fee is deducted from the vendor's proceeds and is NOT shown to the customer.
  - Historical transactions retain the fee rate locked at order creation time (stored in `Order.platform_fee`).
  - Added `APP_ENV` setting (development/staging/production).

### FIX | Order List RBAC
- **File:** `backend/app/api/v1/endpoints/orders.py`
- **Change:** Fixed `current_user.role == "BUYER"` (string comparison) to `current_user.role == RoleEnum.BUYER`
  (enum comparison). The old string comparison always evaluated to `False` because SQLAlchemy
  deserializes enum columns as `RoleEnum` instances, not strings.
- **Enhancement:** Vendors now see orders scoped to their business (`Order.vendor_id == biz_id`).
  Admins see all orders (no filter). Buyers see only their own orders.
- **Added:** `RoleEnum` import to `orders.py`.

### REFACTOR | deps.py Cleanup
- **File:** `backend/app/api/deps.py`
- **Change:** Moved `TupleUserBiz` class definition before its use in `get_current_vendor` type hint
  (was a forward-reference error). Replaced with proper `Tuple[User, Optional[BusinessProfile]]` hint.
  Added `WWW-Authenticate: Bearer` headers to 401 responses per RFC 6750.
  Fixed inactive user from HTTP 400 to HTTP 403.

### FIX | Admin Fee Summary — Remove Hardcoded Mock Fallbacks
- **File:** `backend/app/api/v1/endpoints/admin.py`
- **Change:** `get_fee_summary` previously returned hardcoded values (`24850000.0`, `745500.0`, etc.)
  when the database was empty. Now returns real zeros. Added real counts for pending/settled escrows.

---

## [2026-09-23] — Initial UI Completion (prior session)

### FEAT | Frontend — All 14 Stitch screens implemented
- Routes: `/`, `/login`, `/register`, `/dashboard`, `/products`, `/products/[id]`,
  `/checkout`, `/orders`, `/orders/[id]`, `/ai-assistant`, `/rank-tracker`,
  `/admin/fees`, `/admin/routing`, `/vendor/profile`
- Build verified: `npm run build` → 15/15 routes, exit 0.
- Backend tests verified: 4/4 passing.

### FEAT | Backend — Core MVP
- FastAPI + async SQLAlchemy + SQLite dev DB
- Auth: OTP + JWT access/refresh tokens
- Models: User, OTPRecord, BusinessProfile, Product, TieredPrice, Order, OrderItem, EscrowTransaction, FeeLedger
- API endpoints: auth, products, orders, escrow, businesses, admin, health
- AI listing assistant (rule-based)
- Docker Compose full-stack definition
- Celery worker stubs

---

## Known Issues / Next Priorities

| Priority | Issue |
|----------|-------|
| P2 | Git not initialized — `git init` needed |
| P2 | No Alembic migrations — only `create_all()` |
| P2 | Minimum 6-image backend enforcement not implemented |
| P2 | Docker infra files missing: `infra/postgres/init.sql`, Grafana dirs |
| P3 | No Razorpay/Cashfree payment gateway integration |
| P3 | No network/120-level rank system backend model |
| P3 | No KYC document upload |
| P3 | OTP SMS/email delivery is log-only (no real MSG91/SES) |
| P3 | OAuth SSO does not verify OIDC token |
| P4 | Dashboard, rank-tracker, orders/[id] use hardcoded mock data |
