/**
 * Noryvanta Services & Service Booking API Service
 */

import apiClient from "./apiClient";
import { ProductListing } from "../types";

export interface ServiceFilterParams {
  category?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface BookingPayload {
  service_id: string;
  booking_date?: string;
  notes?: string;
  contact_phone?: string;
  service_address?: string;
}

export interface BookingResponse {
  id: string;
  booking_number: string;
  service_id: string;
  service_title: string;
  provider_id: string;
  customer_id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

export const serviceApi = {
  /**
   * Browse available services
   */
  list: async (params?: ServiceFilterParams): Promise<ProductListing[]> => {
    return apiClient.get<ProductListing[]>("/services", { params });
  },

  /**
   * Get single service detail
   */
  getById: async (serviceId: string): Promise<ProductListing> => {
    return apiClient.get<ProductListing>(`/services/${serviceId}`);
  },

  /**
   * Book a service with zero customer platform fee
   */
  book: async (payload: BookingPayload): Promise<BookingResponse> => {
    return apiClient.post<BookingResponse>("/services/bookings", payload);
  },

  /**
   * Get booking details
   */
  getBooking: async (bookingId: string): Promise<BookingResponse> => {
    return apiClient.get<BookingResponse>(`/services/bookings/${bookingId}`);
  },

  /**
   * Cancel an existing booking
   */
  cancelBooking: async (bookingId: string, reason?: string): Promise<{ success: boolean; status: string }> => {
    return apiClient.post<{ success: boolean; status: string }>(
      `/services/bookings/${bookingId}/cancel`,
      null,
      { params: { reason } }
    );
  },
};

export default serviceApi;
