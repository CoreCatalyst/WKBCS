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
    media_type: str = "image"  # "image" or "video"
    mime_type: str = "image/webp"
    file_size_bytes: int = 0
    is_primary: bool = False
    status: Optional[str] = "READY"
    thumbnail_url: Optional[str] = None


class MediaDeleteRequest(BaseModel):
    storage_key: Optional[str] = None
    url: Optional[str] = None


class MediaItemDetail(BaseModel):
    id: str
    listing_id: str
    url: str
    thumbnail_url: Optional[str] = None
    storage_key: str
    media_type: str  # "image" | "video"
    status: str      # "PENDING_UPLOAD" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED"
    size: int
    original_size: Optional[int] = None
    optimized_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration_seconds: Optional[float] = None
    is_primary: bool = False
    processing_error: Optional[str] = None


class ListingMediaStatus(BaseModel):
    listing_id: str
    total_images: int
    total_videos: int
    ready_images: int = 0
    pending_images: int = 0
    failed_images: int = 0
    ready_videos: int = 0
    minimum_images_met: bool
    maximum_images_valid: bool
    maximum_videos_valid: bool
    can_publish: bool
    images: List[str] = []
    videos: List[str] = []
    media_items: Optional[List[MediaItemDetail]] = []
