/**
 * Currency Formatting Helpers
 */

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
