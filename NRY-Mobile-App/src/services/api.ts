import { CustomerUser, ProductItem, CartItem, Address, OrderRecord, RewardStatusData, RankProgression, LevelRecord, RewardLedgerEntry } from '../types';

const API_BASE = '/api/v1/customer';

// Mock seed state for immediate standalone previews
const MOCK_USER: CustomerUser = {
  id: 'usr-demo-customer-1',
  full_name: 'Aditi Deshmukh',
  email: 'aditi.customer@noryvantaglobal.com',
  phone: '+91 7507897697',
  uaid: 'NRY-C-7K4M9X2P8Q',
  role: 'CUSTOMER',
  has_referral: true,
  referrer_uaid: 'NRY-C-3B9R7T1M4K',
  is_reward_eligible: true,
  qualifying_purchase_total: 8000.0,
  current_level: 4,
  current_rank: 'Bronze',
  current_cycle: 1,
  quarterly_status: 'ACTIVE'
};

const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-101',
    title: 'Smart Precision Thermal Air Monitor',
    description: 'Ultra-accurate IoT environment and temperature sensor with real-time analytics and BLE 5.2 connectivity.',
    short_description: 'IoT environment sensor with real-time BLE analytics.',
    category: 'Electronics & Smart Tech',
    base_price: 2499.0,
    currency: 'INR',
    unit: 'unit',
    moq: 1,
    stock_quantity: 48,
    gst_rate: 18.0,
    images: ['https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=600&q=80'],
    specifications: { Battery: '4000mAh', Accuracy: '±0.1°C', Connectivity: 'Bluetooth 5.2' },
    business_id: 'biz-apex-1',
    type: 'PRODUCT'
  },
  {
    id: 'prod-102',
    title: 'Industrial Heavy-Duty Power Station 500W',
    description: 'Portable high-capacity power station with pure sine wave inverter and solar input compatibility.',
    short_description: 'Portable 500W power station with solar charging.',
    category: 'Industrial & Hardware',
    base_price: 18500.0,
    currency: 'INR',
    unit: 'unit',
    moq: 1,
    stock_quantity: 15,
    gst_rate: 18.0,
    images: ['https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80'],
    specifications: { Capacity: '512Wh', Outlets: '4x AC, 2x USB-C PD', Weight: '6.2kg' },
    business_id: 'biz-apex-1',
    type: 'PRODUCT'
  },
  {
    id: 'prod-103',
    title: 'Ergonomic Executive Dual-Motor Desk',
    description: 'Electric height-adjustable desk with memory presets, solid oak tabletop, and anti-collision sensor.',
    short_description: 'Dual-motor electric standing desk with memory presets.',
    category: 'Home & Commercial Office',
    base_price: 24999.0,
    currency: 'INR',
    unit: 'piece',
    moq: 1,
    stock_quantity: 22,
    gst_rate: 18.0,
    images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80'],
    specifications: { HeightRange: '62-128cm', LoadCapacity: '120kg', Warranty: '5 Years' },
    business_id: 'biz-retail-1',
    type: 'PRODUCT'
  },
  {
    id: 'prod-104',
    title: 'Organic Cold-Pressed Himalayan Honey 1kg',
    description: 'Pure multi-flora raw forest honey harvested sustainably from pristine Himalayan foothill apiaries.',
    short_description: '100% pure raw unprocessed Himalayan forest honey.',
    category: 'Organic & Food Essentials',
    base_price: 850.0,
    currency: 'INR',
    unit: 'jar',
    moq: 1,
    stock_quantity: 120,
    gst_rate: 5.0,
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
    specifications: { Weight: '1000g', Origin: 'Himachal Pradesh', Processing: 'Unpasteurized' },
    business_id: 'biz-retail-1',
    type: 'PRODUCT'
  }
];

const MOCK_SERVICES: ProductItem[] = [
  {
    id: 'srv-201',
    title: 'Certified Rooftop Solar Energy Audit & Installation',
    description: 'Complete on-site structural energy assessment, net metering clearance assistance, and warranty installation.',
    short_description: 'Full solar audit, blueprinting & installation by engineers.',
    category: 'Renewable Energy & Solar',
    base_price: 4999.0,
    currency: 'INR',
    unit: 'audit',
    moq: 1,
    stock_quantity: 10,
    gst_rate: 18.0,
    images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80'],
    specifications: { Duration: '3 Hours', Report: '35-Page CAD Report', Cert: 'MNRE Certified' },
    business_id: 'biz-srv-1',
    type: 'SERVICE'
  },
  {
    id: 'srv-202',
    title: 'Commercial Air Quality & HVAC Sanitization Service',
    description: 'Deep duct microbial clean, HEPA filter upgrade, and certified VOC air quality benchmarking.',
    short_description: 'Commercial HVAC duct deep clean and air certification.',
    category: 'Commercial Maintenance',
    base_price: 3499.0,
    currency: 'INR',
    unit: 'service',
    moq: 1,
    stock_quantity: 20,
    gst_rate: 18.0,
    images: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80'],
    specifications: { Duration: '4 Hours', Team: '2 Specialists', Sanitizer: 'Hospital Grade' },
    business_id: 'biz-srv-1',
    type: 'SERVICE'
  }
];

export const apiClient = {
  // Auth
  async requestOtp(phone_or_email: string, channel = 'sms') {
    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_or_email, channel })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to request OTP' }));
      throw new Error(err.detail || 'Failed to dispatch verification OTP');
    }
    return await res.json();
  },

  async verifyOtp(phone_or_email: string, otp_code: string, referral_code?: string) {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_or_email, otp_code, referral_code })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid verification code' }));
      throw new Error(err.detail || 'OTP verification failed');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  },

  async loginWithPassword(identifier: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  },

  async register(payload: { full_name: string; phone?: string; email?: string; password?: string; referral_code?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Customer registration failed');
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  },

  // Profile & UAID
  async getProfile(): Promise<CustomerUser> {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    if (!res.ok) {
      throw new Error('Unable to retrieve profile.');
    }
    return await res.json();
  },

  async getUaid() {
    const res = await fetch(`${API_BASE}/uaid`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      }
    });
    if (!res.ok) {
      throw new Error('Unable to fetch UAID details.');
    }
    return await res.json();
  },

  // Referrals
  async validateReferral(code: string) {
    const res = await fetch(`${API_BASE}/referrals/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ referral_code: code })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid referral code' }));
      return { valid: false, message: err.detail || 'Invalid referral code' };
    }
    return await res.json();
  },

  async applyReferral(code: string) {
    const res = await fetch(`${API_BASE}/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ referral_code: code })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to apply referral' }));
      throw new Error(err.detail || 'Failed to bind referral');
    }
    return await res.json();
  },

  // Marketplace
  async getProducts(): Promise<ProductItem[]> {
    const res = await fetch(`${API_BASE}/marketplace/products`);
    if (!res.ok) {
      throw new Error('Failed to load marketplace products.');
    }
    return await res.json();
  },

  async getServices(): Promise<ProductItem[]> {
    const res = await fetch(`${API_BASE}/marketplace/services`);
    if (!res.ok) {
      throw new Error('Failed to load marketplace services.');
    }
    return await res.json();
  },

  // Rewards Status & Ranks
  async getRewardStatus(): Promise<RewardStatusData> {
    try {
      const res = await fetch(`${API_BASE}/rewards/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) return await res.json();
    } catch {}
    return {
      customer_uaid: 'NRY-C-7K4M9X2P8Q',
      has_valid_referral: true,
      referrer_uaid: 'NRY-C-3B9R7T1M4K',
      qualifying_purchase_total: 8000.0,
      reward_entry_threshold: 2000.0,
      threshold_satisfied: true,
      is_reward_eligible: true,
      current_level: 4,
      completed_levels: 4,
      current_rank: 'Bronze',
      current_cycle: 1,
      current_reward_rate: 1.10,
      wallet: {
        total_earned: 352.0,
        pending: 88.0,
        currency: 'INR'
      },
      quarterly_activity_status: 'ACTIVE',
      missed_quarters_count: 0,
      next_level_cost: 2000.0
    };
  },

  async getRanks(): Promise<RankProgression[]> {
    try {
      const res = await fetch(`${API_BASE}/ranks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) return await res.json();
    } catch {}
    const rankNames = ['Bronze', 'Silver', 'Panna', 'Gold', 'Platinum', 'Ruby', 'Sapphire', 'Emerald', 'Diamond', 'Black Diamond', 'Mythic', 'Legendary'];
    return rankNames.map((name, i) => {
      const num = i + 1;
      const rate = +(1.0 + num * 0.10).toFixed(2);
      return {
        rank_number: num,
        rank_name: name,
        start_level: (num - 1) * 10 + 1,
        end_level: num * 10,
        completion_level: num * 10,
        reward_rate: rate,
        rate_display: `${rate.toFixed(2)}%`,
        is_completed: false,
        is_current: num === 1,
        status: num === 1 ? 'IN_PROGRESS' : 'LOCKED'
      };
    });
  },

  async getLevels(): Promise<LevelRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/levels`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) return await res.json();
    } catch {}
    const levels: LevelRecord[] = [];
    const rankNames = ['Bronze', 'Silver', 'Panna', 'Gold', 'Platinum', 'Ruby', 'Sapphire', 'Emerald', 'Diamond', 'Black Diamond', 'Mythic', 'Legendary'];
    for (let i = 1; i <= 120; i++) {
      const rIdx = Math.min(11, Math.floor((i - 1) / 10));
      levels.push({
        level_number: i,
        rank_name: rankNames[rIdx],
        status: i <= 4 ? 'QUALIFIED' : (i === 5 ? 'IN_PROGRESS' : 'LOCKED'),
        level_required_amount: 2000.0,
        qualification_status: i <= 4 ? 'QUALIFIED' : 'NONE',
        verification_status: i <= 4 ? 'VERIFIED' : 'NONE',
        completed_at: i <= 4 ? '2026-10-10T12:00:00Z' : undefined
      });
    }
    return levels;
  },

  async getRewardLedger(): Promise<RewardLedgerEntry[]> {
    try {
      const res = await fetch(`${API_BASE}/rewards/ledger`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) return await res.json();
    } catch {}
    return [
      {
        id: 'rwd-entry-01',
        cycle_number: 1,
        rank_number: 1,
        rank_name: 'Bronze',
        qualification_level: 10,
        reward_rate: 1.10,
        reward_amount: 242.0,
        currency: 'INR',
        reward_type: 'RANK_COMPLETION',
        status: 'PENDING',
        created_at: '2026-10-12T10:15:00Z'
      }
    ];
  },

  async getOrders(): Promise<OrderRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.ok) return await res.json();
    } catch {}
    return [
      {
        id: 'ord-101',
        order_number: 'ORD-C-20261012-7A9B',
        subtotal: 8000.0,
        gst_total: 1440.0,
        total_amount: 9440.0,
        order_status: 'CONFIRMED',
        payment_status: 'SUCCESSFUL',
        created_at: '2026-10-12T14:30:00Z',
        items_count: 2,
        items: [
          {
            title: 'Smart Precision Thermal Air Monitor',
            quantity: 2,
            unit_price: 2499.0,
            line_total: 4998.0
          },
          {
            title: 'Organic Cold-Pressed Himalayan Honey 1kg',
            quantity: 4,
            unit_price: 850.0,
            line_total: 3400.0
          }
        ]
      }
    ];
  },

  /**
   * Uploads and optimizes media file directly to backend with automatic thumbnail & resizing
   */
  async uploadListingMedia(productId: string, file: File | Blob, isPrimary: boolean = false): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_primary", String(isPrimary));
    const res = await fetch(`${API_BASE}/products/${productId}/media/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to upload and optimize media.");
    }
    return await res.json();
  },

  /**
   * Fetches media status for a product listing
   */
  async getListingMediaStatus(productId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/products/${productId}/media/status`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch media status.");
    }
    return await res.json();
  },

  /**
   * Retries processing for a failed media item
   */
  async retryListingMediaProcessing(productId: string, mediaId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/products/${productId}/media/${mediaId}/retry`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to retry media processing.");
    }
    return await res.json();
  }
};

export const MOBILE_LISTING_MEDIA_RULES = {
  minImages: 4,
  maxImages: 10,
  maxImageSizeBytes: 10 * 1024 * 1024, // 10 MB per image
  maxImageSizeMB: 10,
  maxImageDimension: 1200,
  targetImageSizeMinKB: 100,
  targetImageSizeMaxKB: 250,
  maxOptimizedImageKB: 500,
  thumbnailTargetMinKB: 20,
  thumbnailTargetMaxKB: 50,
  preferredImageFormat: "image/webp",
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],

  minVideos: 0,
  maxVideos: 2,
  maxVideoSizeBytes: 25 * 1024 * 1024, // 25 MB per video
  maxVideoSizeMB: 25,
  recommendedDurationMinSeconds: 10,
  recommendedDurationMaxSeconds: 15,
  maxVideoDurationSeconds: 30,
  targetVideoSizeMinMB: 2,
  targetVideoSizeMaxMB: 5,
  maxOptimizedVideoMB: 8,
  maxVideoResolution: "720p",
  allowedVideoTypes: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

