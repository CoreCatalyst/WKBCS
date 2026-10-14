# API Specification: Noryvanta Business Marketplace

## 1. Overview
The **Noryvanta Business Marketplace API** is a RESTful API specification compliant with **OpenAPI 3.1**. It provides complete interfaces for B2B authentication, business KYC verification, product catalog management, purchase order generation, escrow transaction lifecycle, and administrative governance.

- **Base URL**: `http://localhost:8000/api/v1`
- **Interactive Documentation**: `http://localhost:8000/docs` (Swagger UI) & `/redoc` (ReDoc)
- **Content Type**: `application/json`
- **Authentication**: Bearer JWT (`Authorization: Bearer <access_token>`)

---

## 2. Authentication Endpoints (`/auth`)

### 1. Request OTP
- **Endpoint**: `POST /auth/otp/request`
- **Description**: Generates and sends a 6-digit OTP to the provided phone number or email address.
- **Request Body**:
```json
{
  "identifier": "+919876543210",
  "channel": "sms" // or "email"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "OTP dispatched successfully.",
  "ttl_seconds": 300,
  "dev_otp_preview": "123456" // Included only in non-production environments
}
```

### 2. Verify OTP & Obtain Tokens
- **Endpoint**: `POST /auth/otp/verify`
- **Description**: Verifies the OTP and returns access & refresh tokens.
- **Request Body**:
```json
{
  "identifier": "+919876543210",
  "otp_code": "123456"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_99a8b1",
    "phone": "+919876543210",
    "email": "vendor@noryvantaglobal.com",
    "role": "vendor",
    "is_verified": true,
    "has_business_profile": true
  }
}
```

### 3. OAuth2 / OIDC Exchange
- **Endpoint**: `POST /auth/oauth/token`
- **Description**: Exchanges authorization code from OIDC provider (Google, Microsoft) for Noryvanta session tokens.
- **Request Body**:
```json
{
  "provider": "google",
  "id_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

### 4. Refresh Token Rotation
- **Endpoint**: `POST /auth/token/refresh`
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 3. Business & Vendor KYC Endpoints (`/businesses`)

### 1. Register Business Profile
- **Endpoint**: `POST /businesses/onboard`
- **Headers**: `Authorization: Bearer <access_token>` (User role: VENDOR)
- **Request Body**:
```json
{
  "legal_name": "Apex Precision Instruments Pvt Ltd",
  "trade_name": "Apex Instruments",
  "business_type": "PRIVATE_LIMITED",
  "gstin": "27AABCA1234F1Z5",
  "pan": "AABCA1234F",
  "bank_account_number": "91234567890123",
  "ifsc_code": "HDFC0001234",
  "primary_category": "Industrial Electronics",
  "registered_address": {
    "street": "Plot 45, MIDC Industrial Area",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411018",
    "country": "IN"
  }
}
```
- **Response `201 Created`**:
```json
{
  "business_id": "biz_8829ad",
  "status": "KYC_PENDING",
  "gst_verified": true,
  "virtual_escrow_account": "NORY_VA_27AABCA1234F1Z5"
}
```

### 2. Get Business Profile
- **Endpoint**: `GET /businesses/me`
- **Response `200 OK`**: Current business entity, verification badges, escrow balance.

---

## 4. Product Catalog Endpoints (`/products`)

### 1. List / Search Products
- **Endpoint**: `GET /products`
- **Query Params**:
  - `query` (string, optional)
  - `category` (string, optional)
  - `min_price` / `max_price` (float, optional)
  - `verified_only` (bool, default true)
  - `page` (int, default 1), `limit` (int, default 20)
- **Response `200 OK`**:
```json
{
  "total": 128,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": "prod_101",
      "title": "Industrial High-Precision Servo Motor 3KW",
      "hsn_code": "8501",
      "base_price": 24500.0,
      "moq": 5,
      "stock_quantity": 450,
      "vendor": {
        "id": "biz_8829ad",
        "trade_name": "Apex Instruments",
        "verification_badge": "VERIFIED_PLATINUM",
        "gst_verified": true
      },
      "pricing_tiers": [
        { "min_qty": 5, "max_qty": 19, "unit_price": 24500.0 },
        { "min_qty": 20, "max_qty": 99, "unit_price": 22800.0 },
        { "min_qty": 100, "max_qty": null, "unit_price": 21000.0 }
      ]
    }
  ]
}
```

### 2. Create Product
- **Endpoint**: `POST /products`
- **Headers**: `Authorization: Bearer <access_token>` (Vendor role)

### 3. AI Listing Assistant
- **Endpoint**: `POST /products/ai-assist`
- **Request Body**:
```json
{
  "raw_title": "servo motor 3kw for cnc factory",
  "category_hint": "industrial motors",
  "features": ["3000 rpm", "ip65 rated", "high torque"]
}
```
- **Response `200 OK`**:
```json
{
  "optimized_title": "Heavy-Duty 3KW 3000RPM CNC Industrial Servo Motor (IP65 Waterproof)",
  "suggested_hsn": "850152",
  "gst_rate_percent": 18.0,
  "seo_description": "Engineered for high-duty CNC industrial machinery with continuous 3000 RPM torque and IP65 dust/water resistance...",
  "suggested_tags": ["CNC Parts", "Servo Motor", "Industrial Automation", "Precision Drive"]
}
```

---

## 5. Orders & Escrow Endpoints (`/orders` & `/escrow`)

### 1. Create Purchase Order with Escrow
- **Endpoint**: `POST /orders`
- **Request Body**:
```json
{
  "product_id": "prod_101",
  "quantity": 25,
  "shipping_address_id": "addr_912",
  "requested_delivery_date": "2026-10-15"
}
```
- **Response `201 Created`**:
```json
{
  "order_id": "ord_5521",
  "order_number": "NORY-2026-0982",
  "unit_price": 22800.0,
  "subtotal": 570000.0,
  "gst_amount": 102600.0,
  "platform_fee": 14250.0,
  "total_payable": 672600.0,
  "escrow_status": "AWAITING_PAYMENT"
}
```

### 2. Fund Escrow (Payment Webhook / Confirmation)
- **Endpoint**: `POST /escrow/{order_id}/deposit`
- **Request Body**:
```json
{
  "payment_reference": "pay_razor_98127391",
  "payment_method": "NEFT_RTGS",
  "amount_paid": 672600.0
}
```
- **Response `200 OK`**:
```json
{
  "order_id": "ord_5521",
  "escrow_id": "esc_77182",
  "status": "ESCROW_LOCKED",
  "milestone": "VENDOR_DISPATCH_REQUIRED"
}
```

### 3. Release Escrow Funds (Milestone Approved)
- **Endpoint**: `POST /escrow/{order_id}/release`
- **Headers**: `Authorization: Bearer <access_token>` (Buyer or Admin)
- **Response `200 OK`**:
```json
{
  "order_id": "ord_5521",
  "escrow_status": "FUNDS_DISBURSED",
  "disbursed_to_vendor": 657350.0,
  "tds_deducted": 5700.0,
  "platform_commission": 14250.0,
  "settlement_ref": "UTR_HDFC20260924912"
}
```

---

## 6. Admin Governance & Platform Fee Endpoints (`/admin`)

- `GET /admin/fees/summary`: Gross merchandise value, platform commission total, pending payouts, TDS deducted.
- `PUT /admin/fees/rates`: Adjust platform fee tiered percentages by product category.
- `GET /admin/routing`: Configure domestic (UPI/NetBanking) and cross-border payment gateways.
