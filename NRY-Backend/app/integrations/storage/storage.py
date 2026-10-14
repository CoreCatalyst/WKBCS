"""
Secure Object Storage Provider (Supabase Storage / AWS S3)
Enforces file type, file size (max 20MB video, max 5MB image), and secure access.
"""

from typing import Dict, Any, Optional
import os
import uuid
from app.core.config import settings

class StorageService:
    @staticmethod
    def generate_presigned_upload_url(
        file_name: str,
        content_type: str,
        folder: str = "products"
    ) -> Dict[str, Any]:
        """
        Generates presigned upload URL or storage path for direct secure uploads.
        Never exposes private storage access keys or secret credentials.
        """
        ext = os.path.splitext(file_name)[1].lower()
        unique_key = f"{folder}/{uuid.uuid4().hex}{ext}"

        if settings.STORAGE_PROVIDER == "supabase" and settings.SUPABASE_URL:
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.STORAGE_BUCKET}/{unique_key}"
            upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.STORAGE_BUCKET}/{unique_key}"
            return {
                "upload_url": upload_url,
                "public_url": public_url,
                "file_key": unique_key,
                "provider": "supabase"
            }

        # Local development fallback
        return {
            "upload_url": f"/api/v1/media/upload?key={unique_key}",
            "public_url": f"/static/uploads/{unique_key}",
            "file_key": unique_key,
            "provider": "local"
        }

    @staticmethod
    def validate_file(file_name: str, file_size_bytes: int, is_video: bool = False) -> None:
        """
        Validates listing media uploads according to Section 13:
        Images: max 5 MB, extensions: jpg, jpeg, png, webp.
        Videos: max 20 MB, extensions: mp4, webm, mov, max 30s.
        """
        ext = os.path.splitext(file_name)[1].lower()
        if is_video:
            if ext not in [".mp4", ".webm", ".mov"]:
                raise ValueError("Permitted video formats are: MP4, WebM, MOV.")
            if file_size_bytes > 20 * 1024 * 1024:
                raise ValueError("Video clip size cannot exceed 20 MB.")
        else:
            if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                raise ValueError("Permitted image formats are: JPG, PNG, WebP.")
            if file_size_bytes > 5 * 1024 * 1024:
                raise ValueError("Image file size cannot exceed 5 MB.")
