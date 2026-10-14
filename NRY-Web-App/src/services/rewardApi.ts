/**
 * Noryvanta Referral Rewards & 120-Level Network Engine API Service
 */

import apiClient from "./apiClient";
import { RewardSummary } from "../types";

export interface ReferralInfo {
  uaid: string;
  share_url: string;
  qr_code_url: string;
  total_referrals: number;
  total_network_volume: number;
  active_cycle: number;
  current_level: number;
}

export interface RewardLedgerItem {
  id: string;
  rank_name: string;
  level_number: number;
  qualification_volume: number;
  reward_rate_percent: number;
  reward_amount: number;
  status: string;
  created_at: string;
}

export const rewardApi = {
  /**
   * Retrieves authenticated user's wallet reward balances
   */
  getSummary: async (): Promise<RewardSummary> => {
    return apiClient.get<RewardSummary>("/rewards/me");
  },

  /**
   * Retrieves paginated immutable reward ledger entries
   */
  getLedger: async (skip = 0, limit = 50): Promise<{ items: RewardLedgerItem[]; total: number }> => {
    return apiClient.get<{ items: RewardLedgerItem[]; total: number }>("/rewards/ledger", {
      params: { skip, limit },
    });
  },

  /**
   * Retrieves user's referral code, share URL, and network metrics
   */
  getMyReferrals: async (): Promise<ReferralInfo> => {
    return apiClient.get<ReferralInfo>("/referrals/me");
  },

  /**
   * Validates a referral code or partner UAID
   */
  validateReferralCode: async (referralCode: string): Promise<{ is_valid: boolean; referrer_name?: string }> => {
    return apiClient.post("/referrals/validate", { referral_code: referralCode });
  },

  /**
   * Retrieves benchmark reward rules for a given business category
   */
  getRules: async (businessType: string): Promise<any> => {
    return apiClient.get("/reward-rules", { params: { business_type: businessType } });
  },
};

export default rewardApi;
