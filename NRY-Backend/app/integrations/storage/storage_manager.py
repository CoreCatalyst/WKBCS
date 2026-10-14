"""
Unified Object Storage Manager for Noryvanta.
Instantiates and delegates to the configured storage provider (Supabase, S3, or Local).
"""

from typing import Optional, Dict, Any
from app.integrations.storage.base import BaseStorageProvider
from app.integrations.storage.supabase_storage import SupabaseStorageProvider
from app.integrations.storage.s3_storage import S3StorageProvider
from app.integrations.storage.local_storage import LocalStorageProvider
from app.core.config import settings


class StorageManager:
    _provider_cache: Optional[BaseStorageProvider] = None

    @classmethod
    def get_provider(cls) -> BaseStorageProvider:
        if cls._provider_cache is not None:
            return cls._provider_cache

        provider_name = (settings.STORAGE_PROVIDER or "supabase").lower().strip()

        if provider_name == "supabase":
            cls._provider_cache = SupabaseStorageProvider()
        elif provider_name in ("s3", "aws"):
            cls._provider_cache = S3StorageProvider(is_r2=False)
        elif provider_name in ("r2", "cloudflare"):
            cls._provider_cache = S3StorageProvider(is_r2=True)
        elif provider_name == "local":
            cls._provider_cache = LocalStorageProvider()
        else:
            cls._provider_cache = SupabaseStorageProvider()

        return cls._provider_cache

    @classmethod
    def reset_provider(cls) -> None:
        """Resets the cached provider for testing and dynamic config changes."""
        cls._provider_cache = None

    @classmethod
    async def request_upload_authorization(
        cls,
        bucket: str,
        path: str,
        content_type: Optional[str] = None,
        expires_in: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Creates short-lived signed upload authorization for client browser or mobile app.
        """
        provider = cls.get_provider()
        ttl = expires_in or settings.STORAGE_SIGNED_URL_EXPIRES_SECONDS
        return await provider.create_signed_upload_url(
            bucket=bucket,
            path=path,
            expires_in=ttl,
            content_type=content_type
        )

    @classmethod
    async def get_public_url(cls, bucket: str, path: str) -> str:
        provider = cls.get_provider()
        return await provider.get_public_url(bucket=bucket, path=path)

    @classmethod
    async def get_signed_download_url(cls, bucket: str, path: str, expires_in: int = 3600) -> str:
        provider = cls.get_provider()
        return await provider.create_signed_download_url(bucket=bucket, path=path, expires_in=expires_in)

    @classmethod
    async def delete_file(cls, bucket: str, path: str) -> bool:
        provider = cls.get_provider()
        return await provider.delete_object(bucket=bucket, path=path)

    @classmethod
    async def file_exists(cls, bucket: str, path: str) -> bool:
        provider = cls.get_provider()
        return await provider.object_exists(bucket=bucket, path=path)

    @classmethod
    async def upload_bytes(
        cls,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        provider = cls.get_provider()
        return await provider.upload_bytes(bucket=bucket, path=path, data=data, content_type=content_type)

    @classmethod
    async def download_bytes(cls, bucket: str, path: str) -> bytes:
        provider = cls.get_provider()
        return await provider.download_bytes(bucket=bucket, path=path)


storage_manager = StorageManager()
