"""
Modular AWS S3 Storage Adapter for Noryvanta.
Allows seamless plug-and-play migration to AWS S3 / CloudFront
without altering marketplace business rules or database schema.
"""

import logging
from typing import Dict, Any, Optional
from app.integrations.storage.base import BaseStorageProvider
from app.core.config import settings

logger = logging.getLogger("noryvanta.storage.s3")


class S3StorageProvider(BaseStorageProvider):
    """
    AWS S3 Storage Provider implementation.
    Generates AWS S3 pre-signed PUT URLs for direct browser uploads
    and pre-signed GET URLs for private documents.
    """

    def __init__(self, is_r2: bool = False):
        self.is_r2 = is_r2 or (settings.STORAGE_PROVIDER or "").lower() in ("r2", "cloudflare")
        self.r2_account_id = getattr(settings, "CLOUDFLARE_R2_ACCOUNT_ID", "")
        self.r2_public_domain = getattr(settings, "CLOUDFLARE_R2_PUBLIC_DOMAIN", "")

        # Resolve credentials
        self.access_key = (
            getattr(settings, "CLOUDFLARE_R2_ACCESS_KEY_ID", "")
            or getattr(settings, "STORAGE_ACCESS_KEY", "")
            or getattr(settings, "AWS_ACCESS_KEY_ID", "")
        )
        self.secret_key = (
            getattr(settings, "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
            or getattr(settings, "STORAGE_SECRET_KEY", "")
            or getattr(settings, "AWS_SECRET_ACCESS_KEY", "")
        )
        self.bucket = (
            getattr(settings, "CLOUDFLARE_R2_BUCKET", "")
            or getattr(settings, "STORAGE_BUCKET", "")
            or getattr(settings, "AWS_S3_BUCKET_NAME", "noryvanta-media")
        )
        self.region = getattr(settings, "STORAGE_REGION", getattr(settings, "AWS_REGION", "auto" if self.is_r2 else "ap-south-1"))

        # Endpoint URL for Cloudflare R2 or S3-compatible providers
        self.endpoint_url = getattr(settings, "STORAGE_ENDPOINT_URL", None)
        if not self.endpoint_url and self.r2_account_id:
            self.endpoint_url = f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    def _get_s3_client(self):
        import boto3
        kwargs = {
            "service_name": "s3",
            "region_name": self.region,
            "aws_access_key_id": self.access_key,
            "aws_secret_access_key": self.secret_key,
        }
        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url
        return boto3.client(**kwargs)

    @property
    def provider_name(self) -> str:
        return "r2" if self.is_r2 else "s3"

    def is_configured(self) -> bool:
        return bool(
            self.access_key
            and not self.access_key.startswith("mock")
            and self.secret_key
            and not self.secret_key.startswith("mock")
        )

    async def create_signed_upload_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 900,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            logger.warning("[S3 Storage] Credentials unconfigured. Returning simulated S3 signed URL.")
            return {
                "upload_url": f"https://{bucket}.s3.{self.region}.amazonaws.com/{clean_path}?X-Amz-Signature=mock_sig",
                "provider": "s3",
                "bucket": bucket,
                "path": clean_path,
                "method": "PUT",
                "headers": {"Content-Type": content_type} if content_type else {},
                "expires_in": expires_in,
                "is_mock": True
            }

        # When live boto3 credentials are provided, generate standard pre-signed S3 URL
        try:
            import boto3
            s3_client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key
            )
            params = {"Bucket": bucket, "Key": clean_path}
            if content_type:
                params["ContentType"] = content_type

            presigned_url = s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params=params,
                ExpiresIn=expires_in
            )
            return {
                "upload_url": presigned_url,
                "provider": "s3",
                "bucket": bucket,
                "path": clean_path,
                "method": "PUT",
                "headers": {"Content-Type": content_type} if content_type else {},
                "expires_in": expires_in,
                "is_mock": False
            }
        except Exception as e:
            logger.error(f"[S3 Storage] Failed to generate presigned upload URL: {e}")
            raise

    async def get_public_url(self, bucket: str, path: str) -> str:
        clean_path = path.lstrip("/")
        if self.r2_public_domain:
            return f"https://{self.r2_public_domain.rstrip('/')}/{clean_path}"
        return f"https://{bucket}.s3.{self.region}.amazonaws.com/{clean_path}"

    async def create_signed_download_url(
        self,
        bucket: str,
        path: str,
        expires_in: int = 3600
    ) -> str:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return f"https://{bucket}.s3.{self.region}.amazonaws.com/{clean_path}?X-Amz-Signature=mock_get"

        try:
            s3_client = self._get_s3_client()
            return s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket, "Key": clean_path},
                ExpiresIn=expires_in
            )
        except Exception as e:
            logger.error(f"[S3 Storage] Failed to generate presigned download URL: {e}")
            return await self.get_public_url(bucket, clean_path)

    async def delete_object(self, bucket: str, path: str) -> bool:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return True
        try:
            s3_client = self._get_s3_client()
            s3_client.delete_object(Bucket=bucket, Key=clean_path)
            return True
        except Exception as e:
            logger.error(f"[S3 Storage] Failed to delete object: {e}")
            return False

    async def object_exists(self, bucket: str, path: str) -> bool:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            return True
        try:
            s3_client = self._get_s3_client()
            s3_client.head_object(Bucket=bucket, Key=clean_path)
            return True
        except Exception:
            return False

    async def upload_bytes(
        self,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            # In offline or mock mode, store in local fallback
            import os
            local_fallback = os.path.join("media_uploads", bucket, clean_path)
            os.makedirs(os.path.dirname(local_fallback), exist_ok=True)
            with open(local_fallback, "wb") as f:
                f.write(data)
            return await self.get_public_url(bucket, clean_path)

        try:
            s3_client = self._get_s3_client()
            s3_client.put_object(
                Bucket=bucket,
                Key=clean_path,
                Body=data,
                ContentType=content_type
            )
            return await self.get_public_url(bucket, clean_path)
        except Exception as e:
            logger.error(f"[S3 Storage] Failed to upload bytes: {e}")
            raise

    async def download_bytes(self, bucket: str, path: str) -> bytes:
        clean_path = path.lstrip("/")
        if not self.is_configured():
            import os
            local_fallback = os.path.join("media_uploads", bucket, clean_path)
            if os.path.exists(local_fallback):
                with open(local_fallback, "rb") as f:
                    return f.read()
            raise FileNotFoundError(f"Storage object not found: {bucket}/{clean_path}")

        try:
            s3_client = self._get_s3_client()
            resp = s3_client.get_object(Bucket=bucket, Key=clean_path)
            return resp["Body"].read()
        except Exception as e:
            logger.error(f"[S3 Storage] Failed to download bytes: {e}")
            raise
