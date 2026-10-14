/**
 * React hook for Business Dashboard state
 */

"use client";

import { useState, useEffect } from "react";
import businessApi, { BusinessDashboardSummary } from "../services/businessApi";

export function useBusiness() {
  const [data, setData] = useState<BusinessDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await businessApi.getDashboardSummary();
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load business dashboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  return { data, loading, error };
}

export default useBusiness;
