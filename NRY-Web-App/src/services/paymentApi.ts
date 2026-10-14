/**
 * Noryvanta Payment Gateway API Service (Razorpay & Cashfree)
 */

import apiClient from "./apiClient";

export interface PaymentSessionPayload {
  order_id: string;
  gateway?: "RAZORPAY" | "CASHFREE";
}

export interface PaymentSessionResponse {
  order_id: string;
  gateway: string;
  gateway_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export const paymentApi = {
  /**
   * Initializes a payment session with Razorpay or Cashfree
   */
  createSession: async (payload: PaymentSessionPayload): Promise<PaymentSessionResponse> => {
    return apiClient.post<PaymentSessionResponse>("/payments/create-session", payload);
  },

  /**
   * Directly verifies payment status on the server
   */
  verifyPayment: async (data: {
    order_id: string;
    payment_id: string;
    gateway?: string;
  }): Promise<{ success: boolean; payment_status: string; order_status: string }> => {
    return apiClient.post("/payments/verify", null, { params: data });
  },
};

export default paymentApi;
