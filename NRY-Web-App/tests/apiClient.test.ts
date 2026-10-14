/**
 * Centralized API Client Tests
 */

import apiClient from "../src/services/apiClient";

describe("Centralized API Client", () => {
  it("has a configured base URL ending with /api/v1", () => {
    const url = apiClient.getBaseUrl();
    expect(url).toContain("/api/v1");
  });

  it("exports all HTTP verb helpers", () => {
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
    expect(typeof apiClient.put).toBe("function");
    expect(typeof apiClient.patch).toBe("function");
    expect(typeof apiClient.delete).toBe("function");
  });
});
