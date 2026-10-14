/**
 * Noryvanta Product Listings & Marketplace API Service
 * Enforces mandatory 4 to 10 images and up to 2 short videos per listing.
 */

import apiClient from "./apiClient";
import { ProductListing, TieredPrice } from "../types";

export interface CreateProductPayload {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  hsn_code?: string;
  gst_rate?: number;
  base_price: number;
  unit?: string;
  moq: number;
  stock_quantity: number;
  images: string[];
  videos?: string[];
  specifications?: Record<string, any>;
  tiered_prices?: TieredPrice[];
  is_draft?: boolean;
}

export interface ProductFilterParams {
  category?: string;
  subcategory?: string;
  business_type?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

export const productApi = {
  /**
   * Lists public marketplace products
   */
  list: async (params?: ProductFilterParams): Promise<ProductListing[]> => {
    return apiClient.get<ProductListing[]>("/marketplace/products", { params });
  },

  /**
   * Retrieves single product detail by ID or slug
   */
  getById: async (id: string): Promise<ProductListing> => {
    return apiClient.get<ProductListing>(`/marketplace/products/${id}`);
  },

  /**
   * Creates a new wholesale product listing with media validation
   */
  create: async (payload: CreateProductPayload): Promise<ProductListing> => {
    if (!payload.is_draft) {
      if (!payload.images || payload.images.length < 4) {
        throw new Error("A minimum of 4 product images is mandatory to publish a listing.");
      }
      if (payload.images.length > 10) {
        throw new Error("A maximum of 10 product images is allowed.");
      }
      if (payload.videos && payload.videos.length > 2) {
        throw new Error("A maximum of 2 video clips is allowed.");
      }
    }
    return apiClient.post<ProductListing>("/products", payload);
  },

  /**
   * Requests AI Listing Assistant to generate structured titles, specs & descriptions
   */
  aiAssist: async (data: {
    raw_text?: string;
    category?: string;
    bullet_points?: string[];
  }): Promise<{
    title: string;
    description: string;
    suggested_category: string;
    suggested_hsn: string;
    key_specifications: Record<string, string>;
  }> => {
    return apiClient.post("/products/ai-assist", data);
  },

  /**
   * Requests short-lived signed upload authorization for direct browser-to-storage upload
   */
  requestMediaUpload: async (payload: {
    media_type: "image" | "video" | "document";
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    listing_id?: string;
    is_private?: boolean;
  }): Promise<{
    upload_url: string;
    public_url: string;
    storage_key: string;
    provider: string;
    bucket: string;
    expires_in: number;
    method: string;
    headers: Record<string, string>;
  }> => {
    return apiClient.post("/products/media/request-upload", payload);
  },

  /**
   * Uploads file directly from the browser to Supabase / S3 storage via short-lived signed URL
   */
  uploadDirectlyToStorage: async (
    uploadUrl: string,
    file: Blob | File,
    contentType: string
  ): Promise<boolean> => {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });
    return res.ok;
  },

  /**
   * Confirms upload and attaches asset to product listing
   */
  confirmMediaUpload: async (
    productId: string,
    payload: {
      storage_key: string;
      public_url: string;
      media_type: "image" | "video";
      mime_type: string;
      file_size_bytes: number;
      is_primary?: boolean;
    }
  ): Promise<{
    listing_id: string;
    total_images: number;
    total_videos: number;
    minimum_images_met: boolean;
    can_publish: boolean;
    images: string[];
    videos: string[];
  }> => {
    return apiClient.post(`/products/${productId}/media/confirm-upload`, payload);
  },

  /**
   * Deletes media item from product listing and storage
   */
  deleteMedia: async (
    productId: string,
    payload: { storage_key?: string; url?: string }
  ): Promise<any> => {
    return apiClient.delete(`/products/${productId}/media`, { data: payload });
  },

  /**
   * Validates and publishes product listing
   */
  publish: async (productId: string): Promise<ProductListing> => {
    return apiClient.post<ProductListing>(`/products/${productId}/publish`, {});
  },
};

export default productApi;

