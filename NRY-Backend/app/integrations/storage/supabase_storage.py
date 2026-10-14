"""
Supabase Object Storage Provider for Noryvanta.
Implements secure signed upload authorization, short-lived download tokens,
and remote asset lifecycle management.
"""

import httpx
import logging
from typing import Dict, Any, Optional
from app.integrations.storage.base import BaseStorageProvider
from app.core.config import settings

logger = logging.getLogger("noryvanta.storage.supabase")


class SupabaseStorageProvider(BaseStorageProvider):
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY or ""
        self.public_bucket = settings.SUPABASE_STORAGE_BUCKET_PUBLIC
        self.private_bucket = settings.SUPABASE_STORAGE_BUCKET_PRIVATE

    @property
    def provider_name(self) -> str:
        return "supabase"

    def is_configured(self) -> bool:
        return bool(
            self.supabase_url
            and not self.supabase_url.startswith("mock")
            and not "mock" in self.supabase_url
            and self.service_role_key
            and not self.service_role_key.startswith("mock")
        )

    def _get_headers(self) -> Dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json"
        }

    async def create_signed_upload_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 900,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a restricted, short-lived signed upload URL (Supabase v1 storage).
        Allows frontend to stream file directly to Supabase via HTTP PUT.
        """
        clean_path = path.lstrip("/")

        if not self.is_configured():
            logger.warning("[Supabase Storage] Live credentials not configured. Returning simulated signed upload URL.")
            simulated_url = f"https://mock-storage.noryvanta.in/{bucket}/{clean_path}?token=mock_upload_token"
            return {
                "upload_url": simulated_url,
                "provider": "supabase",
                "bucket": bucket,
                "path": clean_path,
                "method": "PUT",
                "headers": {"Content-Type": content_type} if content_type else {},
                "expires_in": expires_in,
                "is_mock": True
            }

        endpoint = f"{self.supabase_url}/storage/v1/object/upload/sign/{bucket}/{clean_path}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    endpoint,
                    headers=self._get_headers(),
                    json={"expiresIn": expires_in}
                )

                if resp.status_code in (200, 201):
                    data = resp.json()
                    relative_url = data.get("url") or data.get("signedUrl")
                    if relative_url and not relative_url.startswith("http"):
                        upload_url = f"{self.supabase_url}/storage/v1{relative_url}"
                    else:
                        upload_url = relative_url or endpoint

                    headers = {}
                    if content_type:
                        headers["Content-Type"] = content_type

                    return {
                        "upload_url": upload_url,
                        "provider": "supabase",
                        "bucket": bucket,
                        "path": clean_path,
                        "method": "PUT",
                        "headers": headers,
                        "expires_in": expires_in,
                        "is_mock": False
                    }
                else:
                    logger.error(f"[Supabase Storage] Sign upload failed: HTTP {resp.status_code} - {resp.text}")
                    raise RuntimeError(f"Supabase storage signing error: {resp.text}")
        except Exception as e:
            logger.error(f"[Supabase Storage] Error creating signed upload URL: {e}")
            raise

    async def get_public_url(self, bucket: str, path: str) -> str:
        """Constructs public URL for public assets."""
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return f"https://cdn.noryvanta.in/{bucket}/{clean_path}"
        return f"{self.supabase_url}/storage/v1/object/public/{bucket}/{clean_path}"

    async def create_signed_download_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """Creates short-lived read URL for private / sensitive files."""
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return f"https://mock-storage.noryvanta.in/{bucket}/{clean_path}?token=mock_download_token"

        endpoint = f"{self.supabase_url}/storage/v1/object/sign/{bucket}/{clean_path}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    endpoint,
                    headers=self._get_headers(),
                    json={"expiresIn": expires_in}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    signed = data.get("signedURL")
                    if signed and not signed.startswith("http"):
                        return f"{self.supabase_url}/storage/v1{signed}"
                    return signed or ""
                return self.get_public_url(bucket, clean_path)
        except Exception as e:
            logger.error(f"[Supabase Storage] Download signing failed: {e}")
            return self.get_public_url(bucket, clean_path)

    async def delete_object(self, bucket: str, path: str) -> bool:
        """Deletes file from Supabase storage bucket."""
        clean_path = path.lstrip("/")
        if not self.is_configured():
            logger.info(f"[Supabase Storage Mock] Deleted object {bucket}/{clean_path}")
            return True

        endpoint = f"{self.supabase_url}/storage/v1/object/{bucket}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.request(
                    "DELETE",
                    endpoint,
                    headers=self._get_headers(),
                    json={"prefixes": [clean_path]}
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.error(f"[Supabase Storage] Delete object error: {e}")
            return False

    async def object_exists(self, bucket: str, path: str) -> bool:
        """Checks if file exists in the designated bucket."""
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return True

        endpoint = f"{self.supabase_url}/storage/v1/object/info/{bucket}/{clean_path}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(endpoint, headers=self._get_headers())
                return resp.status_code == 200
        except Exception:
            return False
