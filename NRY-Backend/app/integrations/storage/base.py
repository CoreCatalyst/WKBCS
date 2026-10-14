"""
Abstract Base Storage Provider Interface for Noryvanta.
Ensures uniform object storage interface across Supabase Storage, AWS S3, and Local Storage.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseStorageProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Identifier of the storage provider."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the provider has necessary live credentials."""
        pass

    @abstractmethod
    async def create_signed_upload_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 900,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a restricted, short-lived signed upload authorization.
        Permits secure browser-to-storage direct uploads without exposing master API keys.
        """
        pass

    @abstractmethod
    async def get_public_url(self, bucket: str, path: str) -> str:
        """Returns the public URL for an asset residing in a public bucket."""
        pass

    @abstractmethod
    async def create_signed_download_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        """Generates a short-lived signed URL for accessing private objects."""
        pass

    @abstractmethod
    async def delete_object(self, bucket: str, path: str) -> bool:
        """Deletes an object from the designated storage bucket."""
        pass

    @abstractmethod
    async def object_exists(self, bucket: str, path: str) -> bool:
        """Verifies if an object exists at the specified bucket and path."""
        pass

    @abstractmethod
    async def upload_bytes(
        self,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Directly uploads byte buffer to object storage and returns the public URL."""
        pass

    @abstractmethod
    async def download_bytes(self, bucket: str, path: str) -> bytes:
        """Downloads object bytes from storage."""
        pass
