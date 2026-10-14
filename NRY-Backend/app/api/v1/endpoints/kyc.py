from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.kyc import KYCRecord, KYCDocument, KYCStatus, DocumentType
from app.schemas.kyc import KYCRecordOut, KYCSubmitRequest

router = APIRouter()

@router.get("/status", response_model=KYCRecordOut, summary="Get Current User/Business KYC Status")
async def get_kyc_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(KYCRecord).where(KYCRecord.user_id == current_user.id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record:
        # Default empty record
        return KYCRecordOut(
            id="not-created",
            user_id=current_user.id,
            status="NOT_STARTED",
            documents=[]
        )
    return record

@router.post("/submit", response_model=KYCRecordOut, summary="Submit KYC Identity Documents for Verification")
async def submit_kyc(
    payload: KYCSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch user's business profile if exists
    biz_stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    biz_res = await db.execute(biz_stmt)
    biz = biz_res.scalars().first()

    stmt = select(KYCRecord).where(KYCRecord.user_id == current_user.id)
    res = await db.execute(stmt)
    record = res.scalars().first()

    if not record:
        record = KYCRecord(
            user_id=current_user.id,
            business_id=biz.id if biz else None,
            status=KYCStatus.SUBMITTED,
            pan_number=payload.pan_number,
            aadhaar_last4=payload.aadhaar_last4,
            submitted_at=datetime.now(timezone.utc)
        )
        db.add(record)
    else:
        record.status = KYCStatus.SUBMITTED
        record.pan_number = payload.pan_number
        record.aadhaar_last4 = payload.aadhaar_last4
        record.submitted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(record)
    return record

@router.get("/documents/{doc_id}/signed-url", summary="Generate Secure Presigned URL for Private KYC Document")
async def get_document_signed_url(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ensures private KYC documents cannot be publicly accessed.
    Only authorized document owners or platform administrators can generate temporary access URLs.
    """
    stmt = select(KYCDocument).where(KYCDocument.id == doc_id)
    res = await db.execute(stmt)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Check permission
    kyc_stmt = select(KYCRecord).where(KYCRecord.id == doc.kyc_record_id)
    kres = await db.execute(kyc_stmt)
    kyc_rec = kres.scalars().first()

    if not kyc_rec or (kyc_rec.user_id != current_user.id and current_user.role != "ADMIN"):
        raise HTTPException(status_code=403, detail="Forbidden from viewing private identity documents.")

    # Return presigned mock or S3 URL
    return {
        "document_id": doc.id,
        "expires_in_seconds": 900,
        "signed_url": f"https://storage.noryvanta.in/secure/kyc/{doc.storage_key}?signature=mock_presigned_exp_900s"
    }

# ─── SEPARATED MODULAR KYC CATEGORIES (RULES 1 - 11) ──────────────────────────

@router.get("/matrix", summary="Get Full Tiered KYC Architecture Matrix (RBI & Risk-Based)")
async def get_kyc_matrix():
    from app.services.kyc_service import ACCOUNT_KYC_SPECIFICATION
    return {
        "title": "Noryvanta Tiered Risk-Based KYC Matrix",
        "principle": "Data minimization, purpose-driven collection, no universal bloated forms",
        "matrix": ACCOUNT_KYC_SPECIFICATION
    }

@router.get("/requirements", summary="Get Configurable KYC Document Requirements by Account/Business Type")
async def get_kyc_requirements(
    account_type: str = "INDIVIDUAL_CUSTOMER",
    business_type: str = None,
    legal_structure: str = None,
    payment_needs_settlement: bool = False
):
    from app.services.kyc_service import kyc_service
    return kyc_service.get_kyc_requirements(
        account_type=account_type,
        business_type=business_type,
        legal_structure=legal_structure,
        payment_needs_settlement=payment_needs_settlement
    )

@router.get("/comprehensive", summary="Get Full Decoupled KYC Status with Sensitive Masking & Wallet Notice")
async def get_comprehensive_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.get_comprehensive_kyc_status(user_id=current_user.id, db=db)

@router.post("/identity/submit", summary="Submit Individual Identity KYC (Aadhaar/OVD)")
async def submit_identity_kyc(
    full_legal_name: str,
    id_document_type: str = "AADHAAR",
    id_document_number: str = "999988881234",
    mobile_verified: bool = True,
    email_verified: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.submit_identity_kyc(
        user_id=current_user.id,
        full_legal_name=full_legal_name,
        id_document_type=id_document_type,
        id_document_number=id_document_number,
        mobile_verified=mobile_verified,
        email_verified=email_verified,
        db=db
    )

@router.post("/business/submit", summary="Submit Business KYC (Entity Docs & Authorized Person)")
async def submit_business_kyc(
    legal_business_name: str,
    business_type: str = "WHOLESALER",
    registration_number: str = "U12345MH2025PTC123456",
    registration_doc_type: str = "INCORPORATION_CERTIFICATE",
    authorized_person_name: str = "Authorized Representative",
    authorized_person_pan: str = "ABCDE1234F",
    business_address: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.submit_business_kyc(
        user_id=current_user.id,
        legal_business_name=legal_business_name,
        business_type=business_type,
        registration_number=registration_number,
        registration_doc_type=registration_doc_type,
        authorized_person_name=authorized_person_name,
        authorized_person_pan=authorized_person_pan,
        business_address=business_address,
        db=db
    )

@router.post("/tax/submit", summary="Submit Tax KYC (PAN, GSTIN with Small-Scale Exemption)")
async def submit_tax_kyc(
    pan_number: str,
    pan_holder_name: str,
    gstin: str = None,
    is_gst_exempt: bool = False,
    tan_number: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.submit_tax_kyc(
        user_id=current_user.id,
        pan_number=pan_number,
        pan_holder_name=pan_holder_name,
        gstin=gstin,
        is_gst_exempt=is_gst_exempt,
        tan_number=tan_number,
        db=db
    )

@router.post("/bank/submit", summary="Submit Bank Account Verification (Non-Withdrawal Account Matching)")
async def submit_bank_verification(
    account_holder_name: str,
    bank_name: str,
    account_number: str,
    ifsc_code: str,
    account_type: str = "CURRENT",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.submit_bank_account_verification(
        user_id=current_user.id,
        account_holder_name=account_holder_name,
        bank_name=bank_name,
        account_number=account_number,
        ifsc_code=ifsc_code,
        account_type=account_type,
        db=db
    )

@router.post("/bank/verify-penny-drop", summary="Simulate Penny-Drop Account Name Verification")
async def verify_penny_drop(
    penny_drop_ref: str = "PD-REF-998811",
    returned_name: str = "Authorized Account Holder",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    return await kyc_service.process_penny_drop_verification(
        user_id=current_user.id,
        penny_drop_ref=penny_drop_ref,
        registered_name_returned=returned_name,
        db=db
    )

@router.get("/withdrawal-pipeline", summary="Rule 10 Multi-Stage Cash Withdrawal Compliance Pipeline Specification")
async def get_withdrawal_pipeline_status(
    current_user: User = Depends(get_current_user)
):
    from app.services.kyc_service import kyc_service
    return kyc_service.evaluate_withdrawal_eligibility(user_id=current_user.id)


@router.post("/authorized-representative", summary="Register Authorized Representative / Signatory KYC")
async def add_authorized_representative(
    full_name: str,
    designation: str,
    business_kyc_id: Optional[str] = None,
    pan_number: Optional[str] = None,
    id_document_type: str = "AADHAAR",
    id_document_number: Optional[str] = None,
    mobile_number: Optional[str] = None,
    email: Optional[str] = None,
    authorization_letter_url: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    from app.models.kyc import BusinessKYC
    # If business_kyc_id not provided, find by current_user
    if not business_kyc_id:
        biz = (await db.execute(select(BusinessKYC).where(BusinessKYC.user_id == current_user.id))).scalars().first()
        if not biz:
            raise HTTPException(status_code=404, detail="Business KYC profile not found. Please submit Business KYC first.")
        business_kyc_id = biz.id

    return await kyc_service.submit_authorized_representative(
        business_kyc_id=business_kyc_id,
        user_id=current_user.id,
        full_name=full_name,
        designation=designation,
        pan_number=pan_number,
        id_document_type=id_document_type,
        id_document_number=id_document_number,
        mobile_number=mobile_number,
        email=email,
        authorization_letter_url=authorization_letter_url,
        db=db
    )


@router.get("/authorized-representatives", summary="List Authorized Representatives for Business")
async def list_authorized_representatives(
    business_kyc_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    from app.models.kyc import BusinessKYC
    if not business_kyc_id:
        biz = (await db.execute(select(BusinessKYC).where(BusinessKYC.user_id == current_user.id))).scalars().first()
        if not biz:
            return []
        business_kyc_id = biz.id

    return await kyc_service.get_authorized_representatives(business_kyc_id=business_kyc_id, db=db)


@router.post("/beneficial-owner", summary="Record Beneficial Owner CDD under RBI Legal Entity Framework")
async def add_beneficial_owner(
    full_name: str,
    percentage_ownership: float,
    control_type: str = "CONTROLLING_OWNERSHIP_INTEREST",
    business_kyc_id: Optional[str] = None,
    pan_number: Optional[str] = None,
    id_document_type: str = "AADHAAR",
    id_document_number: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    from app.models.kyc import BusinessKYC
    if not business_kyc_id:
        biz = (await db.execute(select(BusinessKYC).where(BusinessKYC.user_id == current_user.id))).scalars().first()
        if not biz:
            raise HTTPException(status_code=404, detail="Business KYC profile not found. Please submit Business KYC first.")
        business_kyc_id = biz.id

    return await kyc_service.submit_beneficial_owner(
        business_kyc_id=business_kyc_id,
        full_name=full_name,
        percentage_ownership=percentage_ownership,
        control_type=control_type,
        pan_number=pan_number,
        id_document_type=id_document_type,
        id_document_number=id_document_number,
        db=db
    )


@router.get("/beneficial-owners", summary="List Beneficial Owners for Business CDD")
async def list_beneficial_owners(
    business_kyc_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.kyc_service import kyc_service
    from app.models.kyc import BusinessKYC
    if not business_kyc_id:
        biz = (await db.execute(select(BusinessKYC).where(BusinessKYC.user_id == current_user.id))).scalars().first()
        if not biz:
            return []
        business_kyc_id = biz.id

    return await kyc_service.get_beneficial_owners(business_kyc_id=business_kyc_id, db=db)


