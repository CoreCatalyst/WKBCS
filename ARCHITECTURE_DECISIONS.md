# NORYVANTA — ARCHITECTURE DECISIONS RECORD (ADR)
> **Platform:** Noryvanta Business Marketplace ("Connect, Grow, Thrive")  
> **Status:** Active Reference  

---

## ADR-001: Category-Based Platform Fee Invoiced to Business Owner (Hidden from Customer)
- **Status:** ACCEPTED & ENFORCED
- **Context:** Noryvanta operates a B2B commerce and industrial marketplace. As per core business rules, Noryvanta charges the business owner a category-based platform fee (Wholesaler: 3.20%, Distributor: 5.20%, Services: 5.20%, Retailer: 8.20%) on eligible successful transactions. Customers must NOT see Noryvanta's platform fee as an added checkout fee.
- **Decision:**
  - Category platform fees are configured in `app/core/config.py` and resolved dynamically by business type.
  - The customer pays `total_amount = subtotal + gst_total`.
  - The category platform fee is deducted internally from vendor escrow disbursement.
  - The API schema (`OrderOut`) hides `platform_fee` from buyer responses while exposing it to vendors and admins.
  - Historical orders lock and store the fee applied at order creation time (`order.platform_fee`) ensuring future config modifications do not mutate historical records.

---

## ADR-002: Product & Service Listing Media Validation (4-10 Images, Max 2 Videos) Enforced at Backend Layer
- **Status:** ACCEPTED & ENFORCED
- **Context:** To ensure high catalog presentation standards while respecting business bandwidth, Noryvanta requires a minimum of 4 images and allows up to 10 images, with up to 2 optional video clips (max 20 MB, max 30s) per published product/service listing. Videos do not substitute for the mandatory 4 images.
- **Decision:**
  - Client-side validation alone is insufficient.
  - The backend `ProductCreate` and `ProductUpdate` schemas enforce `len(clean_images) >= 4` and `<= 10`, plus `len(videos) <= 2` via Pydantic field validators.
  - Draft listings (`is_draft=True`) are exempt to permit saving work-in-progress.

---

## ADR-003: Network Progression & Level Status Machine
- **Status:** ACCEPTED & PENDING IMPLEMENTATION
- **Context:** Noryvanta's growth model incorporates a 120-Level Network across 12 Sovereign Ranks (Bronze through Legendary) structured into cycles.
- **Decision:**
  - Progression is governed by an append-oriented, server-side status machine with 9 explicit states:
    `LOCKED` → `IN_PROGRESS` → `TRANSACTION_RECEIVED` → `UNDER_VERIFICATION` → `QUALIFIED` → `REWARD_PENDING` → `REWARD_APPROVED` (plus `REVERSED` and `CYCLE_COMPLETED`).
  - **Cardinal Rule:** `TRANSACTION_RECEIVED` must NEVER transition automatically to `QUALIFIED`. Transactions merely initiate verification; business qualification rules must be evaluated independently server-side before qualification occurs.
  - State changes generate an immutable audit log (`NetworkStatusLog`).

---

## ADR-004: Dual-Tier Asynchronous Database Architecture
- **Status:** ACCEPTED & IMPLEMENTED
- **Context:** Developers require zero-friction local development without mandatory external dependencies, while production requires high-concurrency PostgreSQL.
- **Decision:**
  - SQLAlchemy 2.0 Async with `aiosqlite` for local SQLite development and `asyncpg` for PostgreSQL in staging and production.
  - Alembic handles forward and rollback migrations across both environments.

---

## ADR-005: Security, RBAC & Gated Dev Credentials
- **Status:** ACCEPTED & IMPLEMENTED
- **Context:** Dev bypasses and unauthenticated endpoints pose severe compliance and security liabilities.
- **Decision:**
  - All `/admin/*` endpoints strictly require `RoleEnum.ADMIN` via `get_current_admin`.
  - The `"123456"` master OTP bypass is strictly gated to `APP_ENV == "development"` and disabled in staging and production.
  - CORS origins are restricted to configured origins without wildcard credentials.
