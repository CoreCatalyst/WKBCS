/**
 * Noryvanta Business Operations API Service
 * Exclusively for Wholesalers, Distributors, Retailers, and Service Providers.
 */

import apiClient from "./apiClient";
import { BusinessProfile } from "../types";

export interface BusinessRegistrationPayload {
  legal_name: string;
  trade_name?: string;
  owner_name?: string;
  business_type: string;
  business_category: string;
  business_classification?: string;
  description?: string;
  email?: string;
  mobile?: string;
  country: string;
  state: string;
  district?: string;
  city: string;
  postal_code: string;
  address: string;
  gst_number?: string;
  gst_status?: string;
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  terms_version_accepted?: string;
}

export interface BusinessDashboardSummary {
  business: BusinessProfile;
  metrics: {
    total_listings: number;
    active_listings: number;
    orders: number;
    successful_transactions: number;
    gross_sales: number;
    platform_fees: number;
    net_settlement: number;
  };
}

export const businessApi = {
  /**
   * Registers a new business profile with KYC & tax details
   */
  register: async (payload: BusinessRegistrationPayload): Promise<BusinessProfile> => {
    return apiClient.post<BusinessProfile>("/businesses/register", payload);
  },

  /**
   * Retrieves the authenticated user's active business profile
   */
  getMyBusiness: async (): Promise<BusinessProfile> => {
    return apiClient.get<BusinessProfile>("/businesses/me");
  },

  /**
   * Updates business profile fields
   */
  updateMyBusiness: async (payload: Partial<BusinessRegistrationPayload>): Promise<BusinessProfile> => {
    return apiClient.patch<BusinessProfile>("/businesses/me", payload);
  },

  /**
   * Retrieves business dashboard KPIs, platform fees, and gross sales summary
   */
  getDashboardSummary: async (): Promise<BusinessDashboardSummary> => {
    return apiClient.get<BusinessDashboardSummary>("/businesses/dashboard/summary");
  },

  /**
   * Retrieves sanitized public business profile
   */
  getPublicProfile: async (businessId: string): Promise<BusinessProfile> => {
    return apiClient.get<BusinessProfile>(`/businesses/${businessId}/public-profile`);
  },

  /**
   * Retrieves orders received by the business
   */
  getMyOrders: async (): Promise<any[]> => {
    return apiClient.get<any[]>("/businesses/me/orders");
  },

  /**
   * Retrieves settlement transactions and payout history
   */
  getMyTransactions: async (): Promise<any[]> => {
    return apiClient.get<any[]>("/businesses/me/transactions");
  },
};

export default businessApi;
