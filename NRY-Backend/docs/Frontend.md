# Frontend Architecture & Specification: Noryvanta Business Marketplace

## 1. Executive Summary & Technology Stack
The **Noryvanta Business Marketplace** frontend is engineered as an enterprise-grade, high-performance web application utilizing modern React and Next.js. It implements the **Sovereign Commerce** design system—a Corporate / Modern FinTech aesthetic defined by clean typography, high-contrast visual hierarchy, ambient elevation, and micro-interactions.

### Core Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+ / 19
- **Styling**: Tailwind CSS with custom design tokens matching the Stitch design system
- **Iconography**: Lucide React & Google Material Symbols
- **State Management**: React Context & Hooks + TanStack Query (React Query)
- **Internationalization (i18n)**: Multilingual translation layer supporting English (`en`), Hindi (`hi`), and extensible to regional languages
- **Client Networking**: Axios with interceptors for JWT token lifecycle, refresh token rotation, and error handling

---

## 2. Design System: Sovereign Commerce Tokens
Directly aligned with the Stitch design specifications:
```javascript
// tailwind.config.ts theme extension
{
  colors: {
    primary: {
      DEFAULT: '#0F172A', // Obsidian Navy (primary text, critical buttons)
      container: '#131B2E',
      fixed: '#DAE2FD',
    },
    secondary: {
      DEFAULT: '#1E3A8A', // Deep Royal (interactive hover, secondary accents)
      container: '#8FA7FE',
      cobalt: '#1D4ED8',  // Active links, input focus
    },
    tertiary: {
      DEFAULT: '#10B981', // Verification Emerald (verified suppliers, cleared payments)
      emeraldDeep: '#059669',
      container: '#002113',
    },
    accent: {
      amber: '#F59E0B',   // Escrow pending, warning states
      amberDeep: '#D97706',
    },
    surface: {
      DEFAULT: '#F8FAFC', // Base Canvas
      card: '#FFFFFF',    // Card background
      subtle: '#EFF4FF',
      variant: '#D3E4FE',
    },
    border: {
      light: '#E2E8F0',
      medium: '#CBD5E1',
      dark: '#76777D',
    }
  },
  fontFamily: {
    headline: ['"Plus Jakarta Sans"', 'sans-serif'],
    body: ['Inter', 'sans-serif'],
  }
}
```

---

## 3. Application Directory Structure
```
frontend/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout (fonts, providers)
│   │   ├── page.tsx                 # Marketplace Home & Discovery
│   │   ├── login/
│   │   │   └── page.tsx             # Business Login (OTP + OAuth2)
│   │   ├── register/
│   │   │   └── page.tsx             # Multi-step Business Registration
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Business Owner Dashboard
│   │   ├── products/
│   │   │   ├── page.tsx             # Product Catalog & Wholesale Directory
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Product Detail with B2B Tier Pricing
│   │   ├── checkout/
│   │   │   └── page.tsx             # Escrow Checkout & Milestone Agreement
│   │   ├── ai-assistant/
│   │   │   └── page.tsx             # AI Listing Assistant
│   │   ├── rank-tracker/
│   │   │   └── page.tsx             # Vendor Network Progress & Tier Tracker
│   │   └── admin/
│   │       ├── fees/
│   │       │   └── page.tsx         # Platform Fee & Financial Dashboard
│   │       └── routing/
│   │           └── page.tsx         # Country Payment Routing
│   ├── components/
│   │   ├── ui/                      # Atoms: Button, Input, Modal, Badge, Card
│   │   ├── layout/                  # Navbar, Sidebar, Footer, PageHeader
│   │   ├── auth/                    # OTPInputMatrix, OAuthButtons, RoleGate
│   │   ├── marketplace/             # ProductCard, BulkPricingTable, EscrowBadge
│   │   └── dashboard/               # MetricCard, RevenueChart, OrderTable
│   ├── contexts/
│   │   ├── AuthContext.tsx          # User session, JWT tokens, RBAC permissions
│   │   └── I18nContext.tsx          # Active locale, translations dictionary, switchers
│   ├── lib/
│   │   ├── api.ts                   # Axios client connected to FastAPI v1
│   │   ├── constants.ts             # Static configuration, route map
│   │   └── utils.ts                 # Currency formatter (INR, USD), date helpers
│   └── locales/
│       ├── en.json                  # English dictionary
│       └── hi.json                  # Hindi dictionary
```

---

## 4. Key Page Modules & Workflow

### 1. Marketplace Discovery (`/`)
- **Global Header**: Logo, Search bar with category dropdown, Country/Currency selector, Language switch (`EN`/`HI`), Auth CTA (`Login`/`Register`).
- **Hero Section**: Value proposition ("India's Premier B2B Escrow Marketplace: Connect. Grow. Thrive."), search by HSN/SAC, Product, or Verified Supplier.
- **Category Matrix**: Industrial Machinery, Electrical & Electronics, Raw Materials & Chemicals, Packaging & Textiles.
- **Trust Elements**: Live escrow milestone tracker, GST-verified badges, Escrow protection guarantee.

### 2. Authentication System (`/login`)
- **Dual Mode**:
  - **OTP Authentication**: Phone number / Email input -> 6-digit cryptographic OTP matrix -> Instant token exchange.
  - **OAuth2 / OIDC**: Google Business, Microsoft Entra ID, Enterprise SAML SSO.
- **Role Detection**: Automatically redirects verified vendors to `/dashboard`, buyers to `/products`, and admins to `/admin/fees`.

### 3. Business Registration Flow (`/register`)
- **Step 1: Entity Details**: Company Name, Business Type (Private Ltd, LLP, Sole Proprietorship), Year of Inception.
- **Step 2: Regulatory Tax Compliance**: GSTIN validation, PAN number, MSME/Udyam Registration.
- **Step 3: Escrow Settlement Bank**: Account Holder Name, IFSC code, Escrow Virtual Account creation.
- **Step 4: AI Assisted Onboarding**: Upload product catalog or brochure for instant parsing.

### 4. Business Owner Dashboard (`/dashboard`)
- **Top KPIs**: Total Gross Merchandise Value (GMV), In-Escrow Funds, Cleared Disbursals, Active RFQs.
- **Orders & Escrow Status**: Real-time progress bars showing Buyer Deposited -> Dispatched -> Delivery Confirmed -> Escrow Released.
- **Inventory & Alert Drawer**: Low stock warnings, pending quotation requests.

### 5. Product & Tiered Pricing View (`/products/[id]`)
- **Dynamic Bulk Discount Tiers**:
  - 10 - 49 units: Standard wholesale rate
  - 50 - 199 units: 8% discount
  - 200+ units: 15% discount + free freight insurance
- **Escrow Guarantee Modal**: Explains milestone disbursement before the buyer finalizes payment.

### 6. AI Listing Assistant (`/ai-assistant`)
- Allows vendors to input minimal product attributes or upload a photo/spec sheet.
- Automatically generates SEO title, HSN classification, tax slab (18% / 12%), commercial description, and keyword tags via backend AI endpoint.

---

## 5. i18n Translation Layer
Implemented via a zero-overhead, highly performant React Context:
- Instant client-side locale toggle without full page reloads.
- Full support for numerical and currency formatting (e.g., `₹ 1,50,000` in Indian numbering system vs `$ 2,000` in Western format).
- Extensible translation keys covering all navigation, dashboard, and transactional modules.
