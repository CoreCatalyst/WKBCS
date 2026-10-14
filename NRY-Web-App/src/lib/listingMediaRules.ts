/**
 * Noryvanta Listing Media Rules & Constraints
 * Authoritative business rules for Product & Service media:
 * - Images: 4–10 required/allowed, JPG/PNG/WEBP, max 5 MB, min 800x800px.
 * - Videos: 0–2 optional, MP4/WEBM, hard upload limit 20 MB, max 30s.
 * - Separate Upload and Processing state machines.
 * - Replacement: safe 1-for-1, existing media preserved until replacement is READY.
 * - Deletion: Minimum 4 READY images strictly enforced (replacement offered at 4).
 */

export const LISTING_MEDIA_RULES = {
  // Images: 4-10 mandatory, 100-250 KB target (up to 500 KB ceiling), 10 MB upload limit, max 1200x1200px (no upscaling)
  minImages: 4,
  maxImages: 10,
  maxImageSizeBytes: 10 * 1024 * 1024, // 10 MB per image
  maxImageSizeMB: 10,
  maxImageDimension: 1200,
  minImageWidth: 200,
  minImageHeight: 200,
  targetImageSizeMinKB: 100,
  targetImageSizeMaxKB: 250,
  maxOptimizedImageKB: 500,
  thumbnailTargetMinKB: 20,
  thumbnailTargetMaxKB: 50,
  preferredImageFormat: "image/webp",
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedImageExtensions: [".jpg", ".jpeg", ".png", ".webp"],

  // Videos: 0-2 optional, 10-15s recommended (30s max), 25 MB upload limit, 2-5 MB target (8 MB ceiling), 720p H.264
  minVideos: 0,
  maxVideos: 2,
  maxVideoSizeBytes: 25 * 1024 * 1024, // 25 MB upload limit
  maxVideoSizeMB: 25,
  recommendedDurationMinSeconds: 10,
  recommendedDurationMaxSeconds: 15,
  maxVideoDurationSeconds: 30,
  targetVideoSizeMinMB: 2,
  targetVideoSizeMaxMB: 5,
  maxOptimizedVideoMB: 8,
  maxVideoResolution: "720p",
  maxVideoResolutionWidth: 1280,
  maxVideoResolutionHeight: 720,
  allowedVideoTypes: ["video/mp4", "video/webm", "video/quicktime"],
  allowedVideoExtensions: [".mp4", ".webm", ".mov"],
} as const;

export type UploadState =
  | "PENDING_UPLOAD"
  | "UPLOADING"
  | "UPLOADED"
  | "UPLOAD_FAILED"
  | "CANCELLED";

export type ProcessingState =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "NOT_STARTED"
  | "PROCESSING_FAILED";

export interface MediaItem {
  id: string;
  url: string;
  originalFilename: string;
  originalSize: number;
  mimeType: string;
  type: "IMAGE" | "VIDEO";
  uploadState: UploadState;
  processingState: ProcessingState;
  width?: number;
  height?: number;
  duration?: number; // in seconds for videos
  thumbnailUrl?: string;
  isPrimary?: boolean;
  uploadProgress?: number; // 0-100
  processingProgress?: number; // 0-100
  errorMessage?: string;
}

export function isMediaReady(media: MediaItem): boolean {
  return media.uploadState === "UPLOADED" && media.processingState === "READY";
}

/**
 * Validate an Image file strictly against Section 16 rules.
 */
export async function validateImageFile(
  file: File,
  existingFiles: MediaItem[] = []
): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
  // 1. Format Check
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const isTypeAllowed = LISTING_MEDIA_RULES.allowedImageTypes.includes(mimeType as any) ||
    LISTING_MEDIA_RULES.allowedImageExtensions.includes(extension as any);

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: "Unsupported image format. Please upload JPG, PNG, or WEBP images.",
    };
  }

  // 2. File Size Check (10 MB Limit)
  if (file.size > LISTING_MEDIA_RULES.maxImageSizeBytes) {
    return {
      valid: false,
      error: `Image is too large. Maximum file size is ${LISTING_MEDIA_RULES.maxImageSizeMB} MB per image.`,
    };
  }

  // 3. Duplicate Detection
  const isDuplicate = existingFiles.some(
    (item) =>
      item.type === "IMAGE" &&
      item.originalFilename === file.name &&
      item.originalSize === file.size
  );
  if (isDuplicate) {
    return {
      valid: false,
      error: "This image has already been uploaded. Please choose a different image.",
    };
  }

  // 4. Dimension Check (Min 200x200)
  try {
    const dimensions = await getImageDimensions(file);
    if (
      dimensions.width < LISTING_MEDIA_RULES.minImageWidth ||
      dimensions.height < LISTING_MEDIA_RULES.minImageHeight
    ) {
      return {
        valid: false,
        error: `Image resolution is too low (${dimensions.width}×${dimensions.height}). Minimum dimension is ${LISTING_MEDIA_RULES.minImageWidth} × ${LISTING_MEDIA_RULES.minImageHeight} pixels.`,
      };
    }
    return { valid: true, width: dimensions.width, height: dimensions.height };
  } catch {
    return {
      valid: false,
      error: "Failed to read image dimensions. Please ensure the file is a valid image.",
    };
  }
}

/**
 * Validate a Video file strictly against rules:
 * - Upload limit: 25 MB
 * - Max duration: 30 seconds
 * - Format: MP4 / WEBM / MOV
 */
export async function validateVideoFile(
  file: File,
  existingFiles: MediaItem[] = []
): Promise<{ valid: boolean; error?: string; duration?: number; width?: number; height?: number }> {
  // 1. Format Check
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const isTypeAllowed = LISTING_MEDIA_RULES.allowedVideoTypes.includes(mimeType as any) ||
    LISTING_MEDIA_RULES.allowedVideoExtensions.includes(extension as any);

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: "Unsupported video format. Please upload MP4 or WEBM video.",
    };
  }

  // 2. 25 MB Upload Limit
  if (file.size > LISTING_MEDIA_RULES.maxVideoSizeBytes) {
    return {
      valid: false,
      error: `Video is too large. Maximum upload size is ${LISTING_MEDIA_RULES.maxVideoSizeMB} MB per video.`,
    };
  }

  // 3. Duplicate Detection
  const isDuplicate = existingFiles.some(
    (item) =>
      item.type === "VIDEO" &&
      item.originalFilename === file.name &&
      item.originalSize === file.size
  );
  if (isDuplicate) {
    return {
      valid: false,
      error: "This video has already been uploaded. Please choose a different video.",
    };
  }

  // 4. Video Duration & Dimension Check
  try {
    const meta = await getVideoMetadata(file);
    if (meta.duration > LISTING_MEDIA_RULES.maxVideoDurationSeconds) {
      return {
        valid: false,
        error: `Video duration is ${Math.round(meta.duration)} seconds. Each video can be up to 30 seconds.`,
      };
    }
    return { valid: true, duration: meta.duration, width: meta.width, height: meta.height };
  } catch {
    return {
      valid: false,
      error: "Unable to verify video duration. Please upload a standard MP4 video.",
    };
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

function getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video metadata read failed"));
    };
    video.src = url;
  });
}
