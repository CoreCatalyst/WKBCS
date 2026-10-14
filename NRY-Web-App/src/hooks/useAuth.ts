/**
 * React hook for Authentication & Session state
 */

"use client";

import { useState, useEffect } from "react";
import authApi from "../services/authApi";
import tokenStore from "../services/tokenStore";
import { UserProfile } from "../types";

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      let token = tokenStore.getToken();
      if (!token) {
        try {
          const res = await authApi.refreshToken();
          token = res.access_token || null;
        } catch {
          token = null;
        }
      }
      if (!token) {
        if (isMounted) {
          setLoading(false);
          setIsAuthenticated(false);
        }
        return;
      }
      try {
        const profile = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return { user, loading, isAuthenticated, logout };
}

export default useAuth;
