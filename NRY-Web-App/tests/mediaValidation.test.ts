/**
 * Frontend Media Rule Contract Tests
 * Validates invariant: Minimum 4 images mandatory, maximum 10 images, max 2 videos.
 */

import { validateListingMedia } from "../src/utils/mediaValidation";

describe("Frontend Listing Media Rules", () => {
  it("rejects listing with fewer than 4 images when not a draft", () => {
    const res = validateListingMedia(["img1.jpg", "img2.jpg", "img3.jpg"], []);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("minimum of 4");
  });

  it("accepts listing with between 4 and 10 images", () => {
    const images = ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg"];
    const res = validateListingMedia(images, ["video1.mp4"]);
    expect(res.isValid).toBe(true);
  });

  it("rejects listing with more than 10 images", () => {
    const images = Array.from({ length: 11 }, (_, i) => `img${i}.jpg`);
    const res = validateListingMedia(images, []);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("maximum of 10");
  });

  it("rejects listing with more than 2 videos", () => {
    const images = ["img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg"];
    const videos = ["vid1.mp4", "vid2.mp4", "vid3.mp4"];
    const res = validateListingMedia(images, videos);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("maximum of 2 video clips");
  });

  it("allows draft listing with fewer than 4 images", () => {
    const res = validateListingMedia(["img1.jpg"], [], true);
    expect(res.isValid).toBe(true);
  });
});
