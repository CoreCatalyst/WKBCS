import io
import uuid
import pytest
from PIL import Image, ExifTags
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.media_processor import media_processor, MediaProcessorService
from app.core.config import settings
from app.core.security import decode_token
from app.models.product import Product, ListingImage, MediaProcessingStatus
from app.models.business import BusinessProfile
from app.core.database import AsyncSessionLocal

def create_sample_image(width=1600, height=1200, format="JPEG", with_exif=True):
    img = Image.new("RGB", (width, height), color=(73, 109, 137))
    bio = io.BytesIO()
    if with_exif:
        exif = img.getexif()
        # Set UserComment (tag 0x9286 = 37510) and Make (0x010F = 271)
        exif[271] = "CameraBrandXYZ"
        exif[37510] = b"AntigravityTestExifComment"
        img.save(bio, format=format, exif=exif)
    else:
        img.save(bio, format=format)
    return bio.getvalue()

@pytest.mark.asyncio
async def test_image_optimization_rules():
    """
    Validates:
    - Stripping EXIF/GPS metadata
    - Resizing > 1200px down to <= 1200px maintaining aspect ratio
    - WebP conversion
    - Thumbnail generation targeting <= 300px
    """
    raw_data = create_sample_image(width=2400, height=1600, with_exif=True)
    assert len(raw_data) > 0

    res = media_processor.optimize_image(raw_data)

    assert res.success is True
    assert res.optimized_mime == "image/webp"

    # Verify optimized image properties
    opt_img = Image.open(io.BytesIO(res.optimized_bytes))
    assert opt_img.format == "WEBP"
    assert opt_img.width <= settings.IMAGE_MAX_DIMENSION
    assert opt_img.height <= settings.IMAGE_MAX_DIMENSION
    # Aspect ratio preserved (2400x1600 = 1.5, so 1200x800)
    assert opt_img.width == 1200
    assert opt_img.height == 800

    # Verify EXIF is stripped
    exif = opt_img.getexif()
    assert 271 not in exif
    assert 37510 not in exif

    # Verify thumbnail properties
    thumb_img = Image.open(io.BytesIO(res.thumbnail_bytes))
    assert thumb_img.format == "WEBP"
    assert thumb_img.width <= settings.THUMBNAIL_MAX_DIMENSION
    assert thumb_img.height <= settings.THUMBNAIL_MAX_DIMENSION
    # Aspect ratio for thumbnail: 300x200
    assert thumb_img.width == 300
    assert thumb_img.height == 200

@pytest.mark.asyncio
async def test_image_no_upscaling():
    """
    Validates:
    - Do not upscale smaller images (e.g. 600x400 remains 600x400)
    """
    raw_data = create_sample_image(width=600, height=400, with_exif=False)
    res = media_processor.optimize_image(raw_data)

    opt_img = Image.open(io.BytesIO(res.optimized_bytes))
    assert opt_img.width == 600
    assert opt_img.height == 400

@pytest.mark.asyncio
async def test_video_ffmpeg_unavailability_handling():
    """
    Validates:
    - "Use FFmpeg only if available in the existing infrastructure. Never mark a video as successfully optimized if processing failed."
    - When FFmpeg is not found, processing returns success=False and explicit error.
    """
    with patch.object(MediaProcessorService, "is_ffmpeg_available", return_value=False):
        raw_video = b"fake-video-bytes"
        result = media_processor.optimize_video(raw_video, "sample.mp4")
        assert result.success is False
        assert "FFmpeg processing is not available" in result.error
        assert result.optimized_bytes is None

@pytest.mark.asyncio
async def test_video_oversized_and_duration_validation():
    """
    Validates:
    - Video size limit rejection (> 25 MB)
    - Video duration rejection (> 30s)
    """
    # Exceeding 25 MB
    large_payload = b"0" * (26 * 1024 * 1024)
    res_large = media_processor.optimize_video(large_payload, "large.mp4")
    assert res_large.success is False
    assert "25 MB" in res_large.error

    # Duration > 30s
    with patch.object(MediaProcessorService, "is_ffmpeg_available", return_value=True):
        with patch.object(MediaProcessorService, "is_ffprobe_available", return_value=True):
            mock_sub = MagicMock(returncode=0, stdout="35.5\n", stderr="")
            with patch("subprocess.run", return_value=mock_sub):
                res_dur = media_processor.optimize_video(b"short-dummy-bytes", "long.mp4")
                assert res_dur.success is False
                assert "30 seconds" in res_dur.error

@pytest.mark.asyncio
async def test_media_upload_endpoint_and_publish_enforcement():
    """
    Validates end-to-end:
    - Direct media upload endpoint optimizes images to READY
    - Listing requires minimum 4 READY images to publish
    - Uploading oversized image (> 10MB) returns 400
    - Listing publishes successfully once 4 READY images exist
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.get("/api/v1/health")

        # Authenticate as vendor
        phone = f"+9198{uuid.uuid4().hex[:8]}"
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "123456",
            "full_name": "Media Test Vendor",
            "role": "VENDOR"
        })
        assert verify_res.status_code == 200
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        user_id = decode_token(token).get("sub")

        # Create business profile for vendor
        unique_suffix = uuid.uuid4().hex[:6].upper()
        async with AsyncSessionLocal() as db:
            biz = BusinessProfile(
                id=f"biz-{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                legal_name="Media Test Corp",
                trade_name="Media Test",
                business_type="WHOLESALER",
                gstin=f"27ABCD{unique_suffix[:4]}1Z5",
                pan=f"ABCD{unique_suffix[:5]}",
                bank_account_number=f"12345{unique_suffix}",
                bank_ifsc="HDFC0001234"
            )
            db.add(biz)
            await db.commit()

        # 1. Create a draft product
        prod_res = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Industrial High-Precision Laser Sensor",
            "description": "High accuracy laser measurement sensor with digital interface",
            "category": "Industrial Electronics",
            "base_price": 4500.0,
            "moq": 1,
            "stock_quantity": 50,
            "images": [],
            "is_draft": True
        })
        assert prod_res.status_code == 200
        product_id = prod_res.json()["id"]

        # 2. Check initial media status (fewer than 4 images)
        status_res = await ac.get(f"/api/v1/products/{product_id}/media/status", headers=headers)
        assert status_res.status_code == 200
        media_status = status_res.json()
        assert media_status["ready_images"] < 4
        assert media_status["minimum_images_met"] is False
        assert media_status["can_publish"] is False

        # 3. Attempting to publish without 4 ready images should fail
        publish_res = await ac.post(f"/api/v1/products/{product_id}/publish", headers=headers)
        assert publish_res.status_code == 400
        assert "4 READY images are required" in publish_res.json()["detail"]

        # 4. Upload oversized image (> 10 MB) -> should fail with 400
        oversized_data = b"0" * (11 * 1024 * 1024)
        upload_over = await ac.post(
            f"/api/v1/products/{product_id}/media/upload",
            headers=headers,
            files={"file": ("huge.jpg", oversized_data, "image/jpeg")}
        )
        assert upload_over.status_code == 400
        assert "10 MB" in upload_over.json()["detail"]

        # 5. Upload 3 valid images
        for i in range(1, 4):
            img_data = create_sample_image(width=1000 + i * 100, height=800 + i * 50)
            up_res = await ac.post(
                f"/api/v1/products/{product_id}/media/upload",
                headers=headers,
                files={"file": (f"img_{i}.jpg", img_data, "image/jpeg")}
            )
            assert up_res.status_code == 200
            data = up_res.json()
            assert data["ready_images"] == i
            assert len(data["media_items"]) == i
            last_item = data["media_items"][-1]
            assert last_item["status"] == "READY"
            assert last_item["thumbnail_url"] is not None
            assert last_item["optimized_size"] > 0

        # With 3 images, still cannot publish
        status_res = await ac.get(f"/api/v1/products/{product_id}/media/status", headers=headers)
        assert status_res.json()["ready_images"] == 3
        assert status_res.json()["can_publish"] is False

        pub_res2 = await ac.post(f"/api/v1/products/{product_id}/publish", headers=headers)
        assert pub_res2.status_code == 400

        # 6. Upload 4th image (reaches minimum 4 READY images)
        img4_data = create_sample_image(width=1400, height=1000)
        up_res4 = await ac.post(
            f"/api/v1/products/{product_id}/media/upload",
            headers=headers,
            files={"file": ("img_4.jpg", img4_data, "image/jpeg")}
        )
        assert up_res4.status_code == 200

        # Now minimum images met!
        status_res = await ac.get(f"/api/v1/products/{product_id}/media/status", headers=headers)
        assert status_res.json()["ready_images"] == 4
        assert status_res.json()["minimum_images_met"] is True
        assert status_res.json()["can_publish"] is True

        # 7. Publish listing successfully
        pub_ok = await ac.post(f"/api/v1/products/{product_id}/publish", headers=headers)
        assert pub_ok.status_code == 200
        assert pub_ok.json()["status"] == "ACTIVE"

@pytest.mark.asyncio
async def test_failed_media_retry():
    """
    Validates:
    - Failed media items can be retried via the retry endpoint
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.get("/api/v1/health")

        phone = f"+9198{uuid.uuid4().hex[:8]}"
        verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "123456",
            "full_name": "Retry Test Vendor",
            "role": "VENDOR"
        })
        token = verify_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        user_id = decode_token(token).get("sub")

        # Create business profile for vendor
        unique_suffix = uuid.uuid4().hex[:6].upper()
        async with AsyncSessionLocal() as db:
            biz = BusinessProfile(
                id=f"biz-{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                legal_name="Retry Test Corp",
                trade_name="Retry Test",
                business_type="WHOLESALER",
                gstin=f"27WXYZ{unique_suffix[:4]}1Z5",
                pan=f"WXYZ{unique_suffix[:5]}",
                bank_account_number=f"98765{unique_suffix}",
                bank_ifsc="HDFC0001234"
            )
            db.add(biz)
            await db.commit()

        prod_res = await ac.post("/api/v1/products", headers=headers, json={
            "title": "Precision Calibration Target",
            "description": "Optical optical calibration grid",
            "category": "Metrology",
            "base_price": 1200.0,
            "moq": 1,
            "stock_quantity": 10,
            "images": [],
            "is_draft": True
        })
        assert prod_res.status_code == 200
        product_id = prod_res.json()["id"]

        # Directly insert a failed media item into DB for testing retry
        media_id = None
        async with AsyncSessionLocal() as db:
            failed_item = ListingImage(
                listing_id=product_id,
                storage_key=f"products/{product_id}/images/failed_test.webp",
                url=f"http://test/storage/products/{product_id}/images/failed_test.webp",
                media_type="image",
                mime_type="image/webp",
                size=50000,
                status=MediaProcessingStatus.FAILED.value,
                original_size=50000,
                optimized_size=0,
                processing_error="Simulated network failure during optimization"
            )
            db.add(failed_item)
            await db.commit()
            await db.refresh(failed_item)
            media_id = failed_item.id

        # Verify status endpoint shows 1 failed image
        stat_res = await ac.get(f"/api/v1/products/{product_id}/media/status", headers=headers)
        assert stat_res.json()["failed_images"] == 1

        # Trigger retry endpoint
        retry_res = await ac.post(f"/api/v1/products/{product_id}/media/{media_id}/retry", headers=headers)
        assert retry_res.status_code == 200
        data = retry_res.json()
        assert data["listing_id"] == product_id
        assert data["failed_images"] == 0
        retried_item = next(item for item in data["media_items"] if item["id"] == media_id)
        assert retried_item["status"] in ["PENDING_UPLOAD", "PROCESSING", "READY"]
