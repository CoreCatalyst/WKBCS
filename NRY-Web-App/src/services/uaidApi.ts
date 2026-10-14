/**
 * Noryvanta UAID (Universal Account Identifier) API Service
 */

import apiClient from "./apiClient";

export interface MyUAIDResponse {
  uaid?: string;
  user_id: string;
  full_name?: string;
  role: string;
  business_id?: string;
  business_name?: string;
  business_type?: string;
  verification_status?: string;
  is_active: boolean;
  qr_code_url?: string;
}

export interface ResolveUAIDResponse {
  uaid: string;
  trade_name: string;
  legal_name: string;
  business_type: string;
  city?: string;
  state?: string;
  is_verified: boolean;
}

export const uaidApi = {
  /**
   * Retrieves the authenticated user's permanent UAID and QR code link
   */
  getMyUaid: async (): Promise<MyUAIDResponse> => {
    return apiClient.get<MyUAIDResponse>("/uaid/me");
  },

  /**
   * Resolves public business metadata for a given UAID
   */
  resolveUaid: async (uaidString: string): Promise<ResolveUAIDResponse> => {
    return apiClient.get<ResolveUAIDResponse>(`/uaid/resolve/${uaidString}`);
  },
};

export default uaidApi;
