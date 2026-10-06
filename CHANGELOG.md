# CHANGELOG
All notable changes to the Noryvanta Business Marketplace Platform.

Format: `[DATE] | [TYPE] | [SCOPE] | [Description]`
Types: `SECURITY` | `FIX` | `FEAT` | `REFACTOR` | `DOCS` | `TEST` | `INFRA`

## [2026-10-03] — Live Marketplace Engine & Home Page Architecture Extension

### FEAT | Marketplace REST APIs & Privacy Protection
- **File:** `backend/app/schemas/marketplace.py`, `backend/app/api/v1/endpoints/marketplace.py`
- **Endpoints:**
  - `GET /api/v1/marketplace/products`: Active products with sanitized public merchant profile
  - `GET /api/v1/marketplace/products/{id}`: Single active product detail
  - `GET /api/v1/marketplace/services`: Active services with sanitized provider profile
  - `GET /api/v1/marketplace/services/{id}`: Single active service detail
  - `GET /api/v1/marketplace/categories`: 12 canonical categories with live active counts
  - `GET /api/v1/marketplace/featured`: Curated active products & services for home page
  - `GET /api/v1/marketplace/search`: Multi-parameter search across products and services
- **Merchant Privacy Invariant:** Strict isolation of private financial credentials (`bank_account_number`, `bank_ifsc`, `pan`, `virtual_escrow_account_id` never exposed to public consumers).

### FEAT | Listing Approval Workflow & Active Visibility Rule
- **File:** `backend/app/models/product.py`, `backend/app/api/v1/endpoints/admin.py`, `backend/app/api/v1/endpoints/products.py`
- **Lifecycle:** `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `ACTIVE` | `REJECTED` | `SUSPENDED`.
- **Enforcement:** Non-active listings (Draft, Submitted, Under Review, Rejected, Suspended) are strictly hidden from public customers (`HTTP 404`).
- **Admin Review:** Added `/api/v1/admin/listings` review, `/approve`, `/reject`, `/suspend` with immutable `AuditLog`. Once approved to `ACTIVE`, listings appear immediately on Marketplace and Home Page without requiring recreation.

### FEAT | Home Page Live Integration & Multi-Tier Hierarchy
- **File:** `frontend/src/app/page.tsx`, `frontend/src/lib/api.ts`
- **Implementation:**
  - Consumes live backend APIs (`/marketplace/featured`, `/marketplace/categories`) with offline fallback.
  - Hierarchy: Products (Wholesalers, Distributors, Retailers) & Services (Registered Service Providers, Skilled Small-Scale Home Service Providers).
  - Actions: Interactive "Add to Cart" with notification toast, and "Buy Now" / "Book Service" CTAs.

### TEST | Automated Marketplace Suite
- **File:** `backend/tests/test_marketplace.py`
- **Coverage:** Verified active listing visibility, admin approval transition, merchant privacy isolation, and unified search. 71/71 tests passing.

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

## [2026-10-02] — Enterprise Integrations, Business Invariants & Alembic Migrations

### FEAT | Alembic Migration Sequence (Versions 001 to 004)
- Added sequential migration chain:
  - Version 001: `001_businesses_table.py`
  - Version 002: `002_add_gst_number.py`
  - Version 003: `003_add_verification_status.py`
  - Version 004: `004_add_business_category.py`
- Verified schema evolution using `alembic history`.

### FEAT | Business Rule Invariants & Server Validation
- Server-side validation enforcing minimum 6 images on listings (HTTP 422 on < 6).
- Zero customer platform fee guarantee maintained: customer pays only subtotal + taxes; 10% fee and 1% TDS are retained business-side during settlement ledger generation.
- Historical fee rate preservation in `Settlement` records.

### FEAT | External Integration Adapters
- **NotificationService**: Resend API integration with templates for Business Registered, Listing Approved, Order Received, Settlement Processed.
- **PushNotificationService**: Firebase FCM provider for New Order, Payment Successful, Listing Approved, Level Status Changed.
- **MapsService**: Google Maps Geocoding utility mapping structured address components to latitude and longitude.
- **TurnstileService**: Cloudflare Turnstile CAPTCHA bot protection on OTP and Google login.
- **Google OAuth Login**: `POST /api/v1/auth/google` exchanging verified Google identity for Noryvanta JWT session tokens.
- **PaymentService**: Razorpay & Cashfree adapters with HMAC-SHA256 signature verification and idempotency locks.
- **Prometheus Monitoring**: `GET /metrics` text-format scraping endpoint exporting platform counters and gauges.

### TEST | Complete Passing Test Suite
- 15 / 15 backend tests passing with pytest (`exit code 0`).
- 18 / 18 frontend Next.js routes compiled successfully (`exit code 0`).

---

## Known Issues / Next Priorities

| Priority | Issue / Task | Status |
|---|---|---|
| P1 | **Frontend-to-Backend Live API Client**: Implement unified client (`frontend/src/lib/api.ts`) and wire Next.js forms (Register, Login, Checkout, Dashboard) to live backend endpoints | Ready to Start |
| P2 | **Celery Asynchronous Batch Workers**: Formalize standalone worker script (`celery_worker.py`) for background AI batch image generation | In Progress |
| P3 | **Production SMS DLT Gateway**: Connect live Indian DLT-compliant SMS provider (e.g. Msg91) for production OTP delivery | Planned |

