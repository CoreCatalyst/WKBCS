/**
 * Noryvanta Authentication API Service
 * Handles OTP request/verification, Google SSO, token rotation, and current user retrieval.
 */

import apiClient from "./apiClient";
import tokenStore from "./tokenStore";
import { AuthTokens, UserProfile } from "../types";

export interface OTPRequestPayload {
  identifier: string;
  channel?: "SMS" | "EMAIL" | "WHATSAPP";
  turnstile_token?: string;
}

export interface OTPResponseData {
  success: boolean;
  message: string;
  ttl_seconds: number;
  dev_otp_preview?: string;
}

export interface OTPVerifyPayload {
  identifier: string;
  otp_code: string;
  full_name?: string;
  role?: string;
  turnstile_token?: string;
}

export interface GoogleOAuthPayload {
  id_token: string;
  email?: string;
  full_name?: string;
  role?: string;
  turnstile_token?: string;
}

export const authApi = {
  /**
   * Dispatches a 6-digit OTP code to the user's phone or email
   */
  requestOtp: async (payload: OTPRequestPayload): Promise<OTPResponseData> => {
    return apiClient.post<OTPResponseData>("/auth/otp/request", payload);
  },

  /**
   * Verifies OTP code and stores access token strictly in-memory
   */
  verifyOtp: async (payload: OTPVerifyPayload): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>("/auth/otp/verify", payload);
    if (res.access_token) {
      tokenStore.setToken(res.access_token);
    }
    return res;
  },

  /**
   * Logs in or signs up with Google OAuth id_token
   */
  loginWithGoogle: async (payload: GoogleOAuthPayload): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>("/auth/google", payload);
    if (res.access_token) {
      tokenStore.setToken(res.access_token);
    }
    return res;
  },

  /**
   * Logs in with email and password via verified backend hashing
   */
  loginWithPassword: async (payload: { email: string; password: string }): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>("/auth/login/password", payload);
    if (res.access_token) {
      tokenStore.setToken(res.access_token);
    }
    return res;
  },

  /**
   * Rotates and refreshes the expired access token via HttpOnly cookie.
   * Utilizes the tokenStore mutex to coalesce concurrent refresh requests.
   */
  refreshToken: async (refreshToken?: string): Promise<{ access_token: string }> => {
    const token = await tokenStore.acquireFreshToken(async () => {
      const payload = refreshToken ? { refresh_token: refreshToken } : {};
      const res = await apiClient.post<{ access_token: string }>("/auth/refresh", payload);
      return res?.access_token || null;
    });
    return { access_token: token || "" };
  },

  /**
   * Logs out the user and clears in-memory credentials and legacy storage
   */
  logout: async (): Promise<{ success: boolean }> => {
    tokenStore.clearToken();
    tokenStore.cleanupLegacyStorage();
    try {
      return await apiClient.post<{ success: boolean }>("/auth/logout", {});
    } catch {
      return { success: true };
    }
  },

  /**
   * Retrieves profile details for the authenticated user
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>("/auth/me");
  },
};

export default authApi;
