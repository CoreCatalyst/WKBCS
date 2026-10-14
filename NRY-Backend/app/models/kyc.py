import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class KYCStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    PENDING_VERIFICATION = "UNDER_REVIEW"  # Backward compatibility alias
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    SUSPENDED = "SUSPENDED"
    REVERIFICATION_REQUIRED = "REVERIFICATION_REQUIRED"

class BankVerificationStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    NOT_REQUIRED = "NOT_REQUIRED"  # For individuals/small providers where bank verification is not currently needed
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    PENDING_PENNY_DROP = "PENDING_PENNY_DROP"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    NAME_MISMATCH = "NAME_MISMATCH"
    REVERIFICATION_REQUIRED = "REVERIFICATION_REQUIRED"

class DocumentType(str, Enum):
    PAN = "PAN"
    GST_CERTIFICATE = "GST_CERTIFICATE"
    AADHAAR = "AADHAAR"
    PASSPORT = "PASSPORT"
    VOTER_ID = "VOTER_ID"
    DRIVING_LICENSE = "DRIVING_LICENSE"
    OVD = "OVD"
    BANK_PROOF = "BANK_PROOF"
    BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION"
    INCORPORATION_CERTIFICATE = "INCORPORATION_CERTIFICATE"
    UDYAM_MSME = "UDYAM_MSME"
    PARTNERSHIP_DEED = "PARTNERSHIP_DEED"
    SHOP_ESTABLISHMENT = "SHOP_ESTABLISHMENT"
    TRADE_LICENSE = "TRADE_LICENSE"
    OTHER = "OTHER"

# ─── SEPARATE KYC CATEGORIES (SECTION 1 & 11) ─────────────────────────────────

class UserIdentityKYC(Base):
    """
    1. Individual Identity KYC:
    Aadhaar / permitted OVD verification, mobile and email verification, identity proof.
    Strictly separate from business and tax KYC. Never stores reward balances.
    """
    __tablename__ = "user_identity_kyc"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    full_legal_name = Column(String(255), nullable=True)
    id_document_type = Column(SQLEnum(DocumentType), default=DocumentType.AADHAAR, nullable=False)
    id_document_masked = Column(String(50), nullable=True)  # e.g. XXXX XXXX 1234
    id_document_hash = Column(String(64), nullable=True, index=True)  # SHA-256 for duplicate checks
    mobile_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.NOT_STARTED, nullable=False)
    rejection_reason = Column(String(500), nullable=True)
    provider_reference = Column(String(100), nullable=True)
    verified_by = Column(String(36), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class BusinessKYC(Base):
    """
    2. Business KYC:
    Entity registration/incorporation, authorized person's KYC, beneficial ownership.
    Configurable by registered business type (Wholesaler, Distributor, Retailer, Service Provider).
    """
    __tablename__ = "business_kyc"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    legal_business_name = Column(String(255), nullable=False)
    business_type = Column(String(50), nullable=False)  # WHOLESALER, DISTRIBUTOR, RETAILER, SERVICE_PROVIDER
    registration_document_type = Column(SQLEnum(DocumentType), default=DocumentType.BUSINESS_REGISTRATION, nullable=False)
    registration_number_masked = Column(String(50), nullable=True)  # Masked registration string
    registration_document_url = Column(String(500), nullable=True)
    business_address = Column(String(500), nullable=True)
    authorized_person_name = Column(String(255), nullable=True)
    authorized_person_pan_masked = Column(String(20), nullable=True)
    beneficial_owners_info = Column(JSON, default=list)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.NOT_STARTED, nullable=False)
    rejection_reason = Column(String(500), nullable=True)
    verified_by = Column(String(36), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class TaxKYC(Base):
    """
    3. Tax KYC:
    Business PAN, GSTIN, TAN.
    Small-scale home service providers can be flagged as GST exempt.
    """
    __tablename__ = "tax_kyc"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    pan_number_masked = Column(String(20), nullable=True)  # e.g. XXXXX1234X
    pan_hash = Column(String(64), nullable=True, index=True)
    pan_holder_name = Column(String(255), nullable=True)
    is_pan_verified = Column(Boolean, default=False, nullable=False)
    gstin_masked = Column(String(25), nullable=True)  # e.g. 27XXXXX1234X1ZX
    gstin_hash = Column(String(64), nullable=True, index=True)
    is_gst_exempt = Column(Boolean, default=False, nullable=False)  # For skilled home service providers
    tan_number_masked = Column(String(20), nullable=True)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.NOT_STARTED, nullable=False)
    rejection_reason = Column(String(500), nullable=True)
    verified_by = Column(String(36), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class CKYCReference(Base):
    """
    4. CKYC / KYC Identifier:
    Stores central KYC identifier and verification reference where applicable.
    """
    __tablename__ = "ckyc_references"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    ckyc_identifier_masked = Column(String(50), nullable=False)  # Masked CKYC ID
    ckyc_identifier_hash = Column(String(64), nullable=False, index=True)
    provider = Column(String(100), default="CERSAI_CKYC", nullable=False)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.VERIFIED, nullable=False)
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class BankAccountVerification(Base):
    """
    5. Bank Account Verification:
    Separate verification layer establishing account ownership consistency.
    Rule 5 & 9: Bank verification is NOT a cash withdrawal facility and does NOT grant reward cashout rights!
    """
    __tablename__ = "bank_account_verifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    account_holder_name = Column(String(255), nullable=False)
    bank_name = Column(String(100), nullable=False)
    account_number_masked = Column(String(50), nullable=False)  # e.g. XXXXXXXX1234
    account_number_hash = Column(String(64), nullable=False, index=True)
    ifsc_code = Column(String(20), nullable=False)
    account_type = Column(String(30), default="CURRENT", nullable=False)  # SAVINGS, CURRENT, CC_OD
    verification_method = Column(String(50), default="PENNY_DROP", nullable=False)  # PENNY_DROP, NET_BANKING, STATEMENT
    verification_status = Column(SQLEnum(BankVerificationStatus), default=BankVerificationStatus.NOT_STARTED, nullable=False)
    penny_drop_reference_id = Column(String(100), nullable=True)
    name_match_score = Column(Float, default=1.0, nullable=False)  # 0.0 to 1.0
    is_name_matched = Column(Boolean, default=True, nullable=False)
    is_withdrawal_facility_enabled = Column(Boolean, default=False, nullable=False)  # STRICT INVARIANT: Always False for reward credits!
    rejection_reason = Column(String(500), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class AuthorizedRepresentative(Base):
    """
    Authorized Representative / Signatory KYC:
    Used for Partnerships, LLPs, Companies, and Registered Service Providers.
    Ensures CDD is performed only on relevant authorized individuals, avoiding mass document collection from unrelated employees.
    """
    __tablename__ = "authorized_representatives"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_kyc_id = Column(String(36), ForeignKey("business_kyc.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    full_name = Column(String(255), nullable=False)
    designation = Column(String(100), nullable=False)  # PARTNER, DIRECTOR, AUTHORIZED_SIGNATORY, PROPRIETOR
    pan_masked = Column(String(20), nullable=True)
    pan_hash = Column(String(64), nullable=True, index=True)
    id_document_type = Column(SQLEnum(DocumentType), default=DocumentType.AADHAAR, nullable=False)
    id_document_masked = Column(String(50), nullable=True)
    id_document_hash = Column(String(64), nullable=True, index=True)
    mobile_number = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    authorization_letter_url = Column(String(500), nullable=True)
    verification_status = Column(SQLEnum(KYCStatus), default=KYCStatus.SUBMITTED, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class BeneficialOwner(Base):
    """
    Beneficial Owner (CDD under RBI Legal Entity Framework):
    Identifies natural persons holding controlling ownership interest (>10% company, >15% partnership)
    or senior managing officials.
    """
    __tablename__ = "beneficial_owners"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_kyc_id = Column(String(36), ForeignKey("business_kyc.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    percentage_ownership = Column(Float, default=0.0, nullable=False)
    control_type = Column(String(100), default="CONTROLLING_OWNERSHIP_INTEREST", nullable=False)
    pan_masked = Column(String(20), nullable=True)
    pan_hash = Column(String(64), nullable=True, index=True)
    id_document_type = Column(SQLEnum(DocumentType), default=DocumentType.AADHAAR, nullable=False)
    id_document_masked = Column(String(50), nullable=True)
    id_document_hash = Column(String(64), nullable=True, index=True)
    is_cdd_completed = Column(Boolean, default=False, nullable=False)
    verification_status = Column(SQLEnum(KYCStatus), default=KYCStatus.SUBMITTED, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class KYCAuditTrail(Base):
    """
    Comprehensive Audit Trail for KYC and Bank-Verification Events (Section 12 & KYCVerificationEvent).
    Immutable logging of all submissions, approvals, rejections, and reverifications.
    """
    __tablename__ = "kyc_audit_trails"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    uaid = Column(String(50), nullable=True, index=True)
    verification_type = Column(String(50), nullable=False)  # IDENTITY, BUSINESS, TAX, BANK, CKYC, CDD
    provider_reference_id = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)
    rejection_reason = Column(String(500), nullable=True)
    actor_id = Column(String(36), nullable=False)
    actor_role = Column(String(50), default="SYSTEM", nullable=False)
    notes = Column(String(500), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


# Alias for explicit KYCVerificationEvent model name as specified in rules
KYCVerificationEvent = KYCAuditTrail


# ─── LEGACY COMPATIBILITY MODELS ──────────────────────────────────────────────

class KYCRecord(Base):
    __tablename__ = "kyc_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.NOT_STARTED, nullable=False)
    pan_number = Column(String(10), nullable=True)
    aadhaar_last4 = Column(String(4), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    verified_by = Column(String(36), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    documents = relationship("KYCDocument", back_populates="kyc_record", cascade="all, delete-orphan")


class KYCDocument(Base):
    __tablename__ = "kyc_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kyc_record_id = Column(String(36), ForeignKey("kyc_records.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    storage_key = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    kyc_record = relationship("KYCRecord", back_populates="documents")
