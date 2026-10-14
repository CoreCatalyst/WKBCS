# Government Regulations & Statutory Compliance: Noryvanta Business Marketplace

This document outlines the statutory, tax, and regulatory compliance frameworks governing the operation of the **Noryvanta Business Marketplace Platform** in India.

---

## 1. Goods and Services Tax (GST) & E-Invoicing Architecture

### Statutory Requirement
Under the Central Goods and Services Tax (CGST) Act, 2017:
- All commercial vendors transacting on an electronic commerce operator (ECO) platform must possess an active GSTIN regardless of annual turnover threshold.
- Mandatory **E-Invoicing** applies to all registered entities meeting the prescribed aggregate turnover threshold, requiring real-time registration of B2B invoices with the Invoice Registration Portal (IRP).

### Noryvanta Compliance Implementation
1. **Automated GSTIN Validation**: During vendor onboarding, Noryvanta's backend validates the 15-character GSTIN against the GSTN API to verify:
   - Entity legal name and trade name matching bank records.
   - Active taxpayer status.
   - Principal place of business address.
2. **Invoice Reference Number (IRN) Generation**:
   - For applicable vendors, Celery background workers communicate with the GST Suvidha Provider (GSP) API to generate a 64-character encrypted IRN hash and a signed QR code.
   - The generated tax invoice embeds the IRN and digitally signed QR code into the downloadable PDF before dispatching to the buyer.
3. **HSN / SAC Code Enforcement**:
   - Every product catalog entry must declare a valid 4-, 6-, or 8-digit Harmonized System of Nomenclature (HSN) code.
   - Tax rate calculation automatically splits between CGST + SGST (intra-state trade) and IGST (inter-state commercial movement).

---

## 2. Income Tax Act: Section 194-O (TDS by E-Commerce Operator)

### Regulatory Mandate
Section 194-O of the Income Tax Act, 1961 requires an Electronic Commerce Operator (ECO) to deduct Tax Deducted at Source (TDS) at the rate of **1.0%** of the gross amount of sales of goods or provision of services facilitated through its digital platform.

### Mathematical Deduction Model
$$\text{Gross Transaction Value} = \text{Subtotal of Goods} + \text{Packaging/Freight}$$
$$\text{TDS (Sec 194-O)} = \text{Gross Transaction Value} \times 1.0\%$$
$$\text{Platform Commission Fee} = \text{Gross Transaction Value} \times \text{Agreed Rate (e.g., 3.0\%)}$$
$$\text{GST on Commission} = \text{Platform Commission Fee} \times 18.0\%$$
$$\text{Net Disbursal to Vendor} = \text{Gross Transaction Value} + \text{Applicable GST} - \text{TDS} - (\text{Platform Commission} + \text{GST on Commission})$$

### Compliance Ledger & Form 26Q
- Noryvanta's backend logs every TDS deduction in the immutable `fee_ledger` table.
- Noryvanta deposits the deducted TDS with the Central Government by the 7th of the subsequent month.
- Quarterly Form 26Q filing generates Form 16A certificates automatically downloadable by vendors from their dashboard.

---

## 3. Foreign Direct Investment (FDI) E-Commerce Guidelines

### Press Note 2 (2018 Series) & Consolidated FDI Policy
Under Indian FDI guidelines, 100% FDI is permitted under the **Marketplace Model of E-Commerce** under the automatic route. FDI is prohibited in the **Inventory-Based Model**.

### Platform Governance Controls
1. **No Ownership of Inventory**: Noryvanta strictly acts as a neutral technology and escrow intermediary. All inventories listed on the platform are owned, warehoused, and fulfilled directly by third-party registered vendors.
2. **25% Single Vendor Cap**: No single vendor or its group companies is permitted to account for more than 25% of total annual sales purchases on the Noryvanta platform. The admin governance service continuously monitors this threshold.
3. **Fair & Non-Discriminatory Pricing**: Noryvanta does not directly or indirectly influence the sale price of goods or services; pricing and bulk discounts are established autonomously by the vendor.
4. **Arm's Length Services**: Value-added logistics, warehousing, and advertising services are provided to all vendors at transparent, non-discriminatory rates.

---

## 4. Information Technology Act, 2000 & Intermediary Guidelines (2021)

Under Section 79 of the IT Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:
1. **Due Diligence**: Clear publication of Terms of Service, User Agreement, and Privacy Policy on the platform.
2. **Grievance Officer Appointment**: Noryvanta designates a Grievance Redressal Officer prominently published on the site, mandated to acknowledge grievances within 24 hours and resolve within 15 days.
3. **Takedown Mechanism**: Automated workflow to remove counterfeit, infringing, or illegal listings within 36 hours upon receiving an order from a competent judicial court or government authority.

---

## 5. Digital Personal Data Protection (DPDP) Act, 2023

1. **Explicit Notice & Consent**: Every buyer and vendor provides clear, affirmative consent for the processing of business and personal data.
2. **Data Fiduciary Responsibilities**: Noryvanta operates as a Data Fiduciary, ensuring that data processors (such as SMS gateways and cloud providers) maintain equivalent enterprise security standards.
3. **Sovereign Cloud Data Residency**: No personal or financial transaction data is exported outside the physical boundaries of India without explicit government-sanctioned bilateral adequacy mechanisms.
