# Supabase Integration & Architecture: Noryvanta Business Marketplace

## 1. Overview & Cloud Architecture
**Supabase** serves as the managed backend data and infrastructure backbone for Noryvanta. It provides an enterprise-ready PostgreSQL database with native Row Level Security (RLS), real-time change data capture, managed storage buckets for KYC & commercial documents, and edge functions.

```
                      +---------------------------------------+
                      |       Noryvanta Client Applications   |
                      |  (Next.js Web / Mobile / Admin PWA)   |
                      +-------------------+-------------------+
                                          |
                        HTTPS (REST/OpenAPI & WebSockets)
                                          |
                                          v
                      +-------------------+-------------------+
                      |      FastAPI Core Backend Engine      |
                      |  - Business Logic & Escrow Machine    |
                      |  - JWT Issuer & Role Manager (RBAC)   |
                      +-------------------+-------------------+
                                          |
                      +-------------------+-------------------+
                      |          Supabase Ecosystem           |
                      |                                       |
                      |  +---------------------------------+  |
                      |  | PostgreSQL 16 (Relational Core) |  |
                      |  | - Row Level Security (RLS)      |  |
                      |  | - JSONB Audit Trail & PostGIS   |  |
                      |  +---------------------------------+  |
                      |  | Storage: S3-Compatible Buckets  |  |
                      |  | - kyc-documents (encrypted)     |  |
                      |  | - product-assets (CDN cached)   |  |
                      |  | - tax-invoices (signed URLs)    |  |
                      |  +---------------------------------+  |
                      |  | Realtime: Change Data Capture   |  |
                      |  | - Escrow milestone status push  |  |
                      |  | - Order state notifications     |  |
                      |  +---------------------------------+  |
                      +---------------------------------------+
```

---

## 2. PostgreSQL Connection Strings & Configuration

### Direct & Pooled Connections
Supabase provides both session-mode and transaction-mode connection poolers via Supavisor / PgBouncer:
```env
# .env Configuration for FastAPI Backend
# Transaction Pooled (port 6543) - Recommended for high-concurrency FastAPI async connections
DATABASE_URL=postgresql+asyncpg://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?ssl=require

# Direct Connection (port 5432) - Used for Alembic DDL migrations
DIRECT_DATABASE_URL=postgresql+psycopg2://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?ssl=require

# Supabase Public Keys for Next.js Client
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY] # Strictly Backend Only
```

---

## 3. Row Level Security (RLS) Policies

To protect sensitive B2B enterprise data, all tables have Row Level Security enabled. Only the backend (via `SERVICE_ROLE_KEY`) or authorized users (via JWT claims) can access rows.

### Example RLS Policy for Orders:
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers can only view their own purchase orders
CREATE POLICY buyer_view_own_orders ON orders
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Vendors can view orders containing their products
CREATE POLICY vendor_view_own_orders ON orders
  FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

-- System backend (service role) has unrestricted access
CREATE POLICY service_role_full_access ON orders
  FOR ALL
  TO service_role
  USING (true);
```

### Example RLS Policy for Escrow Funds:
```sql
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Read-only visibility for involved buyer and vendor
CREATE POLICY view_participating_escrow ON escrow_transactions
  FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR vendor_id = auth.uid()
  );

-- Only backend service role can execute deposit/release state mutations
CREATE POLICY mutate_escrow_service_only ON escrow_transactions
  FOR ALL
  TO service_role
  USING (true);
```

---

## 4. Storage Buckets & Access Controls

Noryvanta utilizes three private and public Supabase storage buckets:

| Bucket Name | Privacy | Allowed MIME Types | Max Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `kyc-documents` | **Private** | `application/pdf`, `image/jpeg`, `image/png` | 10 MB | Vendor GSTIN certificate, PAN card, cancelled cheques |
| `product-media` | **Public** | `image/webp`, `image/jpeg`, `image/png`, `video/mp4` | 25 MB | High-resolution product images, machinery demo clips |
| `tax-invoices` | **Private** | `application/pdf` | 5 MB | E-invoices with signed IRN and QR codes generated by Celery |

### Accessing Private Documents via Signed URLs:
```python
# FastAPI service method generating temporary access links
async def get_secure_invoice_url(invoice_path: str, expiry_seconds: int = 300) -> str:
    res = supabase_client.storage.from_("tax-invoices").create_signed_url(
        path=invoice_path,
        expires_in=expiry_seconds
    )
    return res["signedURL"]
```

---

## 5. Supabase Realtime Channels
Enables instant UI updates without polling:
1. **Escrow Updates**: When a buyer deposits funds, the vendor's dashboard updates in sub-second latency from `AWAITING_PAYMENT` to `ESCROW_LOCKED`.
2. **Order Milestones**: Dispatched, in-transit, and delivery confirmations stream directly to the order timeline component in Next.js.
