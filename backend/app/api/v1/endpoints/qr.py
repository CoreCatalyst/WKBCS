from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.business import BusinessProfile
from app.services.qr_service import QRService

router = APIRouter()

class QRGenerateRequest(BaseModel):
    uaid: str

class QRGenerateResponse(BaseModel):
    uaid: str
    verification_reference: str
    qr_svg: str

class QRVerifyRequest(BaseModel):
    reference: str

class QRVerifyResponse(BaseModel):
    valid: bool
    uaid: str
    business_name: str
    business_type: str
    verification_status: str
    country: str

@router.post("/generate", response_model=QRGenerateResponse, summary="Generate Signed QR Code for UAID")
async def generate_qr(
    payload: QRGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a secure, signed QR code verification payload for a UAID.
    Guarantees zero private credentials or documents are contained in the QR payload.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.virtual_escrow_account_id == payload.uaid)
    res = await db.execute(stmt)
    biz = res.scalars().first()

    if not biz:
        raise HTTPException(status_code=404, detail="UAID not found.")

    # Guard: only the business owner or admin can generate the official QR
    if biz.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to generate QR for this UAID.")

    reference = QRService.generate_signed_reference(payload.uaid)
    svg = QRService.generate_qr_svg(reference)

    return QRGenerateResponse(
        uaid=payload.uaid,
        verification_reference=reference,
        qr_svg=svg
    )

@router.post("/verify", response_model=QRVerifyResponse, summary="Public QR Verification Endpoint")
async def verify_qr(
    payload: QRVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies a scanned QR code reference and returns MINIMAL public validation data.
    Strictly excludes PAN, TAN, GST, bank account numbers, phone numbers, and address details.
    """
    uaid = QRService.verify_signed_reference(payload.reference)
    if not uaid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or counterfeit QR verification reference."
        )

    stmt = select(BusinessProfile).where(BusinessProfile.virtual_escrow_account_id == uaid)
    res = await db.execute(stmt)
    biz = res.scalars().first()

    if not biz:
        raise HTTPException(status_code=404, detail="Verified UAID has no active business profile.")

    return QRVerifyResponse(
        valid=True,
        uaid=biz.virtual_escrow_account_id or uaid,
        business_name=biz.trade_name or biz.legal_name,
        business_type=biz.business_type,
        verification_status=biz.verification_status.value,
        country=biz.country
    )
