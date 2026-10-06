/**
 * Centralized Noryvanta Business Platform Fee Configuration
 * Source of truth for business-side platform fee calculations and UI rendering.
 *
 * EXACT BUSINESS PLATFORM FEES:
 * - Wholesaler:  3.20%
 * - Distributor: 5.20%
 * - Services:    5.20%
 * - Retailer:    8.20%
 *
 * NOTE: Registration and listing remain 100% FREE.
 * Platform fee is charged strictly to the registered business upon successful transactions.
 * Platform fee is NEVER charged to customers.
 */

export interface PlatformFeeTier {
  businessType: "Wholesaler" | "Distributor" | "Services" | "Retailer";
  ratePercentage: number; // e.g. 3.20
  rateDecimal: number;    // e.g. 0.032
  label: string;
  description: string;
}

export const PLATFORM_FEE_RATES = {
  WHOLESALER: 3.20,
  DISTRIBUTOR: 5.20,
  SERVICES: 5.20,
  RETAILER: 8.20,
} as const;

export const PLATFORM_FEE_SCHEDULE: PlatformFeeTier[] = [
  {
    businessType: "Wholesaler",
    ratePercentage: 3.20,
    rateDecimal: 0.032,
    label: "Wholesaler",
    description: "Wholesale & bulk supplier platform transactions"
  },
  {
    businessType: "Distributor",
    ratePercentage: 5.20,
    rateDecimal: 0.052,
    label: "Distributor",
    description: "Regional & national distribution networks"
  },
  {
    businessType: "Services",
    ratePercentage: 5.20,
    rateDecimal: 0.052,
    label: "Services",
    description: "Commercial, industrial & professional service providers"
  },
  {
    businessType: "Retailer",
    ratePercentage: 8.20,
    rateDecimal: 0.082,
    label: "Retailer",
    description: "Retail merchants & commercial store operators"
  },
];

/**
 * Resolves the platform fee percentage for a given business category or type.
 * Normalizes input strings (handling aliases like "Shop", "Manufacturer", "Service Provider").
 */
export function getPlatformFeeRateForType(businessType?: string): number {
  if (!businessType) return PLATFORM_FEE_RATES.SERVICES;
  const normalized = businessType.trim().toLowerCase();

  if (normalized.includes("whole") || normalized.includes("manufac")) {
    return PLATFORM_FEE_RATES.WHOLESALER; // 3.20%
  }
  if (normalized.includes("distrib")) {
    return PLATFORM_FEE_RATES.DISTRIBUTOR; // 5.20%
  }
  if (normalized.includes("retail") || normalized.includes("shop")) {
    return PLATFORM_FEE_RATES.RETAILER; // 8.20%
  }
  if (normalized.includes("service")) {
    return PLATFORM_FEE_RATES.SERVICES; // 5.20%
  }
  // Default to standard services tier if unrecognized (never 10%)
  return PLATFORM_FEE_RATES.SERVICES;
}

/**
 * Calculates business-side platform fee and net settlement for an order.
 * Follows the approved financial architecture:
 * - Gross Transaction (subtotal)
 * - Platform Fee = Gross * (Rate / 100)
 * - GST on Platform Fee = 18% of Platform Fee
 * - Net Settlement = Gross - (Platform Fee + GST on Fee)
 */
export function calculatePlatformFee(grossAmount: number, businessType?: string) {
  const feeRatePercentage = getPlatformFeeRateForType(businessType);
  const feeRate = feeRatePercentage / 100;
  const feeAmount = grossAmount * feeRate;
  const gstOnFee = feeAmount * 0.18; // 18% GST on platform service fee
  const totalDeductions = feeAmount + gstOnFee;
  const netSettlement = grossAmount - totalDeductions;

  return {
    grossAmount,
    feeRatePercentage,
    feeRate,
    feeAmount: Math.round(feeAmount),
    gstOnFee: Math.round(gstOnFee),
    totalDeductions: Math.round(totalDeductions),
    netSettlement: Math.round(netSettlement)
  };
}
