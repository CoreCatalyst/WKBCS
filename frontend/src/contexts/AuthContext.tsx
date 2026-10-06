"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

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
    const savedToken = localStorage.getItem("noryvanta_access_token");
    const savedUser = localStorage.getItem("noryvanta_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
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

      setToken(access_token);
      setUser(userObj);
      localStorage.setItem("noryvanta_access_token", access_token);
      localStorage.setItem("noryvanta_user", JSON.stringify(userObj));
      return true;
    } catch (err) {
      console.error("Login verification failed", err);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("noryvanta_access_token");
    localStorage.removeItem("noryvanta_user");
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
