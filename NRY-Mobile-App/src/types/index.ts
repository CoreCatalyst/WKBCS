export type ScreenId =
  | 'onboarding'
  | 'login'
  | 'otp'
  | 'referral_entry'
  | 'products'
  | 'product_detail'
  | 'services'
  | 'service_detail'
  | 'cart'
  | 'checkout'
  | 'payment_status'
  | 'orders'
  | 'order_detail'
  | 'bookings'
  | 'rewards'
  | 'levels'
  | 'ranks'
  | 'cycles'
  | 'reward_ledger'
  | 'quarterly'
  | 'referral_share'
  | 'profile'
  | 'notifications'
  | 'settings'
  | 'support';

export interface CustomerUser {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  uaid: string;
  role: 'CUSTOMER';
  has_referral: boolean;
  referrer_uaid?: string;
  is_reward_eligible: boolean;
  qualifying_purchase_total: number;
  current_level: number;
  current_rank: string;
  current_cycle: number;
  quarterly_status: string;
}

export interface ProductItem {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  category: string;
  subcategory?: string;
  base_price: number;
  currency: string;
  unit: string;
  moq: number;
  stock_quantity: number;
  gst_rate: number;
  images: string[];
  specifications?: Record<string, any>;
  business_id: string;
  type: 'PRODUCT' | 'SERVICE';
}

export interface CartItem {
  item_id: string;
  product_id: string;
  title: string;
  unit_price: number;
  gst_rate: number;
  quantity: number;
  line_total: number;
  images: string[];
}

export interface Address {
  id?: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  postal_code: string;
  is_default?: boolean;
}

export interface OrderRecord {
  id: string;
  order_number: string;
  subtotal: number;
  gst_total: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  items_count: number;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    images?: string[];
  }>;
}

export interface RewardStatusData {
  customer_uaid: string;
  has_valid_referral: boolean;
  referrer_uaid?: string;
  qualifying_purchase_total: number;
  reward_entry_threshold: number;
  threshold_satisfied: boolean;
  is_reward_eligible: boolean;
  current_level: number;
  completed_levels: number;
  current_rank: string;
  current_cycle: number;
  current_reward_rate: number;
  wallet: {
    total_earned: number;
    pending: number;
    currency: string;
    redeemable_points?: number;
    total_earned_points?: number;
    gated_points?: number;
    pending_points?: number;
    redeemed_points?: number;
    reversed_points?: number;
    is_withdrawable?: boolean;
  };
  quarterly_activity_status: string;
  missed_quarters_count: number;
  next_level_cost: number;
}

export interface RankProgression {
  rank_number: number;
  rank_name: string;
  start_level: number;
  end_level: number;
  completion_level: number;
  reward_rate: number;
  rate_display: string;
  is_completed: boolean;
  is_current: boolean;
  status: 'REWARDED' | 'IN_PROGRESS' | 'LOCKED';
}

export interface LevelRecord {
  level_number: number;
  rank_name: string;
  status: string;
  level_required_amount: number;
  qualification_status: string;
  verification_status: string;
  completed_at?: string;
}

export interface RewardLedgerEntry {
  id: string;
  cycle_number: number;
  rank_number: number;
  rank_name: string;
  qualification_level: number;
  reward_rate: number;
  reward_amount: number;
  currency: string;
  reward_type: string;
  status: string;
  created_at: string;
}
