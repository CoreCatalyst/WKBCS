/**
 * Noryvanta Media Listing Rule Validator (Section 13)
 * Invariant: Minimum 4 product/service images mandatory, maximum 10 images allowed.
 * Maximum 2 short video clips allowed.
 */

export interface MediaValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateListingMedia(
  images: string[],
  videos?: string[],
  isDraft: boolean = false
): MediaValidationResult {
  if (isDraft) {
    return { isValid: true };
  }

  const cleanImages = (images || []).filter((url) => url && url.trim().length > 0);
  const cleanVideos = (videos || []).filter((url) => url && url.trim().length > 0);

  if (cleanImages.length < 4) {
    return {
      isValid: false,
      error: `A minimum of 4 product/service images is mandatory. You provided ${cleanImages.length}.`,
    };
  }

  if (cleanImages.length > 10) {
    return {
      isValid: false,
      error: `A maximum of 10 images is permitted per listing. You provided ${cleanImages.length}.`,
    };
  }

  if (cleanVideos.length > 2) {
    return {
      isValid: false,
      error: `A maximum of 2 short video clips is permitted. You provided ${cleanVideos.length}.`,
    };
  }

  return { isValid: true };
}
