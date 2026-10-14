import uuid
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.business import BusinessProfile
from app.models.product import Product, TieredPrice, ListingImage, ListingType, ListingStatus, MediaProcessingStatus
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductOut, AIListingRequest, AIListingResponse,
    MINIMUM_PRODUCT_IMAGES, MAXIMUM_PRODUCT_IMAGES, MAXIMUM_PRODUCT_VIDEOS
)
from app.schemas.storage import (
    UploadAuthorizationRequest, UploadAuthorizationResponse,
    MediaConfirmRequest, MediaDeleteRequest, ListingMediaStatus, MediaItemDetail
)
from app.integrations.storage.storage_manager import storage_manager
from app.services.ai_service import AIService
from app.services.media_processor import media_processor

router = APIRouter()

ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_VIDEO_MIMES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_DOC_MIMES = {"application/pdf", "image/jpeg", "image/png"}


async def _get_media_status(product: Product, db: AsyncSession) -> ListingMediaStatus:
    stmt_li = select(ListingImage).where(ListingImage.listing_id == product.id).order_by(ListingImage.display_order.asc())
    res_li = await db.execute(stmt_li)
    items = list(res_li.scalars().all())

    # Synchronize any legacy or initial product.images URLs that lack ListingImage records
    existing_urls = {item.url for item in items}
    seeded = False
    for idx, img_url in enumerate(product.images or []):
        if img_url and img_url not in existing_urls:
            li = ListingImage(
                listing_id=product.id,
                storage_key=f"initial/{uuid.uuid4().hex[:8]}",
                url=img_url,
                media_type="image",
                mime_type="image/jpeg",
                size=100000,
                optimized_size=100000,
                status="READY",
                is_primary=(len(items) == 0 and idx == 0),
                display_order=len(items)
            )
            db.add(li)
            items.append(li)
            existing_urls.add(img_url)
            seeded = True
    if seeded:
        await db.commit()

    image_items = [item for item in items if item.media_type != "video"]
    video_items = [item for item in items if item.media_type == "video"]

    ready_images = sum(1 for item in image_items if item.status == "READY")
    pending_images = sum(1 for item in image_items if item.status in ("PENDING_UPLOAD", "UPLOADED", "PROCESSING"))
    failed_images = sum(1 for item in image_items if item.status == "FAILED")
    ready_videos = sum(1 for item in video_items if item.status == "READY")

    total_images = len(image_items)
    total_videos = len(video_items)

    min_images_met = (ready_images >= MINIMUM_PRODUCT_IMAGES)
    max_images_valid = (total_images <= MAXIMUM_PRODUCT_IMAGES)
    max_videos_valid = (total_videos <= MAXIMUM_PRODUCT_VIDEOS)

    can_publish = (
        min_images_met and
        max_images_valid and
        max_videos_valid
    )

    details = [
        MediaItemDetail(
            id=item.id,
            listing_id=item.listing_id,
            url=item.url,
            thumbnail_url=item.thumbnail_url,
            storage_key=item.storage_key,
            media_type=item.media_type,
            status=item.status,
            size=item.size,
            original_size=item.original_size,
            optimized_size=item.optimized_size,
            width=item.width,
            height=item.height,
            duration_seconds=item.duration_seconds,
            is_primary=item.is_primary,
            processing_error=item.processing_error
        )
        for item in items
    ]

    return ListingMediaStatus(
        listing_id=product.id,
        total_images=total_images,
        total_videos=total_videos,
        ready_images=ready_images,
        pending_images=pending_images,
        failed_images=failed_images,
        ready_videos=ready_videos,
        minimum_images_met=min_images_met,
        maximum_images_valid=max_images_valid,
        maximum_videos_valid=max_videos_valid,
        can_publish=can_publish,
        images=product.images or [],
        videos=product.videos or [],
        media_items=details
    )


@router.get("", response_model=List[ProductOut], summary="List and search products")
async def list_products(
    query: Optional[str] = Query(None, description="Search by title, description or HSN"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.is_active == True)

    if query:
        search_fmt = f"%{query}%"
        stmt = stmt.where(
            or_(
                Product.title.ilike(search_fmt),
                Product.description.ilike(search_fmt),
                Product.hsn_code.ilike(search_fmt)
            )
        )

    if category and category != "All":
        stmt = stmt.where(Product.category == category)

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    products = res.scalars().all()
    return products


@router.post("/media/request-upload", response_model=UploadAuthorizationResponse, summary="Request short-lived signed upload authorization")
async def request_media_upload(
    payload: UploadAuthorizationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Issues restricted, short-lived signed upload authorization for client direct-to-storage upload.
    Validates file ownership, MIME type, size limits, and media quotas.
    """
    # 1. Verify business profile ownership
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business profile required to upload listing media."
        )

    biz_id = biz.id if biz else "admin"

    # 2. If listing_id is provided, verify ownership & current media counts
    if payload.listing_id:
        stmt_p = select(Product).where(Product.id == payload.listing_id)
        res_p = await db.execute(stmt_p)
        product = res_p.scalars().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
        if product.business_id != biz_id and current_user.role != RoleEnum.SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this listing.")

        # Check existing quotas
        current_images = product.images or []
        current_videos = product.videos or []

        if payload.media_type == "image" and len(current_images) >= MAXIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Listing already has maximum {MAXIMUM_PRODUCT_IMAGES} images. Delete an image before uploading another."
            )
        if payload.media_type == "video" and len(current_videos) >= MAXIMUM_PRODUCT_VIDEOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Listing already has maximum {MAXIMUM_PRODUCT_VIDEOS} video clips."
            )

    # 3. Validate MIME type
    clean_mime = payload.mime_type.lower().strip()
    if payload.media_type == "image":
        if clean_mime not in ALLOWED_IMAGE_MIMES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image format '{payload.mime_type}'. Supported: JPEG, PNG, WebP."
            )
        if payload.file_size_bytes > settings.MAX_IMAGE_SIZE_BYTES:
            max_mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file size exceeds maximum {max_mb} MB."
            )
    elif payload.media_type == "video":
        if clean_mime not in ALLOWED_VIDEO_MIMES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid video format '{payload.mime_type}'. Supported: MP4, WebM, QuickTime."
            )
        if payload.file_size_bytes > settings.MAX_VIDEO_SIZE_BYTES:
            max_mb = settings.MAX_VIDEO_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file size exceeds maximum {max_mb} MB (short clip under 30s)."
            )
    elif payload.media_type == "document":
        if clean_mime not in ALLOWED_DOC_MIMES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid document format '{payload.mime_type}'. Supported: PDF, JPEG, PNG."
            )

    # 4. Generate unique storage path
    clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', payload.file_name)
    listing_folder = payload.listing_id or "drafts"
    storage_key = f"businesses/{biz_id}/listings/{listing_folder}/{uuid.uuid4().hex[:10]}_{clean_filename}"

    # Select bucket (private vs public)
    bucket = settings.SUPABASE_STORAGE_BUCKET_PRIVATE if payload.is_private else settings.SUPABASE_STORAGE_BUCKET_PUBLIC

    # 5. Request signed upload URL from storage manager
    upload_auth = await storage_manager.request_upload_authorization(
        bucket=bucket,
        path=storage_key,
        content_type=clean_mime,
        expires_in=settings.STORAGE_SIGNED_URL_EXPIRES_SECONDS
    )

    public_url = await storage_manager.get_public_url(bucket=bucket, path=storage_key)

    return UploadAuthorizationResponse(
        upload_url=upload_auth["upload_url"],
        public_url=public_url,
        storage_key=storage_key,
        provider=upload_auth.get("provider", "supabase"),
        bucket=bucket,
        expires_in=upload_auth.get("expires_in", settings.STORAGE_SIGNED_URL_EXPIRES_SECONDS),
        method=upload_auth.get("method", "PUT"),
        headers=upload_auth.get("headers", {}),
        is_mock=upload_auth.get("is_mock", False)
    )


@router.get("/{product_id}", response_model=ProductOut, summary="Get single product by ID")
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
    res = await db.execute(stmt)
    product = res.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductOut, summary="Create a new wholesale product listing")
async def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business profile required to publish products."
        )

    slug = re.sub(r'[^a-zA-Z0-9]+', '-', payload.title.lower()).strip('-') + f"-{uuid.uuid4().hex[:6]}"

    listing_type = ListingType.SERVICE if getattr(payload, "type", "PRODUCT") == "SERVICE" else ListingType.PRODUCT
    initial_status = ListingStatus.DRAFT if payload.is_draft else ListingStatus.SUBMITTED
    is_active_initial = (initial_status == ListingStatus.ACTIVE)

    # Server-side validation of media limits for non-drafts
    images = payload.images or []
    videos = payload.videos or []

    if not payload.is_draft:
        if len(images) < MINIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"A minimum of {MINIMUM_PRODUCT_IMAGES} images are required to submit a listing."
            )
        if len(images) > MAXIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"A maximum of {MAXIMUM_PRODUCT_IMAGES} images are allowed per listing."
            )
        if len(videos) > MAXIMUM_PRODUCT_VIDEOS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"A maximum of {MAXIMUM_PRODUCT_VIDEOS} videos are allowed per listing."
            )

    product = Product(
        business_id=biz.id,
        type=listing_type,
        title=payload.title,
        slug=slug,
        description=payload.description,
        category=payload.category,
        hsn_code=payload.hsn_code,
        gst_rate=payload.gst_rate or 18.0,
        base_price=payload.base_price,
        unit=payload.unit or ("piece" if listing_type == ListingType.PRODUCT else "service"),
        moq=payload.moq,
        stock_quantity=payload.stock_quantity,
        status=initial_status,
        is_active=is_active_initial,
        images=payload.images if payload.images is not None else ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
        videos=videos,
        specifications=payload.specifications or {}
    )
    db.add(product)
    await db.flush()

    if payload.tiered_prices:
        for t in payload.tiered_prices:
            tp = TieredPrice(
                product_id=product.id,
                min_quantity=t.min_quantity,
                max_quantity=t.max_quantity,
                unit_price=t.unit_price
            )
            db.add(tp)

    await db.commit()
    await db.refresh(product)
    
    stmt_reload = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product.id)
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalars().first()


@router.put("/{product_id}", response_model=ProductOut, summary="Update an existing product or service listing")
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Business profile required to edit listings."
        )

    stmt_p = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this listing")

    update_data = payload.model_dump(exclude_unset=True)
    if "tiered_prices" in update_data:
        update_data.pop("tiered_prices")

    # If updating media, enforce limits
    if "images" in update_data and update_data["images"] is not None:
        images_len = len(update_data["images"])
        if product.status in (ListingStatus.ACTIVE, ListingStatus.SUBMITTED, ListingStatus.APPROVED) and images_len < MINIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Published listings must maintain at least {MINIMUM_PRODUCT_IMAGES} images."
            )
        if images_len > MAXIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A maximum of {MAXIMUM_PRODUCT_IMAGES} images are allowed."
            )

    if "videos" in update_data and update_data["videos"] is not None:
        if len(update_data["videos"]) > MAXIMUM_PRODUCT_VIDEOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A maximum of {MAXIMUM_PRODUCT_VIDEOS} videos are allowed."
            )

    for field, val in update_data.items():
        setattr(product, field, val)

    await db.commit()
    await db.refresh(product)
    return product


@router.post("/{product_id}/media/confirm-upload", response_model=ListingMediaStatus, summary="Confirm media upload to listing")
async def confirm_media_upload(
    product_id: str,
    payload: MediaConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Confirms an uploaded asset, attaches it to the product, and updates media records.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Business profile required.")

    stmt_p = select(Product).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if biz and product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    current_images = list(product.images or [])
    current_videos = list(product.videos or [])

    if payload.media_type == "image":
        if len(current_images) >= MAXIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {MAXIMUM_PRODUCT_IMAGES} images already reached."
            )
        if payload.public_url not in current_images:
            current_images.append(payload.public_url)
            product.images = current_images

        # Create/Update ListingImage relational record
        new_img = ListingImage(
            listing_id=product.id,
            storage_key=payload.storage_key,
            url=payload.public_url,
            thumbnail_url=payload.thumbnail_url,
            media_type="image",
            status=payload.status or "READY",
            is_primary=payload.is_primary or (len(current_images) == 1),
            display_order=len(current_images),
            mime_type=payload.mime_type,
            size=payload.file_size_bytes,
            optimized_size=payload.file_size_bytes
        )
        db.add(new_img)

    elif payload.media_type == "video":
        if len(current_videos) >= MAXIMUM_PRODUCT_VIDEOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {MAXIMUM_PRODUCT_VIDEOS} videos already reached."
            )
        if payload.public_url not in current_videos:
            current_videos.append(payload.public_url)
            product.videos = current_videos

        new_vid = ListingImage(
            listing_id=product.id,
            storage_key=payload.storage_key,
            url=payload.public_url,
            thumbnail_url=payload.thumbnail_url,
            media_type="video",
            status=payload.status or "READY",
            is_primary=False,
            display_order=len(current_videos),
            mime_type=payload.mime_type,
            size=payload.file_size_bytes,
            optimized_size=payload.file_size_bytes
        )
        db.add(new_vid)

    await db.commit()
    await db.refresh(product)
    return await _get_media_status(product, db)


@router.post("/{product_id}/media/upload", response_model=ListingMediaStatus, summary="Directly upload and optimize listing media")
async def upload_listing_media(
    product_id: str,
    file: UploadFile = File(...),
    media_type: str = Form("image"),
    is_primary: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct server-side upload and optimization pipeline for Web and Mobile:
    - Images: Strips EXIF/GPS, resizes <= 1200x1200 (no upscaling), converts to WebP,
              adaptive compression (100–250 KB target, 500 KB limit), generates 20–50 KB thumbnail.
    - Videos: 25 MB max, max 30s duration, 720p H.264 MP4 (2–5 MB target, 8 MB limit),
              generates poster thumbnail. NEVER marks video as optimized if FFmpeg fails.
    - Updates states: UPLOADED -> PROCESSING -> READY / FAILED.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Business profile required.")

    stmt_p = select(Product).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if biz and product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    clean_type = media_type.lower().strip()
    raw_bytes = await file.read()
    file_size = len(raw_bytes)
    filename = file.filename or ("upload.jpg" if clean_type == "image" else "upload.mp4")
    content_type = file.content_type or ("image/jpeg" if clean_type == "image" else "video/mp4")

    # Quota validation
    current_images = list(product.images or [])
    current_videos = list(product.videos or [])

    if clean_type == "image":
        if len(current_images) >= MAXIMUM_PRODUCT_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Listing already has maximum {MAXIMUM_PRODUCT_IMAGES} images."
            )
        if file_size > settings.MAX_IMAGE_SIZE_BYTES:
            max_mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file size exceeds maximum {max_mb} MB."
            )

        # Run Image Optimization
        opt_res = media_processor.optimize_image(raw_bytes, original_filename=filename)
        bucket = settings.SUPABASE_STORAGE_BUCKET_PUBLIC

        if opt_res.success:
            unique_base = f"businesses/{product.business_id}/listings/{product.id}/{uuid.uuid4().hex[:10]}"
            main_key = f"{unique_base}.webp"
            thumb_key = f"{unique_base}_thumb.webp"

            main_url = await storage_manager.upload_bytes(
                bucket=bucket,
                path=main_key,
                data=opt_res.optimized_bytes,
                content_type=opt_res.optimized_mime
            )
            thumb_url = None
            if opt_res.thumbnail_bytes:
                thumb_url = await storage_manager.upload_bytes(
                    bucket=bucket,
                    path=thumb_key,
                    data=opt_res.thumbnail_bytes,
                    content_type=opt_res.thumbnail_mime or "image/webp"
                )

            current_images.append(main_url)
            product.images = current_images

            media_rec = ListingImage(
                listing_id=product.id,
                storage_key=main_key,
                url=main_url,
                thumbnail_url=thumb_url,
                thumbnail_key=thumb_key,
                media_type="image",
                status="READY",
                is_primary=is_primary or (len(current_images) == 1),
                display_order=len(current_images),
                mime_type=opt_res.optimized_mime,
                size=opt_res.optimized_size,
                original_size=opt_res.original_size,
                optimized_size=opt_res.optimized_size,
                width=opt_res.width,
                height=opt_res.height
            )
            db.add(media_rec)
        else:
            # Record failed state
            media_rec = ListingImage(
                listing_id=product.id,
                storage_key=f"failed/{uuid.uuid4().hex[:8]}_{filename}",
                url="",
                media_type="image",
                status="FAILED",
                mime_type=content_type,
                size=file_size,
                original_size=file_size,
                processing_error=opt_res.error
            )
            db.add(media_rec)

    elif clean_type == "video":
        if len(current_videos) >= MAXIMUM_PRODUCT_VIDEOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Listing already has maximum {MAXIMUM_PRODUCT_VIDEOS} videos."
            )
        if file_size > settings.MAX_VIDEO_SIZE_BYTES:
            max_mb = settings.MAX_VIDEO_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file size exceeds maximum {max_mb} MB (max 30s duration)."
            )

        # Run Video Optimization (FFmpeg check enforced)
        opt_res = media_processor.optimize_video(raw_bytes, original_filename=filename)
        bucket = settings.SUPABASE_STORAGE_BUCKET_PUBLIC

        if opt_res.success and opt_res.optimized_bytes:
            unique_base = f"businesses/{product.business_id}/listings/{product.id}/{uuid.uuid4().hex[:10]}"
            main_key = f"{unique_base}.mp4"
            thumb_key = f"{unique_base}_poster.webp"

            main_url = await storage_manager.upload_bytes(
                bucket=bucket,
                path=main_key,
                data=opt_res.optimized_bytes,
                content_type=opt_res.optimized_mime or "video/mp4"
            )
            thumb_url = None
            if opt_res.thumbnail_bytes:
                thumb_url = await storage_manager.upload_bytes(
                    bucket=bucket,
                    path=thumb_key,
                    data=opt_res.thumbnail_bytes,
                    content_type=opt_res.thumbnail_mime or "image/webp"
                )

            current_videos.append(main_url)
            product.videos = current_videos

            media_rec = ListingImage(
                listing_id=product.id,
                storage_key=main_key,
                url=main_url,
                thumbnail_url=thumb_url,
                thumbnail_key=thumb_key,
                media_type="video",
                status="READY",
                is_primary=False,
                display_order=len(current_videos),
                mime_type="video/mp4",
                size=opt_res.optimized_size or file_size,
                original_size=opt_res.original_size,
                optimized_size=opt_res.optimized_size,
                duration_seconds=opt_res.duration_seconds
            )
            db.add(media_rec)
        else:
            # Video optimization failed or FFmpeg unavailable (Rule 10: NEVER mark video as ready if failed)
            media_rec = ListingImage(
                listing_id=product.id,
                storage_key=f"failed/{uuid.uuid4().hex[:8]}_{filename}",
                url="",
                media_type="video",
                status="FAILED",
                mime_type=content_type,
                size=file_size,
                original_size=file_size,
                processing_error=opt_res.error or "Video optimization failed."
            )
            db.add(media_rec)

    await db.commit()
    await db.refresh(product)
    return await _get_media_status(product, db)


@router.get("/{product_id}/media/status", response_model=ListingMediaStatus, summary="Get listing media status and ready counts")
async def get_media_status_endpoint(
    product_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt_p = select(Product).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    return await _get_media_status(product, db)


@router.post("/{product_id}/media/{media_id}/retry", response_model=ListingMediaStatus, summary="Retry failed media processing")
async def retry_media_processing(
    product_id: str,
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Business profile required.")

    stmt_p = select(Product).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if biz and product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    stmt_m = select(ListingImage).where((ListingImage.id == media_id) & (ListingImage.listing_id == product.id))
    res_m = await db.execute(stmt_m)
    media_item = res_m.scalars().first()
    if not media_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media item not found.")

    # Mark as PROCESSING while retrying
    media_item.status = "PROCESSING"
    media_item.processing_error = None
    await db.commit()

    # If it was an image without a valid URL, retry is ready for a fresh upload
    if media_item.media_type == "video" and not media_processor.is_ffmpeg_available():
        media_item.status = "FAILED"
        media_item.processing_error = "FFmpeg is not available in the infrastructure to transcode video."
    else:
        # Mark as PENDING_UPLOAD so user can stream replacement
        media_item.status = "PENDING_UPLOAD"

    await db.commit()
    return await _get_media_status(product, db)


@router.delete("/{product_id}/media", response_model=ListingMediaStatus, summary="Delete media item from listing")
async def delete_listing_media(
    product_id: str,
    payload: MediaDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes an image or video from storage and database.
    If image count falls below 4 on an active listing, sets status back to DRAFT.
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Business profile required.")

    stmt_p = select(Product).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if biz and product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    target = payload.url or payload.storage_key
    if not target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide url or storage_key to delete.")

    # Remove from images
    current_images = [img for img in (product.images or []) if img != target and payload.storage_key not in img]
    current_videos = [vid for vid in (product.videos or []) if vid != target and payload.storage_key not in vid]

    product.images = current_images
    product.videos = current_videos

    # Also clean up from ListingImage table if matches
    stmt_li = select(ListingImage).where(
        (ListingImage.listing_id == product.id) &
        ((ListingImage.url == target) | (ListingImage.storage_key == payload.storage_key))
    )
    res_li = await db.execute(stmt_li)
    matching_li = res_li.scalars().all()
    for item in matching_li:
        await db.delete(item)

    # If storage_key was provided, dispatch delete to storage provider
    if payload.storage_key:
        bucket = settings.SUPABASE_STORAGE_BUCKET_PUBLIC
        await storage_manager.delete_file(bucket=bucket, path=payload.storage_key)

    # Protect published listings: demote to DRAFT if below minimum required images
    if len(current_images) < MINIMUM_PRODUCT_IMAGES and product.status in (ListingStatus.ACTIVE, ListingStatus.SUBMITTED):
        product.status = ListingStatus.DRAFT
        product.is_active = False

    await db.commit()
    await db.refresh(product)
    return await _get_media_status(product, db)


@router.post("/{product_id}/publish", response_model=ProductOut, summary="Validate and publish product listing")
async def publish_listing(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validates complete listing requirements before publishing:
    - Minimum 4 READY images mandatory (Rule 1 & Publication Rule)
    - Maximum 10 images allowed (Rule 2)
    - Maximum 2 optional videos allowed (Video Rule 1)
    - Valid base price and MOQ
    """
    stmt = select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    biz = res.scalars().first()
    if not biz and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Business profile required.")

    stmt_p = select(Product).options(selectinload(Product.tiered_prices)).where(Product.id == product_id)
    res_p = await db.execute(stmt_p)
    product = res_p.scalars().first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if biz and product.business_id != biz.id and current_user.role != RoleEnum.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    images = list(product.images or [])
    videos = list(product.videos or [])

    # Check relational ListingImage READY status
    stmt_li = select(ListingImage).where(
        (ListingImage.listing_id == product.id) &
        (ListingImage.media_type != "video") &
        (ListingImage.status == "READY")
    )
    ready_images_records = (await db.execute(stmt_li)).scalars().all()
    ready_count = len(ready_images_records)

    # Backwards compatibility: If no ListingImage records exist yet, but product.images has >= 4 URLs
    if ready_count == 0 and len(images) >= MINIMUM_PRODUCT_IMAGES:
        for idx, img_url in enumerate(images):
            seeded_img = ListingImage(
                listing_id=product.id,
                storage_key=f"businesses/{product.business_id}/listings/{product.id}/seed_{idx}.webp",
                url=img_url,
                media_type="image",
                status="READY",
                mime_type="image/webp",
                size=150000,
                optimized_size=150000,
                is_primary=(idx == 0),
                display_order=idx
            )
            db.add(seeded_img)
        await db.commit()
        ready_count = len(images)

    # Rule 1 & Publication Rule: Minimum 4 READY images mandatory
    if ready_count < MINIMUM_PRODUCT_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A minimum of {MINIMUM_PRODUCT_IMAGES} READY images are required to publish. Currently has {ready_count} ready images."
        )

    if len(images) > MAXIMUM_PRODUCT_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A maximum of {MAXIMUM_PRODUCT_IMAGES} images are allowed. Currently has {len(images)}."
        )

    if len(videos) > MAXIMUM_PRODUCT_VIDEOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A maximum of {MAXIMUM_PRODUCT_VIDEOS} videos are allowed. Currently has {len(videos)}."
        )

    product.status = ListingStatus.ACTIVE
    product.is_active = True
    await db.commit()
    await db.refresh(product)
    return product


@router.post("/ai-assist", response_model=AIListingResponse, summary="AI Product Listing Assistant")
async def ai_listing_assist(payload: AIListingRequest):
    return AIService.generate_listing_metadata(payload)
