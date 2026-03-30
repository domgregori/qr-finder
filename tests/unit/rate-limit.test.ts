import { describe, it, expect, beforeEach, vi } from "vitest";

// The rate limiter uses a module-level Map — reset it between tests by
// re-importing a fresh module each suite via vi.resetModules().
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows the first request", async () => {
    const { checkRateLimit } = await import("../../packages/shared/lib/rate-limit");
    const result = checkRateLimit("127.0.0.1", { windowMs: 60_000, maxRequests: 5 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks remaining count across multiple requests", async () => {
    const { checkRateLimit } = await import("../../packages/shared/lib/rate-limit");
    const config = { windowMs: 60_000, maxRequests: 3 };
    checkRateLimit("10.0.0.1", config);
    checkRateLimit("10.0.0.1", config);
    const result = checkRateLimit("10.0.0.1", config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", async () => {
    const { checkRateLimit } = await import("../../packages/shared/lib/rate-limit");
    const config = { windowMs: 60_000, maxRequests: 2 };
    checkRateLimit("192.168.1.1", config);
    checkRateLimit("192.168.1.1", config);
    const result = checkRateLimit("192.168.1.1", config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("does not share counts between different identifiers", async () => {
    const { checkRateLimit } = await import("../../packages/shared/lib/rate-limit");
    const config = { windowMs: 60_000, maxRequests: 1 };
    const first = checkRateLimit("1.1.1.1", config);
    const second = checkRateLimit("2.2.2.2", config);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const { checkRateLimit } = await import("../../packages/shared/lib/rate-limit");
    const config = { windowMs: 1_000, maxRequests: 1 };

    checkRateLimit("5.5.5.5", config);
    const blocked = checkRateLimit("5.5.5.5", config);
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(1_001);

    const reset = checkRateLimit("5.5.5.5", config);
    expect(reset.success).toBe(true);

    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const makeRequest = (headers: Record<string, string>) =>
    new Request("http://localhost/", { headers });

  it("reads x-forwarded-for", async () => {
    const { getClientIp } = await import("../../packages/shared/lib/rate-limit");
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("reads x-real-ip when x-forwarded-for is absent", async () => {
    const { getClientIp } = await import("../../packages/shared/lib/rate-limit");
    const req = makeRequest({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("reads cf-connecting-ip (Cloudflare)", async () => {
    const { getClientIp } = await import("../../packages/shared/lib/rate-limit");
    const req = makeRequest({ "cf-connecting-ip": "11.22.33.44" });
    expect(getClientIp(req)).toBe("11.22.33.44");
  });

  it("returns 'unknown' when no IP headers are present", async () => {
    const { getClientIp } = await import("../../packages/shared/lib/rate-limit");
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 response with correct headers", async () => {
    const { rateLimitResponse } = await import("../../packages/shared/lib/rate-limit");
    const result = {
      success: false,
      remaining: 0,
      resetTime: Date.now() + 60_000,
      retryAfter: 60,
    };
    const response = rateLimitResponse(result);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
