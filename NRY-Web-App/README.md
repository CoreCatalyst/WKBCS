# NORYVANTA — BUSINESS WEB APPLICATION (`frontend/`)

The `frontend/` folder contains the Noryvanta Business Web Application built with Next.js 15 (React 19, Tailwind CSS).

## 1. Scope and Responsibilities

This application is exclusively for:
1. **Wholesalers**
2. **Distributors**
3. **Retailers**
4. **Service Operators / Service Providers**
5. **Authorized Platform Administrators**

> **Note**: Ordinary customer shopping and bookings are served by the Customer Mobile Application (Android/iOS), communicating with the shared backend REST API.

## 2. Key Features

- **Business Registration & Onboarding**: Multi-tier merchant onboarding, GST/PAN validation, address geocoding, and UAID generation.
- **Listing Management**: Creation of product/service listings with mandatory **4 to 10 images** and optional **up to 2 short videos**.
- **Transparent Order Management**: Real-time order tracking and invoice generation. Customer platform fee is strictly 0.00%.
- **Settlement & Fee Ledger**: Dynamic category platform fee calculation:
  - Wholesaler: 3.20%
  - Distributor: 5.20%
  - Retailer: 8.20%
  - Services: 5.20%
- **Universal Account Identifier (UAID)**: QR code generation and verification.
- **Referral & Network Progression**: 120-Level Network progress tracker across 12 ranks.
- **Policies & Compliance**: Integrated terms, privacy, refunds, and regulatory compliance.

## 3. Directory Structure

```
frontend/
├── src/
│   ├── app/           # Next.js App Router (18+ production routes)
│   ├── components/    # Modular UI components (Navbar, Footer, Modals, Forms)
│   ├── layouts/       # MainLayout and DashboardLayout
│   ├── hooks/         # useAuth, useBusiness, useProducts
│   ├── services/      # Centralized Backend API Client Services
│   │   ├── apiClient.ts    # Central Axios client with JWT bearer interceptors
│   │   ├── authApi.ts      # OTP request/verify, Google login, session refresh
│   │   ├── businessApi.ts  # Registration, dashboard summary, settlements
│   │   ├── productApi.ts   # Product catalog, media validation, AI assistant
│   │   ├── serviceApi.ts   # Services marketplace and bookings
│   │   ├── orderApi.ts     # Purchase orders and financial breakdown
│   │   ├── paymentApi.ts   # Razorpay/Cashfree checkout session creation
│   │   ├── uaidApi.ts      # UAID retrieval and resolution
│   │   └── rewardApi.ts    # Referral ledger and reward wallet
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Currency formatters, media validators, fee schedules
│   └── styles/        # Tailwind CSS design system tokens
├── public/            # Static assets
├── tests/             # Media rules and fee schedule unit tests
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript compiler configuration
├── .env.example       # Public client configuration template
└── README.md          # Frontend architecture documentation
```

## 4. Environment Variables

The frontend reads **strictly non-secret** public configuration:

```env
# Backend API Base URL (Configurable deployment address)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Frontend App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Publishable Payment Client Keys (Client-side checkout modal)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_noryvanta_sandbox
NEXT_PUBLIC_CASHFREE_APP_ID=cf_test_noryvanta_sandbox

# Bot Defense (Public Site Key)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

> **Security Rule**: Never place database credentials, JWT secrets, payment secret keys, or private API keys in `frontend/.env`. All private secrets live exclusively in `backend/.env`.

## 5. Running the Application Locally

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Running on http://localhost:3000

# Create production build
npm run build

# Start production server
npm start
```
