# Noryvanta Business Marketplace — PROJECT STATUS
> **Audit Date:** 2026-09-24  
> **Session:** Resume from prior Antigravity session (quota-exhausted)  
> **Auditor:** New Antigravity session

---

## 1. Project Structure

```
Noryvanta_Web/
├── backend/                  FastAPI (Python) backend
│   ├── app/
│   │   ├── api/v1/endpoints/ auth, products, orders, escrow, businesses, admin, health
│   │   ├── core/             config, database, security
│   │   ├── models/           user, business, product, order, escrow
│   │   ├── schemas/          auth, business, product, order, escrow, user
│   │   ├── services/         ai_service, auth_service, escrow_service, otp_service
│   │   ├── tasks/            celery_app, worker_tasks
│   │   └── main.py           FastAPI app + DB seeder
│   ├── tests/                conftest, test_auth, test_escrow, test_products
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── noryvanta.db          SQLite dev DB (auto-created on startup)
│   └── entrypoint.sh
├── frontend/                 Next.js 15 App Router frontend
│   └── src/
│       ├── app/              14 pages (see section 9)
│       ├── components/       Navbar, Footer only
│       ├── contexts/         AuthContext, I18nContext
│       ├── lib/              api.ts (Axios)
│       └── locales/          en.json, hi.json
├── docs/                     12 spec docs (Design, API, Backend, etc.)
├── supabase/                 celery.md, database.md, redis.md (docs only)
├── infra/                    nginx, prometheus configs
├── docker-compose.yml        Full stack (db, redis, celery, frontend, backend, nginx, prometheus, grafana, opensearch)
├── .env.example              Full environment config template
└── PROJECT_STATUS.md         (this file)
```

---

## 2. What Is Already Completed

### Backend — Core Infrastructure
- [COMPLETED] FastAPI application scaffolding with lifespan management
- [COMPLETED] Async SQLAlchemy 2.0 with `aiosqlite` (SQLite dev) + `asyncpg` (PostgreSQL prod)
- [COMPLETED] Auto database table creation via `init_db()` on startup
- [COMPLETED] Demo data seeding on first run (vendor user, business profile, 4 products)
- [COMPLETED] Pydantic v2 settings with `.env` support
- [COMPLETED] CORS middleware (currently set to `allow_origins=["*"]` — see security issues)
- [COMPLETED] JWT access/refresh token generation (`HS256`)
- [COMPLETED] bcrypt password hashing via passlib
- [COMPLETED] `generate_secure_otp()` using `secrets.choice()` (cryptographically strong)
- [COMPLETED] OTP lifecycle: create, invalidate prior OTPs, verify with expiry
- [COMPLETED] Master dev bypass: OTP `"123456"` always passes (dev convenience, security risk in prod)

### Backend — Data Models
- [COMPLETED] `User` — id, phone, email, full_name, role (BUYER/VENDOR/ADMIN), is_active, is_verified
- [COMPLETED] `OTPRecord` — identifier, otp_code, expires_at, is_used
- [COMPLETED] `BusinessProfile` — legal_name, trade_name, business_type, gstin, pan, bank, escrow VA, kyc_status, tier, rating
- [COMPLETED] `Product` — title, slug, description, category, hsn_code, gst_rate, base_price, moq, stock_quantity, images (JSON), specifications (JSON), is_active
- [COMPLETED] `TieredPrice` — min_quantity, max_quantity, unit_price
- [COMPLETED] `Order` + `OrderItem` — order_number, buyer_id, vendor_id, subtotal, gst_total, platform_fee, total_amount, status, shipping_address, tracking_number
- [COMPLETED] `EscrowTransaction` — amount_locked, platform_fee_retained, tds_deducted, amount_disbursed, status (INITIATED/FUNDED/DISPATCHED/DELIVERED/RELEASED/DISPUTED/REFUNDED), payment_reference, settlement_reference
- [COMPLETED] `FeeLedger` — fee_type (PLATFORM_COMMISSION / TDS_SECTION_194O), amount, tax_percentage

### Backend — API Endpoints
- [COMPLETED] `POST /auth/otp/request` — OTP dispatch (dev preview in response)
- [COMPLETED] `POST /auth/otp/verify` — OTP verify + JWT generation + user provisioning
- [COMPLETED] `POST /auth/oauth/token` — SSO exchange (MOCK: synthesizes email, does not verify OIDC token)
- [COMPLETED] `POST /auth/token/refresh` — Refresh token rotation
- [COMPLETED] `GET /auth/me` — Authenticated user profile
- [COMPLETED] `GET /products` — List/search/filter products (active only)
- [COMPLETED] `GET /products/{id}` — Single product with tiered prices
- [COMPLETED] `POST /products` — Create product (requires business profile)
- [COMPLETED] `POST /products/ai-assist` — AI listing metadata generation (rule-based, no external AI)
- [COMPLETED] `POST /businesses/onboard` — Business profile creation (MOCK: always sets KYC=VERIFIED instantly)
- [COMPLETED] `GET /businesses/me` — Vendor's own business profile
- [COMPLETED] `POST /orders` — Create order with tiered pricing calculation and escrow init
- [COMPLETED] `GET /orders` — List orders (buyer-scoped)
- [COMPLETED] `GET /orders/{id}` — Single order detail
- [COMPLETED] `POST /escrow/{order_id}/deposit` — Fund order into escrow (FUNDED status)
- [COMPLETED] `POST /escrow/{order_id}/release` — Release with platform fee + TDS deduction
- [COMPLETED] `GET /escrow/{order_id}` — Escrow status + fee ledgers
- [COMPLETED] `GET /admin/fees/summary` — Financial KPI aggregate (falls back to hardcoded mock values if DB empty)
- [COMPLETED] `GET /admin/routing` — Payment gateway routing matrix (STATIC mock data)
- [COMPLETED] `GET /admin/ranks` — Vendor tier/rank config (STATIC mock data)
- [COMPLETED] `GET /health` — Health check endpoint

### Frontend — Pages
- [COMPLETED] `/` (homepage) — Hero, categories, stats, featured products
- [COMPLETED] `/login` — OTP request + verify (calls real API)
- [COMPLETED] `/register` — 4-step business onboarding (calls real API)
- [COMPLETED] `/dashboard` — Vendor/admin dashboard (MOCK DATA: all KPIs hardcoded)
- [COMPLETED] `/products` — Product catalog with search/filter (calls real API)
- [COMPLETED] `/products/[id]` — Product detail with tiered pricing (calls real API)
- [COMPLETED] `/checkout` — Checkout UI (MOCK DATA: no real payment gateway integration)
- [COMPLETED] `/orders` — Order list (calls real API)
- [COMPLETED] `/orders/[id]` — Order/settlement detail (MOCK DATA: uses hardcoded ORD-2024-001 etc.)
- [COMPLETED] `/ai-assistant` — AI listing wizard (calls real `/products/ai-assist` API + `/products` create)
- [COMPLETED] `/rank-tracker` — Vendor rank progress (MOCK DATA: all static)
- [COMPLETED] `/admin/fees` — Admin fee dashboard (calls real `/admin/fees/summary` API)
- [COMPLETED] `/admin/routing` — Payment routing matrix (calls real `/admin/routing` API)
- [COMPLETED] `/vendor/profile` — Vendor profile page (calls real `/businesses/me` API)

### Frontend — Infrastructure
- [COMPLETED] Next.js 15 App Router with TypeScript
- [COMPLETED] Tailwind CSS v3 with custom config (Sovereign Commerce colors)
- [COMPLETED] Axios API client with JWT Bearer interceptor and 401 auto-clear
- [COMPLETED] `AuthContext` — OTP login, logout, refreshProfile, localStorage persistence
- [COMPLETED] `I18nContext` — English/Hindi locale switching
- [COMPLETED] `Navbar` + `Footer` layout components
- [COMPLETED] `en.json` + `hi.json` locale files (partial coverage)

### Infrastructure / DevOps
- [COMPLETED] `docker-compose.yml` — Full production stack: db, redis, backend, celery_worker, celery_beat, flower, frontend, nginx, prometheus, grafana, opensearch, opensearch_dashboards
- [COMPLETED] `Dockerfile` — backend + frontend
- [COMPLETED] `.env.example` — Comprehensive with all required secrets documented
- [COMPLETED] `infra/nginx/nginx.conf` — Nginx reverse proxy config
- [COMPLETED] `infra/prometheus/prometheus.yml` — Prometheus scrape config

### Testing
- [COMPLETED] `tests/conftest.py` — pytest-asyncio setup
- [COMPLETED] `tests/test_auth.py` — OTP request + verify tests
- [COMPLETED] `tests/test_products.py` — Product listing + AI assist tests
- [COMPLETED] `tests/test_escrow.py` — Full order-to-escrow-to-release lifecycle test
- 4/4 tests reported passing in prior session

### Documentation
- [COMPLETED] `docs/Design.md` — Full Sovereign Commerce design system spec
- [COMPLETED] `docs/API.md`, `docs/Backend.md`, `docs/Frontend.md`, `docs/Architecture.md`
- [COMPLETED] `docs/Supabase.md`, `docs/Govt_Rules.md`, `docs/Packages.md`
- [COMPLETED] `docs/Policies.md`, `docs/Terms & Condition.md`, `docs/PPT.md`, `docs/Project_Report.md`
- [COMPLETED] `supabase/database.md`, `supabase/redis.md`, `supabase/celery.md`

---

## 3. What Is Partially Completed

### Backend
- [PARTIALLY COMPLETED] **KYC Workflow** — `KYCStatus` enum exists (NOT_SUBMITTED, PENDING_VERIFICATION, VERIFIED, REJECTED) but only 4 states vs the required 7 (missing: SUBMITTED, UNDER_REVIEW, EXPIRED, SUSPENDED). Business onboarding instantly sets `VERIFIED` — no real review flow.
- [PARTIALLY COMPLETED] **Platform Fee** — Fee is calculated at 3% (`PLATFORM_COMMISSION_PERCENT = 3.0`) but the specification requires 10%. Config is separate from code, but the default value is wrong.
- [PARTIALLY COMPLETED] **OTP delivery** — OTP is generated and stored correctly. `worker_tasks.py` has `send_otp_sms` / `send_otp_email` Celery task stubs that only log — **not connected to real SMS (MSG91) or email (SMTP/SES)**.
- [PARTIALLY COMPLETED] **Admin endpoint authorization** — Admin APIs at `/admin/*` have **no authentication guard**. Any unauthenticated caller can hit them.
- [PARTIALLY COMPLETED] **Order authorization** — `GET /orders` only scopes to buyer if `role == "BUYER"` but uses a string comparison rather than `RoleEnum.BUYER`. Vendor order visibility is incomplete.
- [PARTIALLY COMPLETED] **Businesses endpoint** — Missing address fields (street, city, state, district, pincode, country) required by the business spec.
- [PARTIALLY COMPLETED] **AI Service** — Functional rule-based system. No real external AI provider integration. No abstraction layer to swap AI providers.
- [PARTIALLY COMPLETED] **Payment gateway** — Architecture/config present (`RAZORPAY_KEY_ID` in `.env.example`), but **no actual Razorpay or Cashfree integration code exists**. No webhook handler, no server-side verification.
- [PARTIALLY COMPLETED] **Celery tasks** — `celery_app.py` and stubs in `worker_tasks.py` exist, but tasks do not perform real work (no SMS, no email, no PDF invoice generation).

### Frontend
- [PARTIALLY COMPLETED] **Dashboard** — Page exists and styled but uses entirely hardcoded `DEMO_METRICS`, `DEMO_ALERTS`, `DEMO_ORDERS` constants. Does not call the backend.
- [PARTIALLY COMPLETED] **Rank Tracker** — Page exists but all data is static UI. No backend model or API for the 120-level network/rank system.
- [PARTIALLY COMPLETED] **Orders [id]** — Page exists but uses hardcoded strings like `ORD-2024-001` instead of reading the real order ID from the route.
- [PARTIALLY COMPLETED] **Checkout** — UI exists with multi-rail payment options but no Razorpay/Cashfree SDK integration.
- [PARTIALLY COMPLETED] **i18n** — Context and `en.json`/`hi.json` exist but translation keys are not fully applied across all pages.
- [PARTIALLY COMPLETED] **Register flow** — Has a fallback `loginWithOTP("+919876543210", "123456", "VENDOR")` if user is not authenticated — this mock bypasses the actual auth step.

---

## 4. What Is Missing (NOT STARTED)

### Backend
- [NOT STARTED] **Alembic database migrations** — No `alembic/` directory. DB is managed via `create_all()` only — no version history, no rollback capability for production.
- [NOT STARTED] **Network/Level/Rank System** — No DB model for the 120-level progression (Bronze 1–10 through Legendary 111–120), cycles, level status machine (LOCKED/IN_PROGRESS/TRANSACTION_RECEIVED/UNDER_VERIFICATION/QUALIFIED/REWARD_PENDING/REWARD_APPROVED/REVERSED/CYCLE_COMPLETED).
- [NOT STARTED] **UAID (Noryvanta User Account ID)** — No `NRY-XXXX` identifier generation.
- [NOT STARTED] **Razorpay / Cashfree integration** — No payment gateway SDK, no order creation, no webhook handler, no signature verification, no idempotency.
- [NOT STARTED] **Real KYC document upload** — No S3/object storage integration, no document model for Aadhaar/PAN/GST certificate uploads.
- [NOT STARTED] **Real GSTIN verification** — API config documented but no verification code.
- [NOT STARTED] **Product image management** — `images` field is a JSON array of URLs. No file upload endpoint, no S3 integration. The minimum 6-image backend enforcement rule is **not implemented**.
- [NOT STARTED] **Rate limiting** — Config documented in `.env.example` but no middleware applied.
- [NOT STARTED] **Minimum 6-image enforcement** — `ProductCreate` schema accepts `images: Optional[List[str]] = []`. No minimum validation.
- [NOT STARTED] **Duplicate payment/webhook idempotency** — No idempotency key handling.
- [NOT STARTED] **Refund/dispute API** — No endpoints or models for refund, dispute, mediation.
- [NOT STARTED] **Webhook endpoints** — No `/webhooks/razorpay` or `/webhooks/cashfree` handler.
- [NOT STARTED] **Real AI provider** — No OpenAI/Vertex/Gemini API integration.
- [NOT STARTED] **Supabase Auth/Storage SDK** — Config placeholder only. SQLAlchemy is the primary ORM, not Supabase.
- [NOT STARTED] **S3 / file upload** — No upload endpoint, no storage integration.
- [NOT STARTED] **Email/SMS delivery** — No real MSG91, Twilio, AWS SES integration.
- [NOT STARTED] **Financial ledger for all transaction types** — Only `PLATFORM_COMMISSION` and `TDS_SECTION_194O` types. Missing: `PAYMENT_RECEIVED`, `GATEWAY_FEE`, `REFUND`, `ADJUSTMENT`, `REVERSAL`.
- [NOT STARTED] **Country/language admin** — No model or API for country, currency, language configuration.
- [NOT STARTED] **Product publish/unpublish/draft** — No `status` field (DRAFT/PUBLISHED/UNPUBLISHED). Only `is_active` boolean.
- [NOT STARTED] **Product edit endpoint** — `PUT /products/{id}` not implemented.
- [NOT STARTED] **Product delete endpoint** — `DELETE /products/{id}` not implemented.
- [NOT STARTED] **Vendor-scoped product management** — Vendor cannot list/manage only their own products.
- [NOT STARTED] **Order cancellation API** — No cancel endpoint.
- [NOT STARTED] **Tracking number update** — No API to set tracking_number on an order.
- [NOT STARTED] **Admin user management APIs** — No endpoints for listing users, modifying roles, suspending accounts.
- [NOT STARTED] **Admin KYC review API** — No admin endpoint to review/approve/reject KYC.
- [NOT STARTED] **Admin business verification** — No admin workflow for verifying businesses.
- [NOT STARTED] **Prometheus metrics exporter** — Config exists but no `/metrics` endpoint exposed from FastAPI.
- [NOT STARTED] **Grafana dashboards** — `infra/grafana/` directory referenced in docker-compose but does not exist.
- [NOT STARTED] **PostgreSQL init.sql** — `infra/postgres/init.sql` referenced in docker-compose but does not exist.
- [NOT STARTED] **`infra/nginx/ssl/`** — SSL cert directory referenced but empty.
- [NOT STARTED] **CHANGELOG.md** — Not created.
- [NOT STARTED] **ARCHITECTURE_DECISIONS.md** — Not created.
- [NOT STARTED] **SETUP.md** — Not created.
- [NOT STARTED] **DEPLOYMENT.md** — Not created.
- [NOT STARTED] **SECURITY.md** — Not created.

### Frontend
- [NOT STARTED] **Profile/Account settings page** — No `/account` or `/profile` page for the logged-in user.
- [NOT STARTED] **Vendor product management UI** — No `/dashboard/products` page for CRUD operations on vendor's own listings.
- [NOT STARTED] **Vendor image upload UI** — No multi-image upload component.
- [NOT STARTED] **Payment gateway SDK integration** — No Razorpay checkout.js or Cashfree SDK.
- [NOT STARTED] **Network/Rank level detail page** — No `/network` or `/levels` page.
- [NOT STARTED] **KYC upload UI** — No document upload flow for verification.
- [NOT STARTED] **Admin panel** — Only `/admin/fees` and `/admin/routing` exist. No users, KYC, orders, disputes management UI.
- [NOT STARTED] **Order cancellation/dispute UI**.
- [NOT STARTED] **Notification system** — No toast/notification center connected to real backend events.

---

## 5. What Is Broken

- [BROKEN] **CORS in production** — `allow_origins=["*"]` with `allow_credentials=True` is **invalid** per browser CORS spec and will fail in production. Must be restricted to specific origins.
- [BROKEN] **Admin APIs have no authentication** — `/admin/fees/summary`, `/admin/routing`, `/admin/ranks` accept requests without any JWT. Critical security issue.
- [BROKEN] **OAuth SSO is fake** — `/auth/oauth/token` does not verify the OIDC token, it synthesizes an email. Anyone can impersonate any SSO provider.
- [BROKEN] **Master OTP bypass `"123456"` must be removed in production** — Current `otp_service.py` permanently accepts `"123456"` for any identifier.
- [BROKEN] **`django_celery_beat`** — `docker-compose.yml` celery_beat service uses `--scheduler django_celery_beat.schedulers:DatabaseScheduler` which requires `django_celery_beat` package — not in `requirements.txt`. Beat service will crash.
- [BROKEN] **`infra/postgres/init.sql`** — Referenced by docker-compose db service but file does not exist. PostgreSQL service will fail to initialize.
- [BROKEN] **`infra/grafana/dashboards`** and **`infra/grafana/datasources`** — Referenced by docker-compose grafana service but directories do not exist. Grafana provisioning will fail.
- [BROKEN] **Git not initialized** — No `.git` directory. No version control. Cannot track changes or rollback.
- [BROKEN] **`platform_fee` on Order is set to 3%** but spec requires 10%. The config key is `PLATFORM_COMMISSION_PERCENT = 3.0`. This is a business rule violation.
- [BROKEN] **Order list authorization** — `current_user.role == "BUYER"` compares against string, not `RoleEnum.BUYER.value`. Will silently fail to filter for vendors.

---

## 6. What Is Mocked

| Item | Mock Type | Location |
|------|-----------|----------|
| OTP SMS/Email delivery | Log only | `worker_tasks.py` |
| OAuth/SSO verification | Email synthesis | `auth/endpoints/auth.py` |
| Admin fee fallback values | Hardcoded constants | `admin.py` L20, L25, L30, L37 |
| Admin routing matrix | Static dict | `admin.py` |
| Admin ranks/tiers | Static dict | `admin.py` |
| AI product description | Rule-based string | `ai_service.py` |
| Dashboard KPIs | Hardcoded constants | `dashboard/page.tsx` |
| Rank tracker data | Hardcoded constants | `rank-tracker/page.tsx` |
| Order detail page | Hardcoded order IDs | `orders/[id]/page.tsx` |
| Checkout payment | UI only, no gateway | `checkout/page.tsx` |
| Product images | Unsplash URLs | `main.py` seed data |
| Business KYC | Instant VERIFIED | `businesses.py` |

---

## 7. What Is Production-Ready

- [COMPLETED] OTP creation and verification logic (except master bypass)
- [COMPLETED] JWT access/refresh token architecture
- [COMPLETED] bcrypt password hashing
- [COMPLETED] SQLAlchemy async ORM with proper session management
- [COMPLETED] Product listing CRUD (read path is production-quality)
- [COMPLETED] Order creation with tiered pricing math
- [COMPLETED] Escrow deposit + release with TDS deduction (Section 194-O)
- [COMPLETED] FeeLedger as append-only audit trail
- [COMPLETED] Docker Compose infrastructure architecture (mostly; see broken items)
- [COMPLETED] `.env.example` documentation
- [COMPLETED] Tailwind CSS Sovereign Commerce design system

---

## 8. What Requires Integration

| Feature | Requires |
|---------|---------|
| OTP delivery | MSG91 API key + Celery running |
| Payment gateway | Razorpay/Cashfree SDK + webhooks |
| File/image upload | AWS S3 or Supabase Storage |
| GSTIN verification | MasterGST or GST API key |
| KYC documents | S3 private bucket + Signzy/Aadhaar Bridge |
| Real AI listing | OpenAI / Vertex AI / Gemini API key |
| Production DB | PostgreSQL via DATABASE_URL env var |
| Cache/tasks | Redis + Celery worker running |
| Email | AWS SES or SMTP credentials |
| Monitoring | Prometheus /metrics endpoint |

---

## 9. Current Frontend Status

**14 pages implemented. All use the Sovereign Commerce design system.**

| Route | API Connected? | Mock Data? | Notes |
|-------|---------------|-----------|-------|
| `/` | Partial (products API) | Yes | Hero/stats hardcoded |
| `/login` | ✅ Yes | No | OTP flow works end-to-end |
| `/register` | ✅ Yes | Partial | Has mock fallback auth |
| `/dashboard` | ❌ No | 100% mock | All KPIs static |
| `/products` | ✅ Yes | No | Real API |
| `/products/[id]` | ✅ Yes | No | Real API |
| `/checkout` | ❌ No | 100% mock | No payment gateway |
| `/orders` | ✅ Yes | No | Real API |
| `/orders/[id]` | Partial | Yes | IDs hardcoded |
| `/ai-assistant` | ✅ Yes | Partial | Calls real AI-assist API |
| `/rank-tracker` | ❌ No | 100% mock | No backend model |
| `/admin/fees` | ✅ Yes | Fallback | API works |
| `/admin/routing` | ✅ Yes | Static | Static backend data |
| `/vendor/profile` | ✅ Yes | No | Real API |

---

## 10. Current Backend Status

- **Runtime:** SQLite (dev), PostgreSQL (prod via `DATABASE_URL`)
- **DB Engine:** SQLAlchemy 2.0 async with auto `create_all()` (no Alembic)
- **Auth:** OTP + JWT — functional for dev, has security issues for prod
- **API Docs:** `/docs` (Swagger UI) and `/redoc` available
- **API Version:** v1 at `/api/v1/`
- **7 endpoint modules** covering auth, products, orders, escrow, businesses, admin, health

---

## 11. Current Database Status

- [COMPLETED] SQLite file: `backend/noryvanta.db` (131 KB — contains seeded data)
- [NOT STARTED] Alembic migrations
- [NOT STARTED] PostgreSQL initialization SQL
- **Tables created:** users, otp_records, business_profiles, products, tiered_prices, orders, order_items, escrow_transactions, fee_ledgers
- **Missing tables:** network_levels, network_cycles, kyc_documents, payment_transactions, refunds, disputes, notifications, audit_logs, platform_settings

---

## 12. Current Authentication Status

| Feature | Status |
|---------|--------|
| OTP generation (6-digit, cryptographic) | ✅ COMPLETED |
| OTP storage + TTL | ✅ COMPLETED |
| OTP verification | ✅ COMPLETED |
| JWT access token (24hr) | ✅ COMPLETED |
| JWT refresh token (30 days) | ✅ COMPLETED |
| Token rotation on refresh | ✅ COMPLETED |
| RBAC (BUYER/VENDOR/ADMIN) | PARTIALLY COMPLETED — models exist, admin guard missing |
| OTP SMS delivery | [MOCK ONLY] |
| OAuth/OIDC SSO | [MOCK ONLY] |
| Master bypass `"123456"` | ⚠️ SECURITY RISK (dev convenience) |
| CORS configuration | [BROKEN] `allow_origins=["*"]` with credentials |

---

## 13. Current API Status

- 20+ endpoints implemented
- OpenAPI docs auto-generated at `/docs`
- Versioning: `/api/v1/` prefix
- Missing: payment webhooks, KYC upload, refund/dispute, product edit/delete, admin auth guards

---

## 14. Current Supabase Status

- [NOT STARTED] Supabase Auth not integrated
- [NOT STARTED] Supabase Storage not integrated
- [COMPLETED] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` config placeholders exist
- `docs/Supabase.md` — documentation written
- The project currently uses **SQLAlchemy + SQLite/PostgreSQL** directly, not Supabase as primary DB

---

## 15. Current Redis Status

- [COMPLETED] Redis config in `core/config.py` and `docker-compose.yml`
- [COMPLETED] Redis referenced in Celery broker/backend
- [NOT STARTED] Redis not used for caching, rate limiting, or session storage
- [NOT STARTED] Redis not running locally (Docker only)

---

## 16. Current Celery Status

- [COMPLETED] `celery_app.py` — Celery instance initialized
- [COMPLETED] `worker_tasks.py` — Task stubs for SMS, email, invoice, escrow reconciliation
- [BROKEN] `celery_beat` docker service uses `django_celery_beat` scheduler — not installed
- [NOT STARTED] Tasks do not perform real work (log-only)
- [NOT STARTED] Celery Beat scheduling configuration

---

## 17. Current Docker Status

- [COMPLETED] `docker-compose.yml` — Full architecture defined (12 services)
- [BROKEN] `infra/postgres/init.sql` — Referenced but missing
- [BROKEN] `infra/grafana/dashboards/` and `infra/grafana/datasources/` — Referenced but missing
- [BROKEN] `django_celery_beat` in celery_beat command — not installed
- [COMPLETED] Frontend Dockerfile
- [COMPLETED] Backend Dockerfile

---

## 18. Current Payment Integration Status

- [NOT STARTED] Razorpay SDK integration
- [NOT STARTED] Cashfree Payments SDK integration
- [NOT STARTED] Payment order creation
- [NOT STARTED] Server-side payment verification
- [NOT STARTED] Webhook handler (`/webhooks/razorpay`, `/webhooks/cashfree`)
- [NOT STARTED] Idempotency key for duplicate payment prevention
- [COMPLETED] Payment config placeholders (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) in `.env.example`
- [COMPLETED] Escrow deposit/release logic (backend side — awaiting payment gateway trigger)

---

## 19. Current AI Integration Status

- [COMPLETED] `AIService.generate_listing_metadata()` — Rule-based heuristic for HSN, GST, SEO description
- [NOT STARTED] External AI provider (OpenAI/Gemini/Vertex)
- [NOT STARTED] AI provider abstraction layer
- [NOT STARTED] Image-based analysis (OCR/vision)
- [NOT STARTED] AI fact-checking guardrails (prevent false claims)

---

## 20. Current Noryvanta Network/Rank Status

- [NOT STARTED] 120-level progression model (Bronze 1–10 through Legendary 111–120)
- [NOT STARTED] Level status machine (9 states)
- [NOT STARTED] Cycle management
- [NOT STARTED] UAID (NRY-XXXX) generation
- [NOT STARTED] Qualification rules engine
- [NOT STARTED] Reward approval workflow
- [COMPLETED] Vendor tier system (STANDARD/SILVER/GOLD/SOVEREIGN_PLATINUM) — simpler 4-tier version exists in `BusinessProfile.tier`
- [MOCK ONLY] Rank Tracker frontend page (uses static data)
- [COMPLETED] Admin `/ranks` API (returns static tier config)

---

## 21. Current Testing Status

| Test | Status |
|------|--------|
| `test_auth.py` — OTP request + verify | ✅ PASSING |
| `test_products.py` — List + AI assist | ✅ PASSING |
| `test_escrow.py` — Full order-escrow-release lifecycle | ✅ PASSING |
| Customer cannot see platform fee | [NOT STARTED] |
| Business can see platform fee | [NOT STARTED] |
| Admin can see platform fee | [NOT STARTED] |
| Minimum 6 images enforced | [NOT STARTED] |
| Duplicate payment prevention | [NOT STARTED] |
| Failed payment does not become successful | [NOT STARTED] |
| Transaction received ≠ qualified automatically | [NOT STARTED] |
| Cross-business data isolation | [NOT STARTED] |
| KYC document privacy | [NOT STARTED] |
| Reversal audit trail | [NOT STARTED] |
| Admin permissions | [NOT STARTED] |

---

## 22. Exact Point Where Development Stopped

**Development stopped after completing the frontend UI screens** per the Stitch design specs.

The previous session's primary focus was:
1. Creating all frontend page routes to match Stitch wireframes
2. Verifying that `npm run build` produces 15 static routes with zero errors
3. Verifying backend unit tests pass (4/4)

The work was **UI completion oriented**, not **backend integration oriented**.

**Specific stopping point:**
- The 5th Stitch screen (`/orders/[id]`) was the last thing implemented
- After verifying the build and tests, the session ended due to quota exhaustion
- The previous session explicitly stated the project is "Ready for Staging & Production" — this was **premature**: many critical backend features remain unimplemented

---

## 23. Recommended Next Development Steps (Priority Order)

### Priority 1 — Critical Security & Correctness Fixes (must fix before any real usage)
1. **Fix CORS** — Replace `allow_origins=["*"]` with explicit origin list from config
2. **Add admin API authentication guard** — All `/admin/*` endpoints need `require_admin_user` dependency
3. **Fix platform fee** — Change `PLATFORM_COMMISSION_PERCENT` from 3.0% to 10.0% as per business spec
4. **Fix order authorization** — Use `RoleEnum.BUYER` enum comparison, not string
5. **Remove/gate master OTP bypass** — Guard `"123456"` bypass behind `APP_ENV == "development"` check

### Priority 2 — Core Missing Infrastructure
6. **Initialize Git** — `git init`, `.gitignore`, initial commit
7. **Add Alembic** — Replace `create_all()` with proper migration system
8. **Add minimum 6-image validation** — Backend `ProductCreate` schema validator
9. **Create missing Docker infra files** — `infra/postgres/init.sql`, Grafana directories, fix Celery beat scheduler

### Priority 3 — Critical Missing Business Features
10. **Network/Level/Rank system** — DB models + level status machine + UAID
11. **Product management CRUD** — Edit, delete, publish/unpublish, draft status, vendor-scoped list
12. **Payment gateway integration** — Razorpay webhook handler + server-side verification
13. **KYC document upload** — Document model + S3 upload + admin review workflow
14. **Real AI provider** — Abstract provider layer + Gemini/OpenAI integration

### Priority 4 — Frontend Integration
15. **Connect Dashboard to real API** — Remove `DEMO_METRICS` constants
16. **Fix `/orders/[id]` to use real route param** — Remove hardcoded order IDs
17. **Checkout payment integration** — Razorpay.js SDK
18. **Rank Tracker backend** — Connect to real level/cycle API once built

---

## 24. Risks & Blockers

| Risk | Severity | Notes |
|------|----------|-------|
| No payment gateway integration | 🔴 Critical | Platform cannot process real money |
| Admin APIs unprotected | 🔴 Critical | Security breach risk |
| Master OTP bypass in code | 🔴 Critical | Must be env-gated |
| CORS misconfiguration | 🔴 Critical | Will fail in production |
| Platform fee at 3% not 10% | 🔴 Critical | Business rule violation |
| No Alembic migrations | 🟠 High | Cannot safely evolve schema in production |
| No minimum 6-image enforcement | 🟠 High | Business rule violation |
| No Git version control | 🟠 High | Cannot track changes |
| Docker infra files missing | 🟠 High | docker-compose up will fail |
| Network/rank model missing | 🟠 High | Core business feature absent |
| No KYC document upload | 🟡 Medium | Compliance requirement |
| OTP SMS not real | 🟡 Medium | All OTPs go to logs only |
| AI is rule-based | 🟡 Medium | Functional but not competitive |
| No rate limiting | 🟡 Medium | DoS exposure |
| No idempotency for payments | 🟡 Medium | Duplicate charge risk |
