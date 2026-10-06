from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class KYCDocumentOut(BaseModel):
    id: str
    document_type: str
    original_filename: str
    mime_type: str
    file_size: int
    is_verified: bool
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class KYCRecordOut(BaseModel):
    id: str
    user_id: str
    business_id: Optional[str] = None
    status: str
    pan_number: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    rejection_reason: Optional[str] = None
    submitted_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    documents: List[KYCDocumentOut] = []

    model_config = ConfigDict(from_attributes=True)

class KYCSubmitRequest(BaseModel):
    pan_number: str
    aadhaar_last4: Optional[str] = None
    document_type: str = "PAN"


class AuthorizedRepresentativeCreate(BaseModel):
    business_kyc_id: str
    full_name: str
    designation: str
    pan_number: Optional[str] = None
    id_document_type: str = "AADHAAR"
    id_document_number: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    authorization_letter_url: Optional[str] = None


class AuthorizedRepresentativeOut(BaseModel):
    id: str
    business_kyc_id: str
    full_name: str
    designation: str
    pan_masked: Optional[str] = None
    id_document_masked: Optional[str] = None
    is_verified: bool
    verification_status: str

    model_config = ConfigDict(from_attributes=True)


class BeneficialOwnerCreate(BaseModel):
    business_kyc_id: str
    full_name: str
    percentage_ownership: float
    control_type: str = "CONTROLLING_OWNERSHIP_INTEREST"
    pan_number: Optional[str] = None
    id_document_type: str = "AADHAAR"
    id_document_number: Optional[str] = None


class BeneficialOwnerOut(BaseModel):
    id: str
    business_kyc_id: str
    full_name: str
    percentage_ownership: float
    control_type: str
    pan_masked: Optional[str] = None
    id_document_masked: Optional[str] = None
    is_cdd_completed: bool

    model_config = ConfigDict(from_attributes=True)

