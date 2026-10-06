import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("noryvanta_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("noryvanta_access_token");
      localStorage.removeItem("noryvanta_user");
    }
    return Promise.reject(error);
  }
);

/* =========================================================================
   Marketplace Types & Endpoints (Consumable by Web, Mobile, Admin)
   ========================================================================= */

export interface MarketplaceMerchant {
  id: string;
  trade_name: string;
  legal_name?: string;
  business_type: string;
  business_category: string;
  city?: string;
  state?: string;
  country: string;
  rating: number;
  is_verified: boolean;
  logo?: string;
}

export interface MarketplaceListing {
  id: string;
  business_id: string;
  type: "PRODUCT" | "SERVICE";
  title: string;
  slug: string;
  short_description?: string;
  description: string;
  category: string;
  subcategory?: string;
  currency: string;
  base_price: number;
  unit: string;
  hsn_code?: string;
  gst_rate: number;
  moq: number;
  stock_quantity: number;
  availability: string;
  status: string;
  images: string[];
  specifications: Record<string, any>;
  tiered_prices: Array<{
    min_quantity: number;
    max_quantity?: number | null;
    unit_price: number;
  }>;
  created_at: string;
  merchant?: MarketplaceMerchant;
  shipping_info?: Record<string, any>;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
  product_count: number;
  service_count: number;
  total_listings: number;
}

export interface MarketplaceFeaturedResponse {
  products: MarketplaceListing[];
  services: MarketplaceListing[];
}

export interface MarketplaceSearchResponse {
  items: MarketplaceListing[];
  total: number;
  product_count: number;
  service_count: number;
  page: number;
  limit: number;
}

export async function fetchMarketplaceFeatured(): Promise<MarketplaceFeaturedResponse> {
  const res = await api.get<MarketplaceFeaturedResponse>("/marketplace/featured");
  return res.data;
}

export async function fetchMarketplaceProducts(params?: {
  category?: string;
  subcategory?: string;
  business_type?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
}): Promise<MarketplaceListing[]> {
  const res = await api.get<MarketplaceListing[]>("/marketplace/products", { params });
  return res.data;
}

export async function fetchMarketplaceProductById(productId: string): Promise<MarketplaceListing> {
  const res = await api.get<MarketplaceListing>(`/marketplace/products/${productId}`);
  return res.data;
}

export async function fetchMarketplaceServices(params?: {
  category?: string;
  service_provider_type?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
}): Promise<MarketplaceListing[]> {
  const res = await api.get<MarketplaceListing[]>("/marketplace/services", { params });
  return res.data;
}

export async function fetchMarketplaceServiceById(serviceId: string): Promise<MarketplaceListing> {
  const res = await api.get<MarketplaceListing>(`/marketplace/services/${serviceId}`);
  return res.data;
}

export async function fetchMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  const res = await api.get<MarketplaceCategory[]>("/marketplace/categories");
  return res.data;
}

export async function searchMarketplace(
  q: string,
  type: "ALL" | "PRODUCT" | "SERVICE" = "ALL",
  category?: string,
  city?: string
): Promise<MarketplaceSearchResponse> {
  const res = await api.get<MarketplaceSearchResponse>("/marketplace/search", {
    params: { q, type, category, city }
  });
  return res.data;
}
