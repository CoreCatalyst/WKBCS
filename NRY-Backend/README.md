# NORYVANTA — SHARED BACKEND REST API SERVER (`backend/`)

The `backend/` folder contains the unified, centralized REST API engine for the Noryvanta platform, powering both:
1. **Noryvanta Business Web Application** (`frontend/`)
2. **Noryvanta Customer Mobile Applications** (Android and iOS)

Built with FastAPI, SQLAlchemy 2.0 Async, Pydantic v2, and Alembic.

---

## 1. Primary Architecture Principles

- **Single Shared Backend API**: One single API server serving both web merchants and future mobile customers. No separate mobile backend.
- **Single Centralized Database**: PostgreSQL (Production) / SQLite Async (Local Development) containing all users, businesses, products, orders, escrow transactions, network levels, and financial ledgers.
- **Centralized Security**: Short-lived JWT access tokens (24h) + refresh tokens (30d) with token rotation. Role-based access control (Customer, Wholesaler, Distributor, Retailer, Service Provider, Admin).
- **Zero Customer Platform Fee Invariant**: Customers pay strictly `Subtotal + GST + Customer Delivery Charges`. Noryvanta platform fees and 1% statutory TDS (Section 194-O) are deducted exclusively from vendor payouts during settlement.
- **Approved Fee Schedule**:
  - Wholesaler: **3.20%**
  - Distributor: **5.20%**
  - Retailer: **8.20%**
  - Services: **5.20%**
- **Strict Media Validation**: Minimum 4 images mandatory, maximum 10 images allowed, up to 2 permitted video clips (max 20 MB, max 30s).

---

## 2. Directory Layout

```
backend/
├── app/
│   ├── main.py               # FastAPI application entrypoint & Prometheus /metrics
│   ├── api/
│   │   ├── deps.py           # Dependency injection (get_current_user, get_current_admin)
│   │   └── v1/
│   │       ├── api.py        # Central router aggregator
│   │       ├── auth.py       # Authentication, OTP, Google OAuth, session refresh, logout
│   │       ├── businesses.py # Business profiles, onboarding, dashboard KPIs
│   │       ├── products.py   # Product catalog, wholesale price tiers, media validation
│   │       ├── services.py   # Services marketplace, bookings, cancellations
│   │       ├── customers.py  # Customer profile, orders, addresses, cart
│   │       ├── orders.py     # Purchase orders with escrow protection & financial breakdown
│   │       ├── payments.py   # Razorpay & Cashfree checkout sessions & webhooks
│   │       ├── uaid.py       # Universal Account Identifier resolution and QR code
│   │       ├── referrals.py  # NRY referral network, validation, and share links
│   │       ├── rewards.py    # Reward wallet balances and immutable ledger
│   │       └── admin.py      # Administrator verification, listing approval, audit logs
│   ├── core/
│   │   ├── config.py         # Pydantic Settings & environment validation
│   │   ├── database.py       # Async SQLAlchemy session engine
│   │   ├── security.py       # Passlib bcrypt & JWT utilities
│   │   └── permissions.py    # RBAC role dependencies and resource isolation checks
│   ├── models/               # Declarative SQLAlchemy ORM models
│   ├── schemas/              # Pydantic v2 validation schemas
│   ├── services/             # Domain logic (escrow, fees, network, payment, AI)
│   ├── repositories/         # Repository pattern data access layer
│   ├── db/                   # Database session and base model registry
│   ├── middleware/           # CORS and security middleware
│   ├── integrations/         # External provider integrations (payments, notifications, storage, identity)
│   ├── tasks/                # Celery asynchronous task definitions
│   └── utils/                # Formatting and normalization helpers
├── alembic/                  # Versioned schema migrations (001 to 010)
├── alembic.ini               # Alembic migration configuration
├── tests/                    # Pytest test suite (111 passing tests)
├── docs/                     # Architectural blueprints and specifications
├── scripts/                  # Utility and database seed scripts
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
└── README.md                 # Backend documentation
```

---

## 3. Versioned REST API Endpoints (`/api/v1`)

### Authentication & Sessions
- `POST /api/v1/auth/otp/request` — Dispatch 6-digit verification code.
- `POST /api/v1/auth/otp/verify` — Verify OTP and obtain JWT tokens.
- `POST /api/v1/auth/google` — Authenticate via Google OAuth ID token.
- `POST /api/v1/auth/refresh` — Rotate expired access token.
- `POST /api/v1/auth/logout` — Terminate session.
- `GET  /api/v1/auth/me` — Authenticated user details.

### Public Marketplace (Web & Mobile Customers)
- `GET  /api/v1/marketplace/products` — Filter products by category, tier, city, price.
- `GET  /api/v1/marketplace/products/{id}` — Public product detail.
- `GET  /api/v1/services` — Filter services by category, city, charge.
- `GET  /api/v1/services/{id}` — Public service detail.
- `GET  /api/v1/businesses/{id}/public-profile` — Public sanitized merchant profile.

### Customer Operations (Mobile App & Web Customers)
- `GET  /api/v1/customers/me` — Customer profile.
- `GET  /api/v1/customers/me/orders` — Customer order history.
- `GET  /api/v1/customers/me/bookings` — Customer service bookings.
- `GET  /api/v1/customers/me/addresses` — Saved shipping addresses.
- `POST /api/v1/customers/me/addresses` — Add shipping address.
- `GET  /api/v1/cart` — Retrieve shopping cart.
- `POST /api/v1/cart/items` — Add product to cart.
- `PATCH /api/v1/cart/items/{item_id}` — Update item quantity.
- `DELETE /api/v1/cart/items/{item_id}` — Remove item from cart.

### Service Bookings
- `POST /api/v1/services/bookings` — Book service.
- `GET  /api/v1/services/bookings/{id}` — Booking status.
- `POST /api/v1/services/bookings/{id}/cancel` — Cancel booking.

### Orders & Checkout
- `POST /api/v1/orders` — Create purchase order with Escrow protection.
- `GET  /api/v1/orders` — List orders.
- `GET  /api/v1/orders/{id}` — Order detail.
- `GET  /api/v1/orders/{id}/financial-breakdown` — Transparent pricing & settlement breakdown.

### Payments
- `POST /api/v1/payments/create-session` (alias `/orders`) — Initialize Razorpay/Cashfree checkout session.
- `POST /api/v1/payments/verify` — Server-side payment verification.
- `POST /api/v1/payments/webhook/{gateway}` — Cryptographically verified webhook receiver.

### Business Operations (Web Merchants Only)
- `POST /api/v1/businesses/register` — Business onboarding and UAID issuance.
- `GET  /api/v1/businesses/me` — Own business profile.
- `PATCH /api/v1/businesses/me` — Update business profile.
- `GET  /api/v1/businesses/dashboard/summary` — KPIs, gross sales, platform fee ledger.
- `POST /api/v1/products` — Create wholesale product listing (4-10 images enforced).
- `GET  /api/v1/businesses/me/orders` — Orders received.
- `GET  /api/v1/businesses/me/transactions` — Settlements and payouts.

### UAID, Referrals & Rewards
- `GET  /api/v1/uaid/me` — Authenticated user's UAID and QR code.
- `GET  /api/v1/uaid/resolve/{uaid}` — Resolve public business metadata.
- `GET  /api/v1/referrals/me` — Referral link, partner stats, network volume.
- `POST /api/v1/referrals/validate` — Validate referral code / UAID.
- `GET  /api/v1/rewards/me` — Reward wallet balance (available, pending, redeemed).
- `GET  /api/v1/rewards/ledger` — Paginated immutable reward ledger.
- `GET  /api/v1/network/progress` — 120-Level Network progress tracker.

---

## 4. Mobile Customer Application API Contract

Future Flutter or native Android/iOS mobile applications should:
1. Configure `API_BASE_URL` dynamically from build environment configuration (e.g., `https://api.noryvanta.in/api/v1`).
2. Obtain session tokens via `POST /api/v1/auth/otp/verify` or `POST /api/v1/auth/google`.
3. Securely store JWT tokens in platform-appropriate keystores (Android EncryptedSharedPreferences / iOS Keychain).
4. Send `Authorization: Bearer <access_token>` in HTTP headers for protected requests.
5. Consume customer endpoints (`/marketplace/products`, `/services`, `/customers/me`, `/cart`, `/orders`, `/payments`).
6. Do NOT call privileged business endpoints (`/businesses/register`, `/businesses/dashboard/summary`, `/admin/*`).

Interactive OpenAPI documentation is available at:
- `http://localhost:8000/docs` (Swagger UI)
- `http://localhost:8000/redoc` (ReDoc)
- `http://localhost:8000/api/v1/openapi.json` (OpenAPI JSON schema)

---

## 5. Local Setup and Execution

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
# Running on http://localhost:8000
```

To execute the test suite:
```bash
$env:PYTHONPATH="."
pytest -v
# 111 passed
```
