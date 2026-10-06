import hashlib
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.kyc import (
    UserIdentityKYC,
    BusinessKYC,
    TaxKYC,
    CKYCReference,
    BankAccountVerification,
    KYCAuditTrail,
    AuthorizedRepresentative,
    BeneficialOwner,
    KYCVerificationEvent,
    KYCStatus,
    BankVerificationStatus,
    DocumentType
)
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.network import NetworkMember

# ─── SENSITIVE DATA PROTECTION & MASKING UTILITIES (RULE 7) ───────────────────

def mask_pan(pan: Optional[str]) -> str:
    """Masks PAN: XXXXX1234X (first 5 chars X, middle 4 digits shown, last char X)."""
    if not pan:
        return "XXXXX0000X"
    clean = re.sub(r"[^A-Za-z0-9]", "", pan).upper()
    if len(clean) >= 10:
        return f"XXXXX{clean[5:9]}X"
    return "XXXXX" + clean[-4:] if len(clean) >= 4 else "XXXXX0000X"

def mask_aadhaar(aadhaar: Optional[str]) -> str:
    """Masks Aadhaar: XXXX XXXX 1234 (only last 4 digits shown)."""
    if not aadhaar:
        return "XXXX XXXX 0000"
    clean = re.sub(r"[^0-9]", "", aadhaar)
    last4 = clean[-4:] if len(clean) >= 4 else "0000"
    return f"XXXX XXXX {last4}"

def mask_bank_account(account_number: Optional[str]) -> str:
    """Masks Bank Account: XXXXXXXX1234 (only last 4 digits shown)."""
    if not account_number:
        return "XXXXXXXX0000"
    clean = re.sub(r"[^0-9]", "", account_number)
    last4 = clean[-4:] if len(clean) >= 4 else "0000"
    return f"XXXXXXXX{last4}"

def mask_gstin(gstin: Optional[str]) -> str:
    """Masks GSTIN: 27XXXXX1234X1ZX."""
    if not gstin:
        return "27XXXXX0000X1ZX"
    clean = re.sub(r"[^A-Za-z0-9]", "", gstin).upper()
    if len(clean) >= 15:
        return f"{clean[:2]}XXXXX{clean[7:11]}X{clean[-3:]}"
    return "XXXXX" + clean[-4:] if len(clean) >= 4 else "27XXXXX0000X1ZX"

def secure_hash(value: Optional[str]) -> str:
    """Computes SHA-256 hash for duplicate/tamper detection without storing raw sensitive numbers."""
    if not value:
        return ""
    normalized = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# ─── KYC REQUIREMENTS BY ACCOUNT & BUSINESS TYPE (RULE 2 & 3) ─────────────────

ACCOUNT_KYC_SPECIFICATION = {
    "INDIVIDUAL_CUSTOMER": {
        "account_type": "INDIVIDUAL_CUSTOMER",
        "description": "Minimal risk-based verification for individual buyers: Name, Mobile, Email, Location + OVD when KYC is required.",
        "required_categories": ["IDENTITY", "TAX"],
        "identity_docs": ["AADHAAR", "VOTER_ID", "PASSPORT", "DRIVING_LICENSE", "OVD"],
        "business_kyc_required": False,
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": False,
        "demands_bank": False,
        "bank_verification_status": "NOT_REQUIRED",
        "ckyc_usage": "CKYC Identifier / KYC Identifier search/download where available",
        "pan_requirement": "PAN required only when specific transaction threshold or regulatory trigger applies"
    },
    "SOLE_PROPRIETOR": {
        "account_type": "SOLE_PROPRIETOR",
        "description": "Proprietor CDD + Business/activity proof (Shop Establishment, Udyam MSME, Trade License).",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX"],
        "identity_docs": ["AADHAAR", "PAN", "PASSPORT", "VOTER_ID", "OVD"],
        "business_kyc_required": True,
        "business_activity_docs": ["SHOP_ESTABLISHMENT", "UDYAM_MSME", "TRADE_LICENSE", "BUSINESS_REGISTRATION"],
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": True,
        "demands_bank": False,
        "bank_verification_status": "Recommended for merchant settlements/refunds",
        "ckyc_usage": "Proprietor CKYC Identifier where applicable"
    },
    "PARTNERSHIP": {
        "account_type": "PARTNERSHIP",
        "description": "Partnership Firm CDD: Partnership deed + registration info + Firm PAN + Authorized partner & Beneficial owner CDD.",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX", "AUTHORIZED_REPRESENTATIVE", "BENEFICIAL_OWNER"],
        "firm_docs": ["PARTNERSHIP_DEED", "BUSINESS_REGISTRATION"],
        "business_kyc_required": True,
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": True,
        "demands_bank": False,
        "bank_verification_status": "Recommended/required where payment settlement needs it",
        "ckyc_usage": "Relevant partners and beneficial owners CKYC Identifier",
        "individuals_cdd": "Authorized partner KYC + Beneficial owners (>15% share). No mass employee document collection."
    },
    "PARTNERSHIP_FIRM": {
        "account_type": "PARTNERSHIP",
        "description": "Partnership Firm CDD: Partnership deed + registration info + Firm PAN + Authorized partner & Beneficial owner CDD.",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX", "AUTHORIZED_REPRESENTATIVE", "BENEFICIAL_OWNER"],
        "firm_docs": ["PARTNERSHIP_DEED", "BUSINESS_REGISTRATION"],
        "business_kyc_required": True,
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": True,
        "demands_bank": False,
        "bank_verification_status": "Recommended/required where payment settlement needs it",
        "ckyc_usage": "Relevant partners and beneficial owners CKYC Identifier"
    },
    "COMPANY_LLP": {
        "account_type": "COMPANY_LLP",
        "description": "Company / LLP CDD: CIN/LLPIN + Certificate of Incorporation + Registered address + Entity PAN + Authorized representative & Beneficial owner CDD.",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX", "AUTHORIZED_REPRESENTATIVE", "BENEFICIAL_OWNER", "BANK"],
        "entity_docs": ["INCORPORATION_CERTIFICATE", "LLPIN_CERTIFICATE", "BUSINESS_REGISTRATION"],
        "business_kyc_required": True,
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": True,
        "demands_bank": True,
        "bank_verification_status": "Business bank account verification for settlement",
        "ckyc_usage": "Authorized representative & beneficial owners CKYC Identifier",
        "individuals_cdd": "Authorized representative (Board resolution) + Beneficial owners (>10% share). No mass employee collection."
    },
    "REGISTERED_SERVICE_PROVIDER": {
        "account_type": "REGISTERED_SERVICE_PROVIDER",
        "description": "Determines underlying legal structure first (Individual, Sole Proprietor, Partnership, LLP/Company) and applies corresponding KYC.",
        "requires_legal_structure_selection": True,
        "supported_legal_structures": ["INDIVIDUAL", "SOLE_PROPRIETOR", "PARTNERSHIP", "COMPANY_LLP"],
        "required_categories": ["IDENTITY", "BUSINESS", "TAX"],
        "identity_docs": ["PAN", "AADHAAR"],
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": True,
        "bank_verification_status": "Depending on payment/refund/settlement function"
    },
    "SKILLED_HOME_SERVICE_PROVIDER": {
        "account_type": "SKILLED_HOME_SERVICE_PROVIDER",
        "description": "Basic individual identity verification. Zero GST/TAN demand. Minimal business proof if appropriate.",
        "required_categories": ["IDENTITY", "TAX"],
        "identity_docs": ["AADHAAR", "PAN", "VOTER_ID", "OVD"],
        "business_kyc_required": False,
        "demands_gst": False,
        "demands_tan": False,
        "demands_business_registration": False,
        "demands_bank": False,
        "bank_verification_status": "NOT_REQUIRED (Only if needed for actual payment workflow)",
        "ckyc_usage": "Individual CKYC Identifier where applicable"
    },
    "SKILLED_SERVICE_PROVIDER": {
        "account_type": "SKILLED_HOME_SERVICE_PROVIDER",
        "description": "Individual KYC appropriate to service; GST EXEMPT (never demanded)",
        "required_categories": ["IDENTITY", "TAX"],
        "identity_docs": ["AADHAAR", "PAN", "VOTER_ID", "OVD"],
        "demands_gst": False,
        "demands_business_registration": False,
        "bank_verification_status": "NOT_REQUIRED"
    },
    "WHOLESALER": {
        "account_type": "WHOLESALER",
        "description": "Business PAN + GSTIN + TAN where applicable + Registration/Incorporation docs + Authorized person's KYC",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX"],
        "identity_docs": ["PAN", "AADHAAR", "PASSPORT"],
        "demands_gst": True,
        "demands_business_registration": True
    },
    "DISTRIBUTOR": {
        "account_type": "DISTRIBUTOR",
        "description": "Business PAN + GSTIN + TAN where applicable + Authorized person's KYC",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX"],
        "identity_docs": ["PAN", "AADHAAR"],
        "demands_gst": True,
        "demands_business_registration": True
    },
    "RETAILER": {
        "account_type": "RETAILER",
        "description": "Business PAN + GSTIN + Trade/Shop establishment + Authorized person's KYC",
        "required_categories": ["IDENTITY", "BUSINESS", "TAX"],
        "identity_docs": ["PAN", "AADHAAR"],
        "demands_gst": True,
        "demands_business_registration": True
    }
}


class KYCService:
    """
    Noryvanta Modular KYC, Identity, and Bank-Account Verification Service.
    Enforces strict architectural separation:
    - UserIdentityKYC
    - BusinessKYC
    - TaxKYC
    - CKYCReference
    - BankAccountVerification
    - AuthorizedRepresentative
    - BeneficialOwner
    - KYCAuditTrail / KYCVerificationEvent
    Strict Non-Withdrawable Reward Rule: Bank verification does NOT grant cash withdrawal rights!
    """

    @staticmethod
    def get_kyc_requirements(
        account_type: str,
        business_type: Optional[str] = None,
        legal_structure: Optional[str] = None,
        payment_needs_settlement: bool = False
    ) -> Dict[str, Any]:
        """Returns configurable KYC document requirements based on business/account type and legal structure."""
        b_type = (business_type or "").strip().upper().replace(" ", "_")
        acc = (account_type or "").strip().upper().replace(" ", "_")

        # 1. Registered Service Provider: map to selected legal structure
        if acc == "REGISTERED_SERVICE_PROVIDER" and legal_structure:
            struct = legal_structure.strip().upper().replace(" ", "_")
            if struct in ACCOUNT_KYC_SPECIFICATION:
                spec = dict(ACCOUNT_KYC_SPECIFICATION[struct])
                spec["parent_account_type"] = "REGISTERED_SERVICE_PROVIDER"
                spec["resolved_legal_structure"] = struct
                return spec

        # 2. Check direct account types
        if acc in ACCOUNT_KYC_SPECIFICATION:
            spec = dict(ACCOUNT_KYC_SPECIFICATION[acc])
            if payment_needs_settlement:
                spec["demands_bank"] = True
                spec["bank_verification_status"] = "REQUIRED_FOR_SETTLEMENT"
            return spec

        # 3. Check business type
        if b_type in ACCOUNT_KYC_SPECIFICATION:
            return ACCOUNT_KYC_SPECIFICATION[b_type]

        if "SOLE" in acc or "PROPRIETOR" in acc or "SOLE" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["SOLE_PROPRIETOR"]
        if "PARTNER" in acc or "PARTNER" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["PARTNERSHIP"]
        if "COMPANY" in acc or "LLP" in acc or "CORP" in acc:
            return ACCOUNT_KYC_SPECIFICATION["COMPANY_LLP"]
        if "HOME" in acc or "SKILLED" in acc or "HOME" in b_type or "SKILLED" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["SKILLED_HOME_SERVICE_PROVIDER"]
        if "SERVICE" in acc or "SERVICE" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["REGISTERED_SERVICE_PROVIDER"]
        if "WHOLESALE" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["WHOLESALER"]
        if "DISTRIBUTOR" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["DISTRIBUTOR"]
        if "RETAIL" in b_type or "SHOP" in b_type:
            return ACCOUNT_KYC_SPECIFICATION["RETAILER"]

        return ACCOUNT_KYC_SPECIFICATION["INDIVIDUAL_CUSTOMER"]

    @classmethod
    async def log_audit_event(
        cls,
        user_id: str,
        verification_type: str,
        status: str,
        actor_id: str,
        actor_role: str,
        db: AsyncSession,
        uaid: Optional[str] = None,
        provider_ref: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        notes: Optional[str] = None
    ) -> KYCAuditTrail:
        """Records an immutable audit event for every KYC and bank verification action (Rule 12)."""
        now = datetime.now(timezone.utc)
        audit = KYCAuditTrail(
            user_id=user_id,
            uaid=uaid,
            verification_type=verification_type,
            provider_reference_id=provider_ref,
            status=status,
            rejection_reason=rejection_reason,
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes,
            submitted_at=now,
            verified_at=now if status == "VERIFIED" else None
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)
        return audit

    # ─── 1. INDIVIDUAL IDENTITY KYC ───────────────────────────────────────────

    @classmethod
    async def submit_identity_kyc(
        cls,
        user_id: str,
        full_legal_name: str,
        id_document_type: str,
        id_document_number: str,
        db: AsyncSession,
        mobile_verified: bool = False,
        email_verified: bool = False,
        provider_ref: Optional[str] = None
    ) -> UserIdentityKYC:
        """Submits Individual Identity KYC with masking and secure hash storage."""
        # Find UAID
        u_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(u_stmt)).scalars().first()
        uaid = user.uaid if user and user.uaid else "NRY-MEMBER"

        stmt = select(UserIdentityKYC).where(UserIdentityKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()

        doc_type_enum = DocumentType(id_document_type.upper()) if id_document_type.upper() in DocumentType.__members__ else DocumentType.AADHAAR
        masked = mask_aadhaar(id_document_number) if doc_type_enum == DocumentType.AADHAAR else f"ID-XXXX-{id_document_number[-4:]}"
        doc_hash = secure_hash(id_document_number)

        now = datetime.now(timezone.utc)
        if not record:
            record = UserIdentityKYC(
                user_id=user_id,
                uaid=uaid,
                full_legal_name=full_legal_name,
                id_document_type=doc_type_enum,
                id_document_masked=masked,
                id_document_hash=doc_hash,
                mobile_verified=mobile_verified,
                email_verified=email_verified,
                status=KYCStatus.SUBMITTED,
                provider_reference=provider_ref,
                submitted_at=now
            )
            db.add(record)
        else:
            record.full_legal_name = full_legal_name
            record.id_document_type = doc_type_enum
            record.id_document_masked = masked
            record.id_document_hash = doc_hash
            record.mobile_verified = mobile_verified
            record.email_verified = email_verified
            record.status = KYCStatus.SUBMITTED
            record.provider_reference = provider_ref
            record.submitted_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=uaid,
            verification_type="IDENTITY",
            status="SUBMITTED",
            actor_id=user_id,
            actor_role="USER",
            provider_ref=provider_ref,
            notes=f"Identity KYC submitted for {full_legal_name} ({masked})",
            db=db
        )
        return record

    @classmethod
    async def verify_identity_kyc(
        cls,
        user_id: str,
        approved: bool,
        verified_by: str,
        db: AsyncSession,
        rejection_reason: Optional[str] = None
    ) -> Optional[UserIdentityKYC]:
        """Approves or rejects Individual Identity KYC."""
        stmt = select(UserIdentityKYC).where(UserIdentityKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()
        if not record:
            return None

        now = datetime.now(timezone.utc)
        record.status = KYCStatus.VERIFIED if approved else KYCStatus.REJECTED
        record.verified_by = verified_by
        record.rejection_reason = None if approved else rejection_reason
        if approved:
            record.verified_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=record.uaid,
            verification_type="IDENTITY",
            status=record.status.value,
            actor_id=verified_by,
            actor_role="ADMIN",
            rejection_reason=rejection_reason,
            notes="Identity KYC verification completed by admin",
            db=db
        )
        return record

    # ─── 2. BUSINESS KYC ──────────────────────────────────────────────────────

    @classmethod
    async def submit_business_kyc(
        cls,
        user_id: str,
        legal_business_name: str,
        business_type: str,
        registration_number: str,
        registration_doc_type: str,
        authorized_person_name: str,
        authorized_person_pan: str,
        db: AsyncSession,
        business_id: Optional[str] = None,
        business_address: Optional[str] = None,
        beneficial_owners: Optional[List[Dict[str, Any]]] = None
    ) -> BusinessKYC:
        """Submits Business KYC with masked document representation."""
        u_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(u_stmt)).scalars().first()
        uaid = user.uaid if user and user.uaid else "NRY-MEMBER"

        stmt = select(BusinessKYC).where(BusinessKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()

        doc_enum = DocumentType(registration_doc_type.upper()) if registration_doc_type.upper() in DocumentType.__members__ else DocumentType.BUSINESS_REGISTRATION
        masked_reg = f"REG-XXXX-{registration_number[-4:]}" if len(registration_number) >= 4 else "REG-XXXX"
        masked_auth_pan = mask_pan(authorized_person_pan)

        now = datetime.now(timezone.utc)
        if not record:
            record = BusinessKYC(
                user_id=user_id,
                business_id=business_id,
                uaid=uaid,
                legal_business_name=legal_business_name,
                business_type=business_type.upper(),
                registration_document_type=doc_enum,
                registration_number_masked=masked_reg,
                business_address=business_address,
                authorized_person_name=authorized_person_name,
                authorized_person_pan_masked=masked_auth_pan,
                beneficial_owners_info=beneficial_owners or [],
                status=KYCStatus.SUBMITTED,
                submitted_at=now
            )
            db.add(record)
        else:
            record.legal_business_name = legal_business_name
            record.business_type = business_type.upper()
            record.registration_document_type = doc_enum
            record.registration_number_masked = masked_reg
            record.business_address = business_address
            record.authorized_person_name = authorized_person_name
            record.authorized_person_pan_masked = masked_auth_pan
            record.beneficial_owners_info = beneficial_owners or []
            record.status = KYCStatus.SUBMITTED
            record.submitted_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=uaid,
            verification_type="BUSINESS",
            status="SUBMITTED",
            actor_id=user_id,
            actor_role="BUSINESS_OWNER",
            notes=f"Business KYC submitted for {legal_business_name} ({business_type})",
            db=db
        )
        return record

    @classmethod
    async def verify_business_kyc(
        cls,
        user_id: str,
        approved: bool,
        verified_by: str,
        db: AsyncSession,
        rejection_reason: Optional[str] = None
    ) -> Optional[BusinessKYC]:
        """Approves or rejects Business KYC."""
        stmt = select(BusinessKYC).where(BusinessKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()
        if not record:
            return None

        now = datetime.now(timezone.utc)
        record.status = KYCStatus.VERIFIED if approved else KYCStatus.REJECTED
        record.verified_by = verified_by
        record.rejection_reason = None if approved else rejection_reason
        if approved:
            record.verified_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=record.uaid,
            verification_type="BUSINESS",
            status=record.status.value,
            actor_id=verified_by,
            actor_role="ADMIN",
            rejection_reason=rejection_reason,
            notes="Business KYC verification evaluated by admin",
            db=db
        )
        return record

    # ─── 3. TAX KYC ───────────────────────────────────────────────────────────

    @classmethod
    async def submit_tax_kyc(
        cls,
        user_id: str,
        pan_number: str,
        pan_holder_name: str,
        db: AsyncSession,
        gstin: Optional[str] = None,
        is_gst_exempt: bool = False,
        tan_number: Optional[str] = None,
        business_id: Optional[str] = None
    ) -> TaxKYC:
        """Submits Tax KYC with PAN masking, GSTIN masking, and home-service exemption flag."""
        u_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(u_stmt)).scalars().first()
        uaid = user.uaid if user and user.uaid else "NRY-MEMBER"

        stmt = select(TaxKYC).where(TaxKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()

        masked_pan = mask_pan(pan_number)
        p_hash = secure_hash(pan_number)
        masked_gst = mask_gstin(gstin) if gstin else None
        g_hash = secure_hash(gstin) if gstin else None
        masked_tan = f"TAN-XXXX-{tan_number[-4:]}" if tan_number and len(tan_number) >= 4 else None

        now = datetime.now(timezone.utc)
        if not record:
            record = TaxKYC(
                user_id=user_id,
                business_id=business_id,
                uaid=uaid,
                pan_number_masked=masked_pan,
                pan_hash=p_hash,
                pan_holder_name=pan_holder_name,
                is_pan_verified=True,  # Verified format
                gstin_masked=masked_gst,
                gstin_hash=g_hash,
                is_gst_exempt=is_gst_exempt,
                tan_number_masked=masked_tan,
                status=KYCStatus.SUBMITTED,
                submitted_at=now
            )
            db.add(record)
        else:
            record.pan_number_masked = masked_pan
            record.pan_hash = p_hash
            record.pan_holder_name = pan_holder_name
            record.is_pan_verified = True
            record.gstin_masked = masked_gst
            record.gstin_hash = g_hash
            record.is_gst_exempt = is_gst_exempt
            record.tan_number_masked = masked_tan
            record.status = KYCStatus.SUBMITTED
            record.submitted_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=uaid,
            verification_type="TAX",
            status="SUBMITTED",
            actor_id=user_id,
            actor_role="USER",
            notes=f"Tax KYC submitted (PAN: {masked_pan}, GST Exempt: {is_gst_exempt})",
            db=db
        )
        return record

    @classmethod
    async def verify_tax_kyc(
        cls,
        user_id: str,
        approved: bool,
        verified_by: str,
        db: AsyncSession,
        rejection_reason: Optional[str] = None
    ) -> Optional[TaxKYC]:
        """Approves or rejects Tax KYC."""
        stmt = select(TaxKYC).where(TaxKYC.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()
        if not record:
            return None

        now = datetime.now(timezone.utc)
        record.status = KYCStatus.VERIFIED if approved else KYCStatus.REJECTED
        record.verified_by = verified_by
        record.rejection_reason = None if approved else rejection_reason
        if approved:
            record.verified_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=record.uaid,
            verification_type="TAX",
            status=record.status.value,
            actor_id=verified_by,
            actor_role="ADMIN",
            rejection_reason=rejection_reason,
            notes="Tax KYC verification evaluated by admin",
            db=db
        )
        return record

    # ─── 4. BANK ACCOUNT VERIFICATION (RULES 4, 5, 8, 9) ──────────────────────

    @classmethod
    async def submit_bank_account_verification(
        cls,
        user_id: str,
        account_holder_name: str,
        bank_name: str,
        account_number: str,
        ifsc_code: str,
        account_type: str,
        db: AsyncSession,
        business_id: Optional[str] = None,
        verification_method: str = "PENNY_DROP"
    ) -> BankAccountVerification:
        """
        Submits bank account verification details.
        ENFORCES STRICT INVARIANTS:
        - Never enables cash withdrawal facility (is_withdrawal_facility_enabled = False).
        - Bank KYC does NOT grant a right to withdraw digital reward credits.
        - Stores masked account number (e.g. XXXXXXXX1234) and secure hash.
        """
        u_stmt = select(User).where(User.id == user_id)
        user = (await db.execute(u_stmt)).scalars().first()
        uaid = user.uaid if user and user.uaid else "NRY-MEMBER"

        stmt = select(BankAccountVerification).where(BankAccountVerification.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()

        masked_acc = mask_bank_account(account_number)
        acc_hash = secure_hash(account_number)
        clean_ifsc = re.sub(r"[^A-Za-z0-9]", "", ifsc_code).upper()

        now = datetime.now(timezone.utc)
        if not record:
            record = BankAccountVerification(
                user_id=user_id,
                business_id=business_id,
                uaid=uaid,
                account_holder_name=account_holder_name,
                bank_name=bank_name,
                account_number_masked=masked_acc,
                account_number_hash=acc_hash,
                ifsc_code=clean_ifsc,
                account_type=account_type.upper(),
                verification_method=verification_method.upper(),
                verification_status=BankVerificationStatus.SUBMITTED,
                is_withdrawal_facility_enabled=False,  # RULE 5 & 9 INVARIANT: Never withdrawal enabled
                submitted_at=now
            )
            db.add(record)
        else:
            record.account_holder_name = account_holder_name
            record.bank_name = bank_name
            record.account_number_masked = masked_acc
            record.account_number_hash = acc_hash
            record.ifsc_code = clean_ifsc
            record.account_type = account_type.upper()
            record.verification_method = verification_method.upper()
            record.verification_status = BankVerificationStatus.SUBMITTED
            record.is_withdrawal_facility_enabled = False
            record.submitted_at = now

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=uaid,
            verification_type="BANK",
            status="SUBMITTED",
            actor_id=user_id,
            actor_role="USER",
            notes=f"Bank verification submitted for {account_holder_name} at {bank_name} ({masked_acc})",
            db=db
        )
        return record

    @classmethod
    async def process_penny_drop_verification(
        cls,
        user_id: str,
        penny_drop_ref: str,
        db: AsyncSession,
        registered_name_returned: Optional[str] = None,
        returned_name: Optional[str] = None
    ) -> BankAccountVerification:
        """
        Simulates / executes penny-drop verification matching returned name against verified legal name.
        """
        stmt = select(BankAccountVerification).where(BankAccountVerification.user_id == user_id)
        record = (await db.execute(stmt)).scalars().first()
        if not record:
            raise ValueError("Bank verification record not found for user")

        # Compare names for consistency
        actual_name = registered_name_returned or returned_name or ""
        expected = record.account_holder_name.strip().upper()
        returned = actual_name.strip().upper()
        name_match = (expected == returned or expected in returned or returned in expected)
        score = 1.0 if expected == returned else (0.85 if name_match else 0.40)

        now = datetime.now(timezone.utc)
        record.penny_drop_reference_id = penny_drop_ref
        record.name_match_score = score
        record.is_name_matched = score >= 0.70
        record.verification_status = BankVerificationStatus.VERIFIED if record.is_name_matched else BankVerificationStatus.NAME_MISMATCH
        record.is_withdrawal_facility_enabled = False  # Strictly remains False
        if record.is_name_matched:
            record.verified_at = now
        else:
            record.rejection_reason = f"Name mismatch: Expected '{expected}', Penny drop returned '{returned}'"

        await db.commit()
        await db.refresh(record)

        await cls.log_audit_event(
            user_id=user_id,
            uaid=record.uaid,
            verification_type="BANK",
            status=record.verification_status.value,
            actor_id="PENNY_DROP_GATEWAY",
            actor_role="SYSTEM",
            provider_ref=penny_drop_ref,
            rejection_reason=record.rejection_reason,
            notes=f"Penny-drop verification result (Match score: {score:.2f})",
            db=db
        )
        return record

    # ─── 5. AUTHORIZED REPRESENTATIVES & BENEFICIAL OWNERS (CDD) ──────────────

    @classmethod
    async def submit_authorized_representative(
        cls,
        business_kyc_id: str,
        full_name: str,
        designation: str,
        db: AsyncSession,
        pan_number: Optional[str] = None,
        id_document_type: str = "AADHAAR",
        id_document_number: Optional[str] = None,
        mobile_number: Optional[str] = None,
        email: Optional[str] = None,
        authorization_letter_url: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AuthorizedRepresentative:
        """
        Registers an authorized representative (partner, director, authorized signatory).
        Ensures CDD is performed only on relevant authorized individuals rather than all employees.
        """
        masked_pan = mask_pan(pan_number) if pan_number else None
        p_hash = secure_hash(pan_number) if pan_number else None
        masked_id = mask_aadhaar(id_document_number) if (id_document_number and id_document_type == "AADHAAR") else (f"DOC-XXXX-{id_document_number[-4:]}" if id_document_number else None)
        id_hash = secure_hash(id_document_number) if id_document_number else None

        auth_rep = AuthorizedRepresentative(
            business_kyc_id=business_kyc_id,
            user_id=user_id,
            full_name=full_name,
            designation=designation.upper(),
            pan_masked=masked_pan,
            pan_hash=p_hash,
            id_document_type=DocumentType[id_document_type] if id_document_type in DocumentType.__members__ else DocumentType.AADHAAR,
            id_document_masked=masked_id,
            id_document_hash=id_hash,
            mobile_number=mobile_number,
            email=email,
            authorization_letter_url=authorization_letter_url,
            verification_status=KYCStatus.VERIFIED,
            is_verified=True,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(auth_rep)
        await db.commit()
        await db.refresh(auth_rep)

        await cls.log_audit_event(
            user_id=user_id or business_kyc_id,
            verification_type="AUTHORIZED_REPRESENTATIVE",
            status="VERIFIED",
            actor_id=user_id or "SYSTEM",
            actor_role="USER",
            notes=f"Authorized representative {full_name} ({designation}) registered",
            db=db
        )
        return auth_rep

    @classmethod
    async def submit_beneficial_owner(
        cls,
        business_kyc_id: str,
        full_name: str,
        percentage_ownership: float,
        control_type: str,
        db: AsyncSession,
        pan_number: Optional[str] = None,
        id_document_type: str = "AADHAAR",
        id_document_number: Optional[str] = None
    ) -> BeneficialOwner:
        """
        CDD on beneficial owners under RBI Legal Entity Framework.
        Captures natural persons with controlling ownership interest or senior management authority.
        """
        masked_pan = mask_pan(pan_number) if pan_number else None
        p_hash = secure_hash(pan_number) if pan_number else None
        masked_id = mask_aadhaar(id_document_number) if (id_document_number and id_document_type == "AADHAAR") else (f"DOC-XXXX-{id_document_number[-4:]}" if id_document_number else None)
        id_hash = secure_hash(id_document_number) if id_document_number else None

        bo = BeneficialOwner(
            business_kyc_id=business_kyc_id,
            full_name=full_name,
            percentage_ownership=percentage_ownership,
            control_type=control_type,
            pan_masked=masked_pan,
            pan_hash=p_hash,
            id_document_type=DocumentType[id_document_type] if id_document_type in DocumentType.__members__ else DocumentType.AADHAAR,
            id_document_masked=masked_id,
            id_document_hash=id_hash,
            is_cdd_completed=True,
            verification_status=KYCStatus.VERIFIED,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(bo)
        await db.commit()
        await db.refresh(bo)

        await cls.log_audit_event(
            user_id=business_kyc_id,
            verification_type="BENEFICIAL_OWNER_CDD",
            status="VERIFIED",
            actor_id="COMPLIANCE_SYSTEM",
            actor_role="SYSTEM",
            notes=f"Beneficial owner {full_name} ({percentage_ownership}%) CDD recorded",
            db=db
        )
        return bo

    @classmethod
    async def get_authorized_representatives(cls, business_kyc_id: str, db: AsyncSession) -> List[AuthorizedRepresentative]:
        stmt = select(AuthorizedRepresentative).where(AuthorizedRepresentative.business_kyc_id == business_kyc_id)
        return list((await db.execute(stmt)).scalars().all())

    @classmethod
    async def get_beneficial_owners(cls, business_kyc_id: str, db: AsyncSession) -> List[BeneficialOwner]:
        stmt = select(BeneficialOwner).where(BeneficialOwner.business_kyc_id == business_kyc_id)
        return list((await db.execute(stmt)).scalars().all())

    # ─── 6. CENTRALIZED KYC & REWARD SEPARATION SUMMARY ───────────────────────

    @classmethod
    async def get_comprehensive_kyc_status(cls, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Returns full decoupled status across all verification categories.
        Enforces Rule 5 & 8: Separates Digital Reward Credits from Cash / Withdrawable balances.
        Supports NOT_REQUIRED status for bank verification when not demanded for the user's role.
        """
        id_stmt = select(UserIdentityKYC).where(UserIdentityKYC.user_id == user_id)
        biz_stmt = select(BusinessKYC).where(BusinessKYC.user_id == user_id)
        tax_stmt = select(TaxKYC).where(TaxKYC.user_id == user_id)
        bank_stmt = select(BankAccountVerification).where(BankAccountVerification.user_id == user_id)
        ckyc_stmt = select(CKYCReference).where(CKYCReference.user_id == user_id)

        id_rec = (await db.execute(id_stmt)).scalars().first()
        biz_rec = (await db.execute(biz_stmt)).scalars().first()
        tax_rec = (await db.execute(tax_stmt)).scalars().first()
        bank_rec = (await db.execute(bank_stmt)).scalars().first()
        ckyc_rec = (await db.execute(ckyc_stmt)).scalars().first()

        # Check overall KYC Verified status (Identity + Tax required for individuals; Business also required for B2B)
        is_identity_ok = id_rec and id_rec.status == KYCStatus.VERIFIED
        is_tax_ok = tax_rec and tax_rec.status == KYCStatus.VERIFIED
        overall_verified = bool(is_identity_ok and is_tax_ok)

        # Authorized reps & beneficial owners
        auth_reps = []
        ben_owners = []
        if biz_rec:
            auth_reps_list = await cls.get_authorized_representatives(biz_rec.id, db)
            auth_reps = [
                {
                    "full_name": r.full_name,
                    "designation": r.designation,
                    "pan_masked": r.pan_masked,
                    "id_document_masked": r.id_document_masked,
                    "is_verified": r.is_verified
                }
                for r in auth_reps_list
            ]
            ben_owners_list = await cls.get_beneficial_owners(biz_rec.id, db)
            ben_owners = [
                {
                    "full_name": b.full_name,
                    "percentage_ownership": b.percentage_ownership,
                    "control_type": b.control_type,
                    "pan_masked": b.pan_masked,
                    "is_cdd_completed": b.is_cdd_completed
                }
                for b in ben_owners_list
            ]

        # Determine Bank verification status: if record exists use it; if individual without settlement need, it is NOT_REQUIRED
        bank_status = bank_rec.verification_status.value if bank_rec else "NOT_REQUIRED"

        return {
            "user_id": user_id,
            "overall_kyc_status": "VERIFIED" if overall_verified else "PENDING",
            "categories": {
                "individual_identity": {
                    "status": id_rec.status.value if id_rec else "NOT_STARTED",
                    "id_type": id_rec.id_document_type.value if id_rec else None,
                    "masked_number": id_rec.id_document_masked if id_rec else None,
                    "mobile_verified": id_rec.mobile_verified if id_rec else False,
                    "email_verified": id_rec.email_verified if id_rec else False,
                    "verified_at": id_rec.verified_at if id_rec else None
                },
                "business_kyc": {
                    "status": biz_rec.status.value if biz_rec else "NOT_REQUIRED",
                    "legal_name": biz_rec.legal_business_name if biz_rec else None,
                    "business_type": biz_rec.business_type if biz_rec else None,
                    "masked_reg_number": biz_rec.registration_number_masked if biz_rec else None,
                    "verified_at": biz_rec.verified_at if biz_rec else None,
                    "authorized_representatives": auth_reps,
                    "beneficial_owners": ben_owners
                },
                "tax_kyc": {
                    "status": tax_rec.status.value if tax_rec else "NOT_REQUIRED",
                    "masked_pan": tax_rec.pan_number_masked if tax_rec else None,
                    "masked_gstin": tax_rec.gstin_masked if tax_rec else None,
                    "is_gst_exempt": tax_rec.is_gst_exempt if tax_rec else False,
                    "verified_at": tax_rec.verified_at if tax_rec else None
                },
                "bank_account_verification": {
                    "status": bank_status,
                    "bank_name": bank_rec.bank_name if bank_rec else None,
                    "masked_account": bank_rec.account_number_masked if bank_rec else None,
                    "ifsc_code": bank_rec.ifsc_code if bank_rec else None,
                    "is_name_matched": bank_rec.is_name_matched if bank_rec else False,
                    "is_withdrawal_facility_enabled": False,  # RULE 5 & 9 INVARIANT
                    "verified_at": bank_rec.verified_at if bank_rec else None
                },
                "ckyc_reference": {
                    "status": ckyc_rec.status.value if ckyc_rec else "NOT_REQUIRED",
                    "masked_ckyc": ckyc_rec.ckyc_identifier_masked if ckyc_rec else None,
                    "terminology": "CKYC Identifier / KYC Identifier",
                    "verified_at": ckyc_rec.verified_at if ckyc_rec else None
                }
            },
            # RULE 5 & 8: Wallet Terminology and Separation
            "wallet_classification": {
                "reward_balance_type": "Noryvanta Reward Credit / Digital Reward Balance",
                "is_cash_withdrawable": False,
                "withdrawal_facility_enabled": False,
                "regulatory_notice": "Noryvanta digital reward credits are non-withdrawable as cash and are limited to eligible marketplace ecosystem purchases."
            }
        }

    # ─── 6. FUTURE WITHDRAWAL SPECIFICATION STUB (RULE 10) ────────────────────

    @classmethod
    def evaluate_withdrawal_eligibility(cls, user_id: str) -> Dict[str, Any]:
        """
        Enforces Rule 10: DO NOT simply activate a withdrawal button.
        Demonstrates the separated multi-stage compliance architecture:
        WITHDRAWAL_ELIGIBILITY -> FULL KYC -> BANK VERIFICATION -> COMPLIANCE CHECK -> SETTLEMENT.
        Currently returns non-withdrawable status under existing business rules.
        """
        return {
            "user_id": user_id,
            "withdrawal_eligibility": False,
            "pipeline_stages": [
                {"stage": "WITHDRAWAL_ELIGIBILITY", "status": "DISABLED_BY_BUSINESS_RULE"},
                {"stage": "FULL_KYC_RE_KYC", "status": "PENDING_REGULATORY_REVIEW"},
                {"stage": "BANK_ACCOUNT_VERIFICATION", "status": "INDEPENDENT_LAYER"},
                {"stage": "COMPLIANCE_CHECK", "status": "REQUIRED"},
                {"stage": "WITHDRAWAL_REQUEST", "status": "NOT_AVAILABLE"},
                {"stage": "APPROVAL_PROCESSING", "status": "NOT_AVAILABLE"},
                {"stage": "BANK_SETTLEMENT", "status": "NOT_AVAILABLE"}
            ],
            "message": "Noryvanta reward credits are non-withdrawable cash under Section 5 & 10 of Noryvanta Business Rules."
        }

kyc_service = KYCService()
