/**
 * Noryvanta Order Management & Escrow API Service
 * Invariant: ZERO Noryvanta platform fee charged to buyer/customer at checkout.
 */

import apiClient from "./apiClient";
import { Order, FinancialBreakdown } from "../types";

export interface CreateOrderItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderPayload {
  items: CreateOrderItem[];
  payment_method?: string;
  is_cod?: boolean;
  shipping_address?: string;
  customer_charges?: number;
  merchant_discount?: number;
  platform_discount?: number;
}

export const orderApi = {
  /**
   * Places a purchase order with Escrow protection and customer price guarantee
   */
  create: async (payload: CreateOrderPayload): Promise<Order> => {
    return apiClient.post<Order>("/orders", payload);
  },

  /**
   * Lists orders for the current user
   */
  list: async (): Promise<Order[]> => {
    return apiClient.get<Order[]>("/orders");
  },

  /**
   * Retrieves single order by ID
   */
  getById: async (orderId: string): Promise<Order> => {
    return apiClient.get<Order>(`/orders/${orderId}`);
  },

  /**
   * Retrieves transparent financial breakdown (Section 32.21)
   */
  getFinancialBreakdown: async (orderId: string): Promise<FinancialBreakdown> => {
    return apiClient.get<FinancialBreakdown>(`/orders/${orderId}/financial-breakdown`);
  },
};

export default orderApi;
