import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User, RoleEnum
from app.models.kyc import (
    UserIdentityKYC,
    BusinessKYC,
    TaxKYC,
    CKYCReference,
    BankAccountVerification,
    KYCAuditTrail,
    KYCStatus,
    BankVerificationStatus,
    DocumentType
)
from app.models.network import RewardLedger
from app.services.kyc_service import (
    kyc_service,
    mask_pan,
    mask_aadhaar,
    mask_bank_account,
    mask_gstin,
    secure_hash
)

@pytest.mark.asyncio
async def test_separate_kyc_categories_entity_isolation():
    """
    Test 1 & 11:
    - Separate database entities for Identity, Business, Tax, Bank, CKYC.
    - Bank verification status is never stored inside RewardLedger.
    - Reward balances are never stored in KYC tables.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"kyc-user-iso-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9181{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=f"NRY-HS-ISO-{uuid.uuid4().hex[:4].upper()}")
        db.add(user)
        await db.commit()

        # 1. Identity KYC
        id_rec = await kyc_service.submit_identity_kyc(
            user_id=user_id,
            full_legal_name="Mahesh Kumar",
            id_document_type="AADHAAR",
            id_document_number="987654321234",
            mobile_verified=True,
            email_verified=True,
            db=db
        )
        assert isinstance(id_rec, UserIdentityKYC)
        assert id_rec.id_document_masked == "XXXX XXXX 1234"

        # 2. Tax KYC
        tax_rec = await kyc_service.submit_tax_kyc(
            user_id=user_id,
            pan_number="ABCDE1234F",
            pan_holder_name="Mahesh Kumar",
            gstin="27ABCDE1234F1ZX",
            db=db
        )
        assert isinstance(tax_rec, TaxKYC)
        assert tax_rec.pan_number_masked == "XXXXX1234X"
        assert tax_rec.gstin_masked == "27XXXXX1234X1ZX"

        # 3. Bank Account Verification
        bank_rec = await kyc_service.submit_bank_account_verification(
            user_id=user_id,
            account_holder_name="Mahesh Kumar",
            bank_name="HDFC Bank",
            account_number="50100234567812",
            ifsc_code="HDFC0001234",
            account_type="SAVINGS",
            db=db
        )
        assert isinstance(bank_rec, BankAccountVerification)
        assert bank_rec.account_number_masked == "XXXXXXXX7812"
        # STRICT RULE: Bank KYC is NOT a cash withdrawal facility
        assert bank_rec.is_withdrawal_facility_enabled is False

        # Invariant: RewardLedger has no bank verification status column
        assert not hasattr(RewardLedger, "bank_verification_status")
        # Invariant: UserIdentityKYC has no reward balance column
        assert not hasattr(UserIdentityKYC, "reward_balance")
        assert not hasattr(BankAccountVerification, "reward_balance")

@pytest.mark.asyncio
async def test_sensitive_data_masking_representations():
    """
    Test 7:
    - Never expose raw sensitive numbers in display/API representations.
    - PAN: XXXXX1234X
    - Aadhaar: XXXX XXXX 1234
    - Bank Account: XXXXXXXX1234
    - GSTIN: 27XXXXX1234X1ZX
    """
    assert mask_pan("ABCDE1234F") == "XXXXX1234X"
    assert mask_aadhaar("998877661234") == "XXXX XXXX 1234"
    assert mask_bank_account("123456789012") == "XXXXXXXX9012"
    assert mask_gstin("27ABCDE1234F1ZX") == "27XXXXX1234X1ZX"

    # Verify SHA-256 secure hash prevents plain storage while supporting deduplication
    h1 = secure_hash("ABCDE1234F")
    h2 = secure_hash("abcde1234f")
    assert h1 == h2
    assert len(h1) == 64

@pytest.mark.asyncio
async def test_account_type_configurable_requirements():
    """
    Test 2 & 3:
    - Individual Customer does NOT demand GST.
    - Wholesaler demands Business PAN + GSTIN + Registration docs.
    - Skilled small-scale home service provider does NOT demand GST (exempt).
    """
    # Individual customer
    indiv_spec = kyc_service.get_kyc_requirements(account_type="CUSTOMER")
    assert indiv_spec["demands_gst"] is False
    assert indiv_spec["demands_business_registration"] is False

    # Wholesaler
    ws_spec = kyc_service.get_kyc_requirements(account_type="BUSINESS_OWNER", business_type="WHOLESALER")
    assert ws_spec["demands_gst"] is True
    assert ws_spec["demands_business_registration"] is True

    # Skilled small-scale home service provider
    home_service_spec = kyc_service.get_kyc_requirements(account_type="BUSINESS_OWNER", business_type="SKILLED_SERVICE_PROVIDER")
    assert home_service_spec["demands_gst"] is False

@pytest.mark.asyncio
async def test_bank_account_verification_non_withdrawal_rule():
    """
    Test 4, 5, 8, 9:
    - Bank account verification is an identity/ownership matching layer.
    - Completion of bank KYC must NOT create a right to withdraw digital reward credits.
    - Penny drop verification matches name consistency without granting withdrawal rights.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"kyc-user-bank-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9180{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER)
        db.add(user)
        await db.commit()

        # Submit bank verification
        bank_rec = await kyc_service.submit_bank_account_verification(
            user_id=user_id,
            account_holder_name="Anita Sharma",
            bank_name="ICICI Bank",
            account_number="001105009876",
            ifsc_code="ICIC0000011",
            account_type="CURRENT",
            db=db
        )
        assert bank_rec.verification_status == BankVerificationStatus.SUBMITTED
        assert bank_rec.is_withdrawal_facility_enabled is False

        # Process penny-drop simulation
        verified_bank = await kyc_service.process_penny_drop_verification(
            user_id=user_id,
            penny_drop_ref="PDR-123456",
            returned_name="ANITA SHARMA",
            db=db
        )
        assert verified_bank.verification_status == BankVerificationStatus.VERIFIED
        assert verified_bank.is_name_matched is True
        # CRITICAL INVARIANT: Bank verification is verified, but withdrawal remains DISABLED
        assert verified_bank.is_withdrawal_facility_enabled is False

@pytest.mark.asyncio
async def test_wallet_terminology_and_non_withdrawable_credit_classification():
    """
    Test 5:
    - Defines reward wallet as 'Noryvanta Reward Credit / Digital Reward Balance'.
    - Confirms reward credits are non-withdrawable as cash.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"kyc-user-wallet-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9179{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER)
        db.add(user)
        await db.commit()

        status_out = await kyc_service.get_comprehensive_kyc_status(user_id=user_id, db=db)
        classification = status_out["wallet_classification"]
        assert classification["reward_balance_type"] == "Noryvanta Reward Credit / Digital Reward Balance"
        assert classification["is_cash_withdrawable"] is False
        assert classification["withdrawal_facility_enabled"] is False

@pytest.mark.asyncio
async def test_future_withdrawal_feature_staged_compliance_pipeline():
    """
    Test 10:
    - Future withdrawal feature requires multi-stage compliance pipeline:
      WITHDRAWAL_ELIGIBILITY -> FULL KYC -> BANK VERIFICATION -> COMPLIANCE CHECK -> WITHDRAWAL REQUEST -> SETTLEMENT.
    - Demonstrates that a simple 'withdrawal button' is strictly rejected.
    """
    pipeline = kyc_service.evaluate_withdrawal_eligibility(user_id="test-user")
    assert pipeline["withdrawal_eligibility"] is False
    stage_names = [s["stage"] for s in pipeline["pipeline_stages"]]
    assert "WITHDRAWAL_ELIGIBILITY" in stage_names
    assert "FULL_KYC_RE_KYC" in stage_names
    assert "BANK_ACCOUNT_VERIFICATION" in stage_names
    assert "COMPLIANCE_CHECK" in stage_names
    assert "BANK_SETTLEMENT" in stage_names

@pytest.mark.asyncio
async def test_kyc_immutable_audit_trail():
    """
    Test 12:
    - Every KYC event (Identity, Business, Tax, Bank) logs an immutable record in kyc_audit_trails.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"kyc-user-audit-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9178{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=f"NRY-HS-AUD-{uuid.uuid4().hex[:4].upper()}")
        db.add(user)
        await db.commit()

        # Submit Identity KYC
        await kyc_service.submit_identity_kyc(
            user_id=user_id,
            full_legal_name="Ravi Verma",
            id_document_type="PASSPORT",
            id_document_number="Z1234567",
            mobile_verified=True,
            email_verified=True,
            db=db
        )

        # Admin approves Identity KYC
        await kyc_service.verify_identity_kyc(
            user_id=user_id,
            approved=True,
            verified_by="admin-user-01",
            db=db
        )

        # Verify audit trails
        stmt = select(KYCAuditTrail).where(KYCAuditTrail.user_id == user_id).order_by(KYCAuditTrail.created_at)
        audits = (await db.execute(stmt)).scalars().all()
        assert len(audits) >= 2
        assert audits[0].verification_type == "IDENTITY"
        assert audits[0].status == "SUBMITTED"
        assert audits[1].verification_type == "IDENTITY"
        assert audits[1].status == "VERIFIED"
        assert audits[1].actor_role == "ADMIN"


@pytest.mark.asyncio
async def test_tiered_account_type_matrix_and_legal_structure_resolution():
    """
    Test Tiered KYC Architecture Matrix:
    - Verifies distinct requirements across Individual, Sole Proprietor, Partnership, LLP/Company, Service Provider, and Skilled Home Provider.
    - Demonstrates dynamic resolution based on legal structure rather than universal bloated forms.
    """
    # 1. Individual Customer: light initial onboarding, no GST/TAN/business/bank demand
    indiv_spec = kyc_service.get_kyc_requirements(account_type="INDIVIDUAL_CUSTOMER")
    assert indiv_spec["demands_gst"] is False
    assert indiv_spec["demands_tan"] is False
    assert indiv_spec["demands_business_registration"] is False
    assert indiv_spec["bank_verification_status"] == "NOT_REQUIRED"

    # 2. Sole Proprietor: Proprietor CDD + business/activity proof, no forced GST
    prop_spec = kyc_service.get_kyc_requirements(account_type="SOLE_PROPRIETOR")
    assert prop_spec["demands_business_registration"] is True
    assert prop_spec["demands_gst"] is False
    assert "SHOP_ESTABLISHMENT" in prop_spec["business_activity_docs"]

    # 3. Partnership Firm: Firm deed + authorized partner & beneficial owner CDD
    part_spec = kyc_service.get_kyc_requirements(account_type="PARTNERSHIP")
    assert part_spec["business_kyc_required"] is True
    assert "PARTNERSHIP_DEED" in part_spec["firm_docs"]
    assert "AUTHORIZED_REPRESENTATIVE" in part_spec["required_categories"]
    assert "BENEFICIAL_OWNER" in part_spec["required_categories"]

    # 4. Company / LLP: CIN/LLPIN + Entity PAN + Authorized representative & Beneficial owner CDD
    comp_spec = kyc_service.get_kyc_requirements(account_type="COMPANY_LLP")
    assert "INCORPORATION_CERTIFICATE" in comp_spec["entity_docs"]
    assert comp_spec["demands_bank"] is True
    assert comp_spec["bank_verification_status"] == "Business bank account verification for settlement"

    # 5. Registered Service Provider: determines legal structure dynamically
    serv_prop_spec = kyc_service.get_kyc_requirements(
        account_type="REGISTERED_SERVICE_PROVIDER",
        legal_structure="SOLE_PROPRIETOR"
    )
    assert serv_prop_spec["parent_account_type"] == "REGISTERED_SERVICE_PROVIDER"
    assert serv_prop_spec["resolved_legal_structure"] == "SOLE_PROPRIETOR"

    # 6. Skilled Small-Scale Home Service Provider: Zero GST demand
    home_spec = kyc_service.get_kyc_requirements(account_type="SKILLED_HOME_SERVICE_PROVIDER")
    assert home_spec["demands_gst"] is False
    assert home_spec["demands_tan"] is False
    assert home_spec["demands_business_registration"] is False
    assert "NOT_REQUIRED" in home_spec["bank_verification_status"]


@pytest.mark.asyncio
async def test_authorized_representative_and_beneficial_owner_cdd():
    """
    Test CDD under RBI Legal Entity Framework:
    - Collects CDD only from authorized representatives and beneficial owners (>10%/15% control).
    - Avoids mass document collection from unrelated employees.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"cdd-user-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9177{uuid.uuid4().hex[:8]}", role=RoleEnum.VENDOR, uaid=f"NRY-CDD-{uuid.uuid4().hex[:4].upper()}")
        db.add(user)
        await db.commit()

        # Submit Business KYC (Partnership Firm)
        biz_kyc = await kyc_service.submit_business_kyc(
            user_id=user_id,
            legal_business_name="Green Horizon Exports LLP",
            business_type="LLP",
            registration_number="AAB-1234",
            registration_doc_type="INCORPORATION_CERTIFICATE",
            authorized_person_name="Vikram Mehta",
            authorized_person_pan="ABCDE5566G",
            db=db
        )

        # 1. Register Authorized Representative
        auth_rep = await kyc_service.submit_authorized_representative(
            business_kyc_id=biz_kyc.id,
            full_name="Vikram Mehta",
            designation="DESIGNATED_PARTNER",
            pan_number="ABCDE5566G",
            id_document_type="AADHAAR",
            id_document_number="887766551234",
            user_id=user_id,
            db=db
        )
        assert auth_rep.full_name == "Vikram Mehta"
        assert auth_rep.pan_masked == "XXXXX5566X"
        assert auth_rep.id_document_masked == "XXXX XXXX 1234"
        assert auth_rep.is_verified is True

        # 2. Register Beneficial Owner CDD (25% Controlling Interest)
        ben_owner = await kyc_service.submit_beneficial_owner(
            business_kyc_id=biz_kyc.id,
            full_name="Sanjay Singhania",
            percentage_ownership=25.0,
            control_type="CONTROLLING_OWNERSHIP_INTEREST",
            pan_number="XYZAB9988C",
            db=db
        )
        assert ben_owner.percentage_ownership == 25.0
        assert ben_owner.is_cdd_completed is True
        assert ben_owner.pan_masked == "XXXXX9988X"

        # 3. Retrieve comprehensive status
        comp = await kyc_service.get_comprehensive_kyc_status(user_id=user_id, db=db)
        biz_info = comp["categories"]["business_kyc"]
        assert len(biz_info["authorized_representatives"]) >= 1
        assert len(biz_info["beneficial_owners"]) >= 1
        assert biz_info["authorized_representatives"][0]["full_name"] == "Vikram Mehta"
        assert biz_info["beneficial_owners"][0]["percentage_ownership"] == 25.0


@pytest.mark.asyncio
async def test_bank_verification_purpose_driven_not_required_by_default():
    """
    Test Purpose-Driven Bank Verification:
    - For individual customer, bank verification is NOT_REQUIRED by default.
    - Demanding bank verification occurs only when merchant settlements/refunds require it.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"bank-purp-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9176{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER)
        db.add(user)
        await db.commit()

        # Submit individual identity KYC only
        await kyc_service.submit_identity_kyc(
            user_id=user_id,
            full_legal_name="Pooja Patel",
            id_document_type="PASSPORT",
            id_document_number="P9876543",
            db=db
        )

        status_out = await kyc_service.get_comprehensive_kyc_status(user_id=user_id, db=db)
        # Bank Verification status must be NOT_REQUIRED
        assert status_out["categories"]["bank_account_verification"]["status"] == "NOT_REQUIRED"
        # Business KYC status must be NOT_REQUIRED for buyer
        assert status_out["categories"]["business_kyc"]["status"] == "NOT_REQUIRED"

        # If merchant enables settlement, dynamic requirements demand bank verification
        req_settlement = kyc_service.get_kyc_requirements(
            account_type="SOLE_PROPRIETOR",
            payment_needs_settlement=True
        )
        assert req_settlement["demands_bank"] is True
        assert req_settlement["bank_verification_status"] == "REQUIRED_FOR_SETTLEMENT"


@pytest.mark.asyncio
async def test_ckyc_identifier_terminology_and_data_minimization():
    """
    Test CKYC Identifier Terminology:
    - Uses 'CKYC Identifier / KYC Identifier' terminology.
    - Demonstrates data minimization: avoids asking user to upload duplicate raw identity documents when CKYC is present.
    """
    async with AsyncSessionLocal() as db:
        user_id = f"ckyc-user-{uuid.uuid4().hex[:6]}"
        user = User(id=user_id, phone=f"+9175{uuid.uuid4().hex[:8]}", role=RoleEnum.BUYER, uaid=f"NRY-CKYC-{uuid.uuid4().hex[:4].upper()}")
        db.add(user)
        await db.commit()

        # Create CKYC reference
        ckyc_ref = CKYCReference(
            user_id=user_id,
            uaid=user.uaid,
            ckyc_identifier_masked="CKYC-XXXX-9901",
            ckyc_identifier_hash=secure_hash("CKYC123456789901"),
            provider="CERSAI_CKYC",
            status=KYCStatus.VERIFIED
        )
        db.add(ckyc_ref)
        await db.commit()

        status_out = await kyc_service.get_comprehensive_kyc_status(user_id=user_id, db=db)
        ckyc_cat = status_out["categories"]["ckyc_reference"]
        assert ckyc_cat["status"] == "VERIFIED"
        assert ckyc_cat["terminology"] == "CKYC Identifier / KYC Identifier"
        assert ckyc_cat["masked_ckyc"] == "CKYC-XXXX-9901"

