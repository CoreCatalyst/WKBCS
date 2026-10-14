/**
 * Noryvanta Category Platform Fee Schedule (Section 10)
 * Wholesaler: 3.20%
 * Distributor: 5.20%
 * Retailer: 8.20%
 * Services: 5.20%
 */

export const APPROVED_FEE_SCHEDULE = {
  WHOLESALER: 3.20,
  DISTRIBUTOR: 5.20,
  RETAILER: 8.20,
  SERVICES: 5.20,
  SERVICE_PROVIDER: 5.20,
} as const;

export function getPlatformFeeRate(businessType: string): number {
  const norm = (businessType || "").trim().toUpperCase();
  if (norm.includes("WHOLESALER") || norm.includes("WHOLESALE")) return 3.20;
  if (norm.includes("DISTRIBUTOR")) return 5.20;
  if (norm.includes("RETAILER") || norm.includes("RETAIL")) return 8.20;
  if (norm.includes("SERVICE")) return 5.20;
  return 5.20;
}
