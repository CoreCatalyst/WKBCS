import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.integrations.sms.msg91_provider import MSG91Provider
from app.integrations.sms.mock_provider import MockSMSProvider
from app.integrations.sms.sms_manager import SMSManager
from app.integrations.storage.supabase_storage import SupabaseStorageProvider
from app.integrations.storage.s3_storage import S3StorageProvider
from app.integrations.storage.local_storage import LocalStorageProvider
from app.integrations.storage.storage_manager import StorageManager
from app.models.product import ListingStatus


@pytest.mark.asyncio
async def test_msg91_provider_number_normalization_and_masking():
    provider = MSG91Provider()
    
    # 1. Test Indian mobile normalization
    assert provider._normalize_indian_mobile("9876543210") == "919876543210"
    assert provider._normalize_indian_mobile("+91-9876543210") == "919876543210"
    assert provider._normalize_indian_mobile("09876543210") == "919876543210"
    assert provider._normalize_indian_mobile("919876543210") == "919876543210"

    # 2. Test safe masking (never logs full number or OTP)
    masked = provider._mask_phone("919876543210")
    assert masked.startswith("91")
    assert masked.endswith("3210")
    assert "****" in masked

    # 3. Test unconfigured safety (does not crash or leak credentials)
    res = await provider.send_otp(
        phone_number="+919876543210",
        otp_code="654321",
        ttl_minutes=5
    )
    assert res["success"] is False
    assert res["configured"] is False
    assert res["delivery_status"] == "SKIPPED_UNCONFIGURED"


@pytest.mark.asyncio
async def test_modular_sms_manager():
    # Verify manager can resolve configured provider
    provider = SMSManager.get_provider()
    assert provider is not None
    assert hasattr(provider, "send_otp")


@pytest.mark.asyncio
async def test_otp_attempt_limits_and_throttling():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = "+919999000011"

        # 1. Request first OTP
        res1 = await ac.post("/api/v1/auth/otp/request", json={
            "identifier": phone,
            "channel": "sms"
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["success"] is True

        # 2. Request again immediately (must trigger rate limiting / throttling 429)
        res2 = await ac.post("/api/v1/auth/otp/request", json={
            "identifier": phone,
            "channel": "sms"
        })
        assert res2.status_code == 429
        assert "Rate limit exceeded" in res2.json()["detail"]

        # 3. Test maximum verification attempts (max 3 attempts)
        for i in range(1, 3):
            bad_verify = await ac.post("/api/v1/auth/otp/verify", json={
                "identifier": phone,
                "otp_code": f"00000{i}"
            })
            assert bad_verify.status_code == 400
            assert "Invalid OTP code" in bad_verify.json()["detail"]

        # 4. Third bad attempt should lock out
        locked_verify = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "000003"
        })
        assert locked_verify.status_code == 400
        assert "Maximum OTP verification attempts exceeded" in locked_verify.json()["detail"]


@pytest.mark.asyncio
async def test_modular_storage_providers():
    # 1. Supabase Storage Provider
    supabase = SupabaseStorageProvider()
    assert supabase.provider_name == "supabase"
    upload_auth = await supabase.create_signed_upload_url(
        bucket="noryvanta-public",
        path="products/item-1.jpg",
        content_type="image/jpeg"
    )
    assert "upload_url" in upload_auth
    assert upload_auth["method"] == "PUT"

    public_url = await supabase.get_public_url(
        bucket="noryvanta-public",
        path="products/item-1.jpg"
    )
    assert "products/item-1.jpg" in public_url

    # 2. AWS S3 Modular Storage Adapter
    s3 = S3StorageProvider()
    assert s3.provider_name == "s3"
    s3_auth = await s3.create_signed_upload_url(
        bucket="noryvanta-s3",
        path="products/item-2.jpg",
        content_type="image/jpeg"
    )
    assert "upload_url" in s3_auth

    # 3. Local Storage Provider
    local = LocalStorageProvider()
    assert local.provider_name == "local"
    local_auth = await local.create_signed_upload_url(
        bucket="noryvanta-local",
        path="products/item-3.jpg",
        content_type="image/jpeg"
    )
    assert "upload_url" in local_auth


@pytest.mark.asyncio
async def test_media_upload_authorization_and_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        import uuid as _uuid
        phone_vendor = f"+9198{_uuid.uuid4().hex[:8]}"
        # Login vendor
        login_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_vendor,
            "otp_code": "123456",
            "full_name": "Media Vendor Test",
            "role": "VENDOR"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        rand_gst = f"27AABC{_uuid.uuid4().hex[:4].upper()}1Z5"
        # Register business profile
        biz_res = await ac.post("/api/v1/businesses/register", headers=headers, json={
            "legal_name": "Media Precision Components Ltd",
            "trade_name": "Media Precision Components",
            "business_type": "Wholesaler",
            "business_category": "Industrial Machinery & Automation",
            "country": "India",
            "gst_number": rand_gst
        })
        assert biz_res.status_code == 200

        # 1. Request upload authorization for valid image
        auth_res = await ac.post("/api/v1/products/media/request-upload", headers=headers, json={
            "media_type": "image",
            "file_name": "valve_spec_front.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": 1024 * 500  # 500 KB
        })
        assert auth_res.status_code == 200
        auth_data = auth_res.json()
        assert "upload_url" in auth_data
        assert "storage_key" in auth_data
        assert auth_data["method"] == "PUT"

        # 2. Reject unsupported MIME type
        invalid_mime_res = await ac.post("/api/v1/products/media/request-upload", headers=headers, json={
            "media_type": "image",
            "file_name": "malicious.exe",
            "mime_type": "application/x-msdownload",
            "file_size_bytes": 1024
        })
        assert invalid_mime_res.status_code == 400
        assert "Invalid image format" in invalid_mime_res.json()["detail"]

        # 3. Reject oversized image (> 10 MB)
        oversized_res = await ac.post("/api/v1/products/media/request-upload", headers=headers, json={
            "media_type": "image",
            "file_name": "huge_banner.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": 12 * 1024 * 1024  # 12 MB (> 10 MB limit)
        })
        assert oversized_res.status_code == 400
        assert "exceeds maximum" in oversized_res.json()["detail"]

        # 4. Create a draft product
        prod_create = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Industrial Media Test Product",
            "description": "Testing media attachment lifecycle.",
            "category": "Industrial Machinery & Automation",
            "hsn_code": "848180",
            "base_price": 3200.0,
            "images": ["https://cdn.noryvantaglobal.com/draft/1.jpg"],
            "is_draft": True
        })
        assert prod_create.status_code == 200
        prod_id = prod_create.json()["id"]

        # 5. Confirm media uploads until 4 images reached
        for i in range(2, 5):
            confirm_res = await ac.post(f"/api/v1/products/{prod_id}/media/confirm-upload", headers=headers, json={
                "storage_key": f"businesses/test/listings/{prod_id}/img_{i}.jpg",
                "public_url": f"https://cdn.noryvantaglobal.com/listings/{prod_id}/img_{i}.jpg",
                "media_type": "image",
                "mime_type": "image/jpeg",
                "file_size_bytes": 204800
            })
            assert confirm_res.status_code == 200

        status_data = confirm_res.json()
        assert status_data["total_images"] == 4
        assert status_data["minimum_images_met"] is True
        assert status_data["can_publish"] is True

        # 6. Publish listing
        publish_res = await ac.post(f"/api/v1/products/{prod_id}/publish", headers=headers)
        assert publish_res.status_code == 200
        assert publish_res.json()["status"] == ListingStatus.ACTIVE.value

        # 7. Delete an image dropping count below 4 -> automatically demotes from ACTIVE to DRAFT
        del_res = await ac.request("DELETE", f"/api/v1/products/{prod_id}/media", headers=headers, json={
            "url": f"https://cdn.noryvantaglobal.com/listings/{prod_id}/img_4.jpg",
            "storage_key": f"businesses/test/listings/{prod_id}/img_4.jpg"
        })
        assert del_res.status_code == 200
        assert del_res.json()["total_images"] == 3
        assert del_res.json()["minimum_images_met"] is False
        assert del_res.json()["can_publish"] is False

        # Verify listing reverted to DRAFT
        get_p = await ac.get(f"/api/v1/products/{prod_id}")
        assert get_p.json()["status"] == ListingStatus.DRAFT.value
