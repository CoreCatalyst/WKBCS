/**
 * Noryvanta Centralized HTTP API Client
 * Configured with configurable base URL, authentication bearer tokens, and standardized error interception.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import tokenStore from "./tokenStore";

const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000/api/v1";

export interface ApiErrorResponse {
  message: string;
  detail?: string | any;
  status?: number;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 20000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Request interceptor to attach in-memory JWT access token
    this.instance.interceptors.request.use(
      (config) => {
        const token = tokenStore.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for centralized error normalization
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError<{ detail?: any; message?: string }>) => {
        const errorData: ApiErrorResponse = {
          message:
            error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message ||
            "An unexpected network error occurred.",
          status: error.response?.status,
          detail: error.response?.data?.detail,
        };

        // Automatically clear in-memory session token on unauthorized responses
        if (error.response?.status === 401) {
          tokenStore.clearToken();
        }

        return Promise.reject(errorData);
      }
    );
  }

  public getBaseUrl(): string {
    return API_BASE_URL;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
