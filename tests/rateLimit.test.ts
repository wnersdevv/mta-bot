import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first several actions within the window", async () => {
    const { checkRateLimit } = await import("@/middleware/rateLimit");
    for (let i = 0; i < 6; i++) {
      expect(checkRateLimit("user-a", "guild-1")).toBe(true);
    }
  });

  it("blocks once the per-window action limit is exceeded", async () => {
    const { checkRateLimit } = await import("@/middleware/rateLimit");
    for (let i = 0; i < 6; i++) checkRateLimit("user-b", "guild-1");
    expect(checkRateLimit("user-b", "guild-1")).toBe(false);
  });

  it("tracks each user independently", async () => {
    const { checkRateLimit } = await import("@/middleware/rateLimit");
    for (let i = 0; i < 6; i++) checkRateLimit("user-c", "guild-1");
    // user-c is now rate limited, but a different user should be unaffected.
    expect(checkRateLimit("user-c", "guild-1")).toBe(false);
    expect(checkRateLimit("user-d", "guild-1")).toBe(true);
  });

  it("resets once the sliding window has fully elapsed", async () => {
    const { checkRateLimit } = await import("@/middleware/rateLimit");
    for (let i = 0; i < 6; i++) checkRateLimit("user-e", "guild-1");
    expect(checkRateLimit("user-e", "guild-1")).toBe(false);

    vi.advanceTimersByTime(3_100); // past the 3s window

    expect(checkRateLimit("user-e", "guild-1")).toBe(true);
  });
});
