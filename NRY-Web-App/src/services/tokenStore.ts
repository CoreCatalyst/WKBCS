/**
 * In-Memory Token Store for Noryvanta Web Frontend
 * 
 * Security Architecture (F-03 Remediation):
 * - Keeps short-lived access tokens exclusively in volatile memory (RAM).
 * - Eliminates long-term XSS exfiltration risks associated with persistent localStorage / sessionStorage.
 * - Handles concurrent request synchronization (refresh mutex) to prevent thundering-herd refresh calls.
 * - Performs proactive cleanup of historical/legacy storage keys.
 */

let inMemoryAccessToken: string | null = null;
let activeRefreshPromise: Promise<string | null> | null = null;

export const tokenStore = {
  /**
   * Retrieves the current in-memory access token.
   */
  getToken(): string | null {
    return inMemoryAccessToken;
  },

  /**
   * Sets or updates the in-memory access token.
   */
  setToken(token: string | null): void {
    inMemoryAccessToken = token;
  },

  /**
   * Clears in-memory token state immediately.
   */
  clearToken(): void {
    inMemoryAccessToken = null;
  },

  /**
   * One-time legacy cleanup to permanently purge any access/refresh tokens
   * previously stored in browser localStorage or sessionStorage.
   */
  cleanupLegacyStorage(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("noryvanta_access_token");
        localStorage.removeItem("noryvanta_refresh_token");
        sessionStorage.removeItem("noryvanta_access_token");
        sessionStorage.removeItem("noryvanta_refresh_token");
      } catch {
        // Silently ignore restricted context errors
      }
    }
  },

  /**
   * Refresh mutex: Ensures that simultaneous 401s or bootstrap calls
   * share a single in-flight refresh request rather than triggering redundant calls.
   */
  async acquireFreshToken(
    refreshFn: () => Promise<string | null>
  ): Promise<string | null> {
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const token = await refreshFn();
        inMemoryAccessToken = token;
        return token;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  }
};

// Immediately execute cleanup upon import in browser environments
if (typeof window !== "undefined") {
  tokenStore.cleanupLegacyStorage();
}

export default tokenStore;
