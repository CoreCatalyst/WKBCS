# NORYVANTA — SECURITY POLICY & AUDIT SPECIFICATION
> **Tagline:** "Connect, Grow, Thrive"  
> **Compliance Target:** DPDP Act 2023, RBI Escrow Guidelines, ISO/IEC 27001  

---

## 1. Authentication & Session Security
- **OTP Generation:** Cryptographically secure 6-digit tokens using Python `secrets.choice()`.
- **OTP TTL:** 10-minute expiry; previous tokens invalidated on new request.
- **Master OTP Bypass:** Gated strictly to `APP_ENV == "development"`. Completely disabled in staging and production.
- **JWT Architecture:** HS256 algorithm with 24-hour access tokens and 30-day refresh tokens; refresh tokens rotated on use.
- **RBAC:** Role checks (`BUYER`, `VENDOR`, `ADMIN`) enforced server-side.

---

## 2. Statutory & Financial Compliance
- **Platform Fee Secrecy for Buyers:** The category-based platform fee (Wholesaler: 3.20%, Distributor: 5.20%, Services: 5.20%, Retailer: 8.20%) is levied strictly on the registered business owner. It is strictly confidential and not rendered on customer-facing checkouts or buyer order views.
- **TDS Section 194-O:** 1.0% TDS deducted and recorded in immutable `FeeLedger`.
- **Escrow Milestone Protection:** Funds remain locked in RBI-compliant escrow until confirmed delivery and 48-hour inspection window completion.

---

## 3. Data Protection & Privacy
- **KYC Document Privacy:** Aadhaar, PAN, and bank certificates must reside in private buckets with short-lived presigned URLs. No direct public URL exposure.
- **PCI-DSS Compliance:** Raw payment card details and CVVs are NEVER received or stored by Noryvanta servers. All card data is handled directly by PCI-DSS Level 1 certified gateways (Razorpay / Cashfree).
- **CORS Protection:** Wildcard origins (`*`) with credentials are prohibited. Origins are restricted to explicit whitelist domains.
