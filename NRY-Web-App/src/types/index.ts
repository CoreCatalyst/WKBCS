/**
 * Noryvanta Shared Frontend Type Definitions
 */

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role: string;
  uaid?: string;
  is_verified: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  role: string;
  has_business_profile: boolean;
}

export type BusinessCategoryType =
  | "Wholesaler"
  | "Distributor"
  | "Retailer"
  | "Services"
  | "Service Provider";

export interface BusinessProfile {
  id: string;
  user_id: string;
  legal_name: string;
  trade_name?: string;
  owner_name?: string;
  business_type: string;
  business_category: string;
  description?: string;
  email?: string;
  mobile?: string;
  country: string;
  state: string;
  district?: string;
  city: string;
  postal_code: string;
  address: string;
  latitude?: number;
  longitude?: number;
  gst_number?: string;
  gst_status?: string;
  pan?: string;
  virtual_escrow_account_id?: string;
  uaid?: string;
  verification_status: string;
  rating?: number;
}

export interface TieredPrice {
  id?: string;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price: number;
}

export interface ProductListing {
  id: string;
  business_id: string;
  type: "PRODUCT" | "SERVICE";
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  category: string;
  subcategory?: string;
  currency: string;
  base_price: number;
  unit?: string;
  hsn_code?: string;
  gst_rate: number;
  moq: number;
  stock_quantity: number;
  availability?: string;
  status: string;
  images: string[];
  videos?: string[];
  specifications?: Record<string, any>;
  tiered_prices?: TieredPrice[];
  created_at?: string;
  merchant?: {
    id: string;
    trade_name: string;
    legal_name: string;
    business_type: string;
    city: string;
    state: string;
    rating: number;
    is_verified: boolean;
    logo?: string;
  };
}

export interface OrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  line_total: number;
  product?: ProductListing;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  business_id: string;
  currency: string;
  subtotal: number;
  gst_total: number;
  customer_charges: number;
  total_customer_payable: number;
  order_status: string;
  payment_status: string;
  payment_method?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface FinancialBreakdown {
  currency: string;
  gross_business_value: number;
  merchant_discount_amount: number;
  platform_discount_amount: number;
  eligible_business_value: number;
  tax_amount: number;
  shipping_amount: number;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  customer_payable_amount: number;
  business_settlement_amount: number;
  tds_amount: number;
  business_type?: string;
}

export interface RewardSummary {
  uaid?: string;
  total_earned: number;
  available_balance: number;
  pending_verification: number;
  total_redeemed: number;
  reversed_rewards: number;
  active_cycle: number;
  current_level: number;
}
