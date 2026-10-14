"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import tokenStore from "@/services/tokenStore";
import authApi from "@/services/authApi";

interface UserProfile {
  id: string;
  phone?: string;
  email?: string;
  full_name?: string;
  business_name?: string;
  profile_picture?: string;
  role: "BUYER" | "VENDOR" | "ADMIN";
  is_verified: boolean;
  has_business_profile?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  loginWithOTP: (identifier: string, otpCode: string, role?: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  loginWithOTP: async () => false,
  logout: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function bootstrapSession() {
      tokenStore.cleanupLegacyStorage();
      try {
        // Attempt cookie-based token refresh to bootstrap session on load/reload
        const { access_token } = await authApi.refreshToken();
        if (access_token && isMounted) {
          tokenStore.setToken(access_token);
          setToken(access_token);
          const profileRes = await api.get("/auth/me");
          if (isMounted) {
            setUser({
              id: profileRes.data.id,
              phone: profileRes.data.phone,
              email: profileRes.data.email,
              full_name: profileRes.data.full_name || "Procurement Buyer",
              role: profileRes.data.role,
              is_verified: profileRes.data.is_verified,
            });
          }
        }
      } catch {
        if (isMounted) {
          tokenStore.clearToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    bootstrapSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithOTP = async (identifier: string, otpCode: string, role = "BUYER"): Promise<boolean> => {
    try {
      const res = await api.post("/auth/otp/verify", {
        identifier,
        otp_code: otpCode,
        role,
      });

      const { access_token, user_id, email, phone, role: userRole, has_business_profile } = res.data;
      const userObj: UserProfile = {
        id: user_id,
        phone,
        email,
        full_name: role === "VENDOR" ? "Apex Instruments" : "Procurement Buyer",
        role: userRole,
        is_verified: true,
        has_business_profile,
      };

      tokenStore.setToken(access_token);
      setToken(access_token);
      setUser(userObj);
      return true;
    } catch (err) {
      console.error("Login verification failed", err);
      return false;
    }
  };

  const logout = async () => {
    tokenStore.clearToken();
    tokenStore.cleanupLegacyStorage();
    setToken(null);
    setUser(null);
    await authApi.logout();
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      const updated = { ...user, ...res.data };
      setUser(updated);
      localStorage.setItem("noryvanta_user", JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not refresh profile", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, loginWithOTP, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
