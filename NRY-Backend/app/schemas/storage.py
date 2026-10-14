"""
Schemas for Object Storage and Media Management.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, field_validator


class UploadAuthorizationRequest(BaseModel):
    listing_id: Optional[str] = None
    media_type: str  # "image" or "video" or "document"
    file_name: str
    mime_type: str
    file_size_bytes: int
    is_private: bool = False

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        clean = v.lower().strip()
        if clean not in ("image", "video", "document"):
            raise ValueError("media_type must be 'image', 'video', or 'document'")
        return clean


class UploadAuthorizationResponse(BaseModel):
    upload_url: str
    public_url: str
    storage_key: str
    provider: str
    bucket: str
    expires_in: int
    method: str = "PUT"
    headers: Dict[str, str] = {}
    is_mock: bool = False


class MediaConfirmRequest(BaseModel):
    storage_key: str
    public_url: str
    media_type: str  # "image" or "video"
    mime_type: str
    file_size_bytes: int
    is_primary: bool = False


class MediaDeleteRequest(BaseModel):
    storage_key: Optional[str] = None
    url: Optional[str] = None


class ListingMediaStatus(BaseModel):
    listing_id: str
    total_images: int
    total_videos: int
    minimum_images_met: bool
    maximum_images_valid: bool
    maximum_videos_valid: bool
    can_publish: bool
    images: List[str]
    videos: List[str]
