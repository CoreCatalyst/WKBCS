/**
 * Category Platform Fee Schedule Tests
 * Validates approved schedule:
 * Wholesaler: 3.20%
 * Distributor: 5.20%
 * Retailer: 8.20%
 * Services: 5.20%
 */

import { getPlatformFeeRate, APPROVED_FEE_SCHEDULE } from "../src/utils/feeSchedule";

describe("Category Platform Fee Schedule Rules", () => {
  it("enforces 3.20% for Wholesaler", () => {
    expect(getPlatformFeeRate("Wholesaler")).toBe(3.20);
    expect(APPROVED_FEE_SCHEDULE.WHOLESALER).toBe(3.20);
  });

  it("enforces 5.20% for Distributor", () => {
    expect(getPlatformFeeRate("Distributor")).toBe(5.20);
    expect(APPROVED_FEE_SCHEDULE.DISTRIBUTOR).toBe(5.20);
  });

  it("enforces 8.20% for Retailer", () => {
    expect(getPlatformFeeRate("Retailer")).toBe(8.20);
    expect(APPROVED_FEE_SCHEDULE.RETAILER).toBe(8.20);
  });

  it("enforces 5.20% for Services / Service Provider", () => {
    expect(getPlatformFeeRate("Services")).toBe(5.20);
    expect(getPlatformFeeRate("Service Provider")).toBe(5.20);
    expect(APPROVED_FEE_SCHEDULE.SERVICES).toBe(5.20);
  });
});
