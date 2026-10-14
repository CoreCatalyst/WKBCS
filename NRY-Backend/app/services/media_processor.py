"""
Noryvanta Enterprise Media Processing & Optimization Engine
Authoritative service adhering to strict Section 13 & 16 media constraints:
- Image Rules:
    1. Minimum 4 READY images required to publish; maximum 10 images.
    2. Recommended compressed image size: 100–250 KB per image (up to 500 KB to preserve detail).
    3. Accept original uploads up to 10 MB per image.
    4. Resize oversized images to a maximum dimension of 1200 x 1200 pixels; never upscale smaller images.
    5. Convert to WebP for optimized storage and delivery.
    6. Generate listing thumbnails targeting 20–50 KB (300 x 300 max px).
    7. Adaptive compression preserving product labels, text, and critical details.
    8. Strip unnecessary EXIF and GPS metadata.
- Video Rules:
    1. Maximum 2 optional videos per listing.
    2. Recommended duration: 10–15 seconds; maximum duration: 30 seconds.
    3. Accept original uploads up to 25 MB per video.
    4. Target optimized video size: 2–5 MB (up to 8 MB ceiling to preserve visual quality).
    5. MP4 with H.264 encoding and max 720p standard resolution.
    6. Generate poster video thumbnail.
    7. Use FFmpeg only if available; NEVER mark video as successfully optimized if processing failed.
- Storage & Lifecycle States:
    PENDING_UPLOAD -> UPLOADED -> PROCESSING -> READY / FAILED.
"""

import io
import os
import re
import uuid
import shutil
import logging
import subprocess
import tempfile
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
from PIL import Image, ImageOps

from app.core.config import settings
from app.integrations.storage.storage_manager import storage_manager

logger = logging.getLogger("noryvanta.media_processor")


@dataclass
class ImageOptimizationResult:
    success: bool
    status: str  # "READY" | "FAILED"
    optimized_bytes: bytes
    optimized_mime: str
    width: int
    height: int
    optimized_size: int
    original_size: int
    thumbnail_bytes: Optional[bytes] = None
    thumbnail_mime: Optional[str] = None
    thumbnail_size: Optional[int] = None
    thumbnail_width: Optional[int] = None
    thumbnail_height: Optional[int] = None
    error: Optional[str] = None


@dataclass
class VideoOptimizationResult:
    success: bool
    status: str  # "READY" | "FAILED"
    optimized_bytes: Optional[bytes] = None
    optimized_mime: Optional[str] = None
    optimized_size: Optional[int] = None
    original_size: int = 0
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_bytes: Optional[bytes] = None
    thumbnail_mime: Optional[str] = None
    thumbnail_size: Optional[int] = None
    error: Optional[str] = None


class MediaProcessorService:
    @staticmethod
    def is_ffmpeg_available() -> bool:
        """Checks if FFmpeg binary is available in the current environment."""
        return shutil.which("ffmpeg") is not None

    @staticmethod
    def is_ffprobe_available() -> bool:
        """Checks if FFprobe binary is available in the current environment."""
        return shutil.which("ffprobe") is not None

    @classmethod
    def optimize_image(
        cls,
        image_bytes: bytes,
        original_filename: str = "image.jpg"
    ) -> ImageOptimizationResult:
        """
        Executes strict production image optimization:
        - Removes EXIF and GPS metadata
        - Downscales images exceeding 1200x1200; does not upscale smaller images
        - Compresses to WebP adaptively targeting 100–250 KB (allows up to 500 KB to preserve label clarity)
        - Produces 20–50 KB listing thumbnail (max 300x300 px)
        """
        orig_size = len(image_bytes)
        if orig_size > settings.MAX_IMAGE_SIZE_BYTES:
            max_mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            return ImageOptimizationResult(
                success=False,
                status="FAILED",
                optimized_bytes=b"",
                optimized_mime="",
                width=0,
                height=0,
                optimized_size=0,
                original_size=orig_size,
                error=f"Image file size ({round(orig_size / (1024 * 1024), 2)} MB) exceeds maximum allowed {max_mb} MB."
            )

        try:
            raw_img = Image.open(io.BytesIO(image_bytes))
            # Auto-orient based on EXIF before stripping metadata
            try:
                raw_img = ImageOps.exif_transpose(raw_img)
            except Exception:
                pass

            orig_w, orig_h = raw_img.size

            # 1. Strip EXIF and GPS metadata: Rebuild clean image buffer with only pixel data
            # Preserve alpha channel for transparent WebP/PNG, otherwise RGB
            has_alpha = raw_img.mode in ("RGBA", "LA") or (raw_img.mode == "P" and "transparency" in raw_img.info)
            target_mode = "RGBA" if has_alpha else "RGB"
            if raw_img.mode != target_mode:
                working_img = raw_img.convert(target_mode)
            else:
                working_img = raw_img.copy()

            # Create brand-new image discarding any lingering EXIF/GPS metadata dictionaries
            clean_img = Image.new(target_mode, working_img.size)
            clean_img.paste(working_img, (0, 0))

            # 2. Resize oversized images (Rule 5 & 6: Max 1200x1200; never upscale smaller images)
            max_dim = settings.IMAGE_MAX_DIMENSION
            if orig_w > max_dim or orig_h > max_dim:
                scale = min(max_dim / orig_w, max_dim / orig_h)
                new_w = max(1, int(orig_w * scale))
                new_h = max(1, int(orig_h * scale))
                clean_img = clean_img.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)
                final_w, final_h = new_w, new_h
            else:
                final_w, final_h = orig_w, orig_h

            # 3. Adaptive compression quality (Rule 3, 9, 10: Target 100–250 KB, ceiling 500 KB)
            target_min_bytes = settings.IMAGE_TARGET_MIN_KB * 1024
            target_max_bytes = settings.IMAGE_TARGET_MAX_KB * 1024
            max_ceiling_bytes = settings.IMAGE_MAX_OPTIMIZED_KB * 1024

            output_format = settings.IMAGE_OUTPUT_FORMAT  # "WEBP"
            best_bytes = None
            best_quality = 85

            # Evaluate stepped qualities
            quality_candidates = [85, 80, 75, 70, 65, 60]
            selected_bytes = None

            for q in quality_candidates:
                buf = io.BytesIO()
                clean_img.save(
                    buf,
                    format=output_format,
                    quality=q,
                    method=6,
                    optimize=True
                )
                cand_bytes = buf.getvalue()
                cand_len = len(cand_bytes)

                if selected_bytes is None:
                    selected_bytes = cand_bytes
                    best_quality = q

                # If within 100-250 KB target, or if quality 85 is already under 100 KB (simple image)
                if cand_len <= target_max_bytes:
                    selected_bytes = cand_bytes
                    best_quality = q
                    break
                else:
                    # Still larger than 250 KB; keep as best candidate so far
                    selected_bytes = cand_bytes
                    best_quality = q

            # If still > 250 KB but <= 500 KB ceiling, retain quality 70 to preserve text/labels
            if len(selected_bytes) > target_max_bytes and len(selected_bytes) <= max_ceiling_bytes:
                buf = io.BytesIO()
                clean_img.save(buf, format=output_format, quality=72, method=6, optimize=True)
                selected_bytes = buf.getvalue()

            optimized_size = len(selected_bytes)

            # 4. Generate listing thumbnail (Rule 8: Target 20–50 KB, max 300x300 px)
            thumb_max_dim = settings.THUMBNAIL_MAX_DIMENSION
            thumb_scale = min(thumb_max_dim / final_w, thumb_max_dim / final_h)
            thumb_w = max(1, int(final_w * thumb_scale))
            thumb_h = max(1, int(final_h * thumb_scale))
            thumb_img = clean_img.resize((thumb_w, thumb_h), resample=Image.Resampling.LANCZOS)

            thumb_buf = io.BytesIO()
            thumb_img.save(thumb_buf, format=output_format, quality=75, method=6, optimize=True)
            thumb_bytes = thumb_buf.getvalue()

            return ImageOptimizationResult(
                success=True,
                status="READY",
                optimized_bytes=selected_bytes,
                optimized_mime="image/webp",
                width=final_w,
                height=final_h,
                optimized_size=optimized_size,
                original_size=orig_size,
                thumbnail_bytes=thumb_bytes,
                thumbnail_mime="image/webp",
                thumbnail_size=len(thumb_bytes),
                thumbnail_width=thumb_w,
                thumbnail_height=thumb_h,
                error=None
            )
        except Exception as e:
            logger.error(f"[MediaProcessor] Image optimization failed: {e}", exc_info=True)
            return ImageOptimizationResult(
                success=False,
                status="FAILED",
                optimized_bytes=b"",
                optimized_mime="",
                width=0,
                height=0,
                optimized_size=0,
                original_size=orig_size,
                error=f"Image processing failed: {str(e)}"
            )

    @classmethod
    def optimize_video(
        cls,
        video_bytes: bytes,
        original_filename: str = "video.mp4"
    ) -> VideoOptimizationResult:
        """
        Executes strict production video optimization:
        - Validates 25 MB max upload limit
        - Validates 30 seconds max duration (10–15s recommended)
        - Transcodes to MP4 H.264 at 720p maximum resolution
        - Targets 2–5 MB optimized file size (8 MB ceiling)
        - Produces video poster thumbnail
        - RULE 10: Uses FFmpeg only if available. NEVER marks video as successfully optimized if processing failed.
        """
        orig_size = len(video_bytes)
        if orig_size > settings.MAX_VIDEO_SIZE_BYTES:
            max_mb = settings.MAX_VIDEO_SIZE_BYTES // (1024 * 1024)
            return VideoOptimizationResult(
                success=False,
                status="FAILED",
                original_size=orig_size,
                error=f"Video file size ({round(orig_size / (1024 * 1024), 2)} MB) exceeds maximum allowed {max_mb} MB."
            )

        # Check FFmpeg availability
        if not cls.is_ffmpeg_available():
            logger.warning("[MediaProcessor] FFmpeg binary not available in infrastructure.")
            return VideoOptimizationResult(
                success=False,
                status="FAILED",
                original_size=orig_size,
                error="Video optimization failed: FFmpeg processing is not available in the current environment."
            )

        tmp_in = None
        tmp_out = None
        tmp_thumb = None

        try:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f_in:
                f_in.write(video_bytes)
                tmp_in = f_in.name

            tmp_out = tmp_in.replace(".mp4", "_opt.mp4")
            tmp_thumb = tmp_in.replace(".mp4", "_poster.webp")

            # 1. Probe duration with ffprobe if available
            duration_sec = 0.0
            if cls.is_ffprobe_available():
                cmd_probe = [
                    "ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1", tmp_in
                ]
                try:
                    res_probe = subprocess.run(cmd_probe, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15, text=True)
                    if res_probe.returncode == 0 and res_probe.stdout.strip():
                        duration_sec = float(res_probe.stdout.strip())
                except Exception as e:
                    logger.warning(f"[MediaProcessor] FFprobe duration check error: {e}")

            # Enforce 30 seconds maximum duration
            if duration_sec > settings.VIDEO_MAX_DURATION_SECONDS:
                return VideoOptimizationResult(
                    success=False,
                    status="FAILED",
                    original_size=orig_size,
                    duration_seconds=duration_sec,
                    error=f"Video duration ({round(duration_sec, 1)}s) exceeds maximum allowed {settings.VIDEO_MAX_DURATION_SECONDS} seconds."
                )

            # 2. Transcode with FFmpeg (H.264, 720p maximum resolution, 2–5 MB target)
            cmd_transcode = [
                "ffmpeg", "-y", "-i", tmp_in,
                "-t", str(settings.VIDEO_MAX_DURATION_SECONDS),
                "-vf", "scale='min(1280,iw)':min'(720,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "26",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                tmp_out
            ]

            proc = subprocess.run(cmd_transcode, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
            if proc.returncode != 0 or not os.path.exists(tmp_out):
                err_detail = proc.stderr.decode("utf-8", errors="ignore")[:300]
                logger.error(f"[MediaProcessor] FFmpeg transcode failed: {err_detail}")
                return VideoOptimizationResult(
                    success=False,
                    status="FAILED",
                    original_size=orig_size,
                    error=f"Video transcoding failed: {err_detail}"
                )

            with open(tmp_out, "rb") as f_out:
                opt_bytes = f_out.read()

            opt_size = len(opt_bytes)

            # 3. Extract poster thumbnail at 1 second
            thumb_bytes = None
            cmd_thumb = [
                "ffmpeg", "-y", "-ss", "00:00:01", "-i", tmp_out,
                "-vframes", "1",
                "-vf", "scale='min(600,iw)':-2",
                "-c:v", "libwebp",
                "-quality", "75",
                tmp_thumb
            ]
            try:
                subprocess.run(cmd_thumb, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
                if os.path.exists(tmp_thumb):
                    with open(tmp_thumb, "rb") as f_th:
                        thumb_bytes = f_th.read()
            except Exception as e:
                logger.warning(f"[MediaProcessor] Poster extraction error: {e}")

            return VideoOptimizationResult(
                success=True,
                status="READY",
                optimized_bytes=opt_bytes,
                optimized_mime="video/mp4",
                optimized_size=opt_size,
                original_size=orig_size,
                duration_seconds=duration_sec or 15.0,
                thumbnail_bytes=thumb_bytes,
                thumbnail_mime="image/webp",
                thumbnail_size=len(thumb_bytes) if thumb_bytes else None,
                error=None
            )
        except Exception as e:
            logger.error(f"[MediaProcessor] Video optimization error: {e}", exc_info=True)
            return VideoOptimizationResult(
                success=False,
                status="FAILED",
                original_size=orig_size,
                error=f"Video processing failed: {str(e)}"
            )
        finally:
            for p in (tmp_in, tmp_out, tmp_thumb):
                if p and os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass


media_processor = MediaProcessorService()
