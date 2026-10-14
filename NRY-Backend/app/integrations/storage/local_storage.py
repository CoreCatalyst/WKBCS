"""
Local Filesystem Storage Provider for Noryvanta.
Serves as an offline local development and test provider.
"""

import os
from typing import Dict, Any, Optional
from app.integrations.storage.base import BaseStorageProvider
from app.core.config import settings


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, base_dir: str = "media_uploads"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    @property
    def provider_name(self) -> str:
        return "local"

    def is_configured(self) -> bool:
        return True

    async def create_signed_upload_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 900,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        clean_path = path.lstrip("/")
        return {
            "upload_url": f"/api/v1/storage/upload/{bucket}/{clean_path}?token=dev_local_token",
            "provider": "local",
            "bucket": bucket,
            "path": clean_path,
            "method": "PUT",
            "headers": {"Content-Type": content_type} if content_type else {},
            "expires_in": expires_in,
            "is_mock": False
        }

    async def get_public_url(self, bucket: str, path: str) -> str:
        clean_path = path.lstrip("/")
        return f"/media/{bucket}/{clean_path}"

    async def create_signed_download_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        clean_path = path.lstrip("/")
        return f"/api/v1/storage/download/{bucket}/{clean_path}?expires={expires_in}"

    async def delete_object(self, bucket: str, path: str) -> bool:
        full_path = os.path.join(self.base_dir, bucket, path.lstrip("/"))
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                return True
            except OSError:
                return False
        return True

    async def object_exists(self, bucket: str, path: str) -> bool:
        full_path = os.path.join(self.base_dir, bucket, path.lstrip("/"))
        return os.path.exists(full_path)
