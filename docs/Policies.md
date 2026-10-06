# Operational & Governance Policies: Noryvanta Business Marketplace

---

## 1. Escrow Milestone & Fund Release Policy

### Purpose & Structure
The Noryvanta Escrow Policy guarantees transactional safety for both buyers and suppliers by holding commercial funds in an institutional escrow account operated in partnership with an RBI-regulated banking institution.

### Milestone Criteria
1. **Milestone 1: Escrow Funding**: Buyer deposits 100% of order value (including GST and shipping). Status transitions to `ESCROW_LOCKED`. Supplier receives automated manufacturing/dispatch authorization.
2. **Milestone 2: Dispatch & In-Transit Tracking**: Supplier attaches valid e-way bill number and logistics tracking identifier. Status updates to `DISPATCHED`.
3. **Milestone 3: Delivery Confirmation & 48-Hour Inspection Window**: Logistics API signals delivery. The 48-hour inspection countdown initiates.
4. **Milestone 4: Fund Release**: If no dispute is filed within 48 hours, or if buyer confirms electronic acceptance, funds are disbursed automatically:
   - Vendor receives: $\text{Gross Amount} - \text{Applicable Category Platform Fee} - \text{TDS (Sec 194-O)}$.
   - Category platform fee (Wholesaler: 3.20%, Distributor: 5.20%, Services: 5.20%, Retailer: 8.20%) is transferred to Noryvanta's operational revenue ledger.
   - TDS is credited into the central tax escrow ledger.

---

## 2. Return, Refund & Dispute Mediation Policy

### Eligibility for Return / Refund
Due to wholesale B2B quantities and custom manufacturing requirements, returns are restricted to the following conditions:
- **Material Discrepancy**: Received goods deviate substantially from agreed technical data sheets or purchase order specifications.
- **Transit Damage**: Severe physical destruction verified by the freight carrier's damage endorsement at delivery.
- **Shortage**: Box count or net weight discrepancy verified against bill of lading.

### Dispute Escalation Workflow
```
[Dispute Lodged within 48h] ---> [Escrow Automatically Frozen]
                                       |
                                       v
                     [Supplier 48h Response Window]
                     ├── Option A: Concede -> Buyer Returns Goods -> Full Refund Issued
                     ├── Option B: Mutual Resolution -> Partial Credit Note & Split Escrow
                     └── Option C: Contested -> Escalate to Noryvanta Arbitration Panel
                                       |
                                       v
                    [Binding Independent Platform Ruling]
```

---

## 3. Data Protection & Privacy Policy (DPDP Act Compliance)

### Data Minimization & Sovereign Residency
In strict adherence to the **Digital Personal Data Protection (DPDP) Act, 2023**:
1. **Data Residency**: All user information, KYC records, and transactional financial records are stored exclusively within sovereign data centers located inside the territory of India (AWS `ap-south-1` Mumbai / Hyderabad).
2. **Purpose Limitation**: Personal identification numbers (PAN, Aadhaar numbers, director contact details) are processed solely for statutory KYC, anti-money laundering (AML), and tax deduction purposes.
3. **Encryption Standard**: Data at rest is encrypted using AES-256 with KMS envelope encryption. In-transit data is protected using TLS 1.3 with forward secrecy.
4. **Right to Erasure**: Non-transactional personal records may be deleted upon formal written request, subject to statutory 7-year retention requirements for financial and tax audit logs under the Companies Act, 2013.

---

## 4. Anti-Money Laundering (AML) & Fraud Prevention Policy

1. **Transaction Velocity Limits**: New vendor accounts are subject to rolling weekly GMV limits until three successful orders have cleared without disputes.
2. **Third-Party Payment Ban**: Payments into escrow must originate from a verified bank account or corporate credit facility belonging to the registered buyer entity. Personal accounts for third-party shell entities are rejected.
3. **Sanctions & Watchlist Screening**: Automated daily screening of all registered corporate directors against Indian Enforcement Directorate (ED), Ministry of Corporate Affairs (MCA) disqualified directors list, and UN Global Sanctions.
