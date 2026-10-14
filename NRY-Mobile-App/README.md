# NRY-Mobile-App — Noryvanta - Global • Connect. Grow. Thrive.

`NRY-Mobile-App` is the dedicated Customer Mobile App frontend for the Noryvanta - Global Marketplace with the unified platform tagline: **Connect. Grow. Thrive.** It connects directly to the existing Python FastAPI backend and database, preserving strict separation of concerns from the existing Business Web App (`frontend/`).

---

## Architecture Overview

```
Existing Business Web App (frontend/) ──────┐
                                            │
NRY-Mobile-App (Customer Mobile App) ───────┼──> FastAPI Backend (/api/v1/)
                                            │         │
                                            │         ├── PostgreSQL
                                            │         ├── Orders & Payments
                                            │         ├── Customer UAID (NRY-C-XXXX)
                                            │         ├── Business UAID (NRY-HS/DS/RT)
                                            │         ├── Referral Network
                                            │         └── Rewards, Ranks & Cycles
```

---

## Key Features & Business Rules Enforced

1. **Customer UAID Generation (`NRY-C-<SECURE_RANDOM_IDENTIFIER>`)**
   - Cryptographically secure 10-character alphanumeric identifier.
   - Permanent, generated once per customer account on the backend.
   - Repeated login never regenerates another UAID; profile updates never change the UAID.
   - Distinct from all Business UAID namespaces. Aadhaar and PAN are not mandatory.

2. **Customer Referral Rules**
   - Only genuine Customer UAIDs (`NRY-C-XXXX`) are accepted for customer referrals.
   - Wholesalers, Distributors, Retailers, and Administrators are strictly rejected.
   - Self-referrals and circular referral loops are prevented on the backend.
   - Referrals cannot be altered once established.

3. **Customer Reward Entry & Level Qualification (₹2,000 Threshold & Unit)**
   - Entry requirement: Valid Customer Referral **AND** at least ₹2,000 in qualifying net purchases.
   - At ₹1,999: Customer remains Not Eligible.
   - Level allocation: Each ₹2,000 qualifying purchase completes 1 Level.
   - An ₹8,000 purchase completes exactly 4 levels (Level 1, 2, 3, 4) and cannot be double counted.
   - Taxes (GST) and delivery charges are excluded from the reward base.

4. **12 Ranks & 120-Level Progression**
   - Every 10 completed levels completes 1 Rank (Bronze, Silver, Panna, Gold, Platinum, Ruby, Sapphire, Emerald, Diamond, Black Diamond, Mythic, Legendary).
   - Reuses authoritative reward rates from **1.10% to 2.20%**.
   - Issued once per rank per cycle into the immutable `RewardLedger`.

5. **Cycle Architecture**
   - Cycle 1 contains 120 completed levels.
   - Completing Level 120 completes Cycle 1 and initializes Cycle 2.
   - Historical records, lifetime purchases, and referral ties are permanently preserved.

6. **Quarterly Activity Compliance**
   - Calendar quarter tracking: Q1 (Jan–Mar), Q2 (Apr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dec).
   - Progressive warning workflow with 30-day grace period.
   - Account blocked only after 4 consecutive missed quarters, with auditable state transitions and data preservation.

---

## 26 Supported Screens

1. **Welcome & Onboarding**: Multi-step visual walkthrough.
2. **Sign Up & Login**: Phone/email authentication.
3. **Mobile OTP Verification**: 6-digit verification code with dev preview.
4. **Customer Profile**: Personal details and account overview.
5. **Customer UAID Display**: Copy action, QR code payload, and permanence assurance.
6. **Customer Referral Entry**: Referral code input during registration/onboarding.
7. **Referral Validation & Confirmation**: Live backend verification and sponsor confirmation.
8. **Product Marketplace**: Commercial listings, search, and category pills.
9. **Service Marketplace**: Verified service listings and provider cards.
10. **Listing Details & Filtering**: Specifications, images, and level allocation estimate.
11. **Cart**: Quantities, net subtotal, GST breakdown, and level preview.
12. **Delivery Address & Checkout**: Address management and payment gateway selector.
13. **Service Booking**: Date picker, site address, and custom instructions.
14. **Payment Status**: Escrow verification and qualification audit.
15. **Order History**: Timestamped order records and line items.
16. **Order Cancellation & Refund Status**: Transparent reversal tracking.
17. **Customer Referral Sharing**: WhatsApp/SMS share generator and QR scan.
18. **Customer Referral Network**: Peers referred and qualifying volume summary.
19. **Reward Eligibility Dashboard**: Threshold progress bar and active status.
20. **120-Level Progression Grid**: Interactive level audit matrix.
21. **12-Rank Progression Cards**: Benchmark rates and multipliers.
22. **Cycle Tracker**: Cycle 1 vs. Cycle 2 progress and carry-forward volume.
23. **Immutable Reward Ledger**: Unique one-time rank rewards.
24. **Quarterly Activity Tracker**: Q1–Q4 compliance and warning stages.
25. **Account Settings & Privacy Controls**: Device frame toggle and alerts.
26. **Support & Commercial Policies**: Zero buyer fee guarantee, contacts, and terms.

---

## Running Locally

### Development Server
```bash
cd NRY-Mobile-App
npm install
npm run dev
```
The app runs at `http://localhost:3001` and proxies `/api` calls to the FastAPI backend at `http://127.0.0.1:8000`.

### Production Build
```bash
npm run build
npm run preview
```
