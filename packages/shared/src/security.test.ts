import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter, assertProductionConfig, parseCorsOrigins } from "./security";

describe("parseCorsOrigins", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseCorsOrigins(" https://a.example , https://b.example ,, ")).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  it("defaults to a wildcard when unset", () => {
    expect(parseCorsOrigins(undefined)).toEqual(["*"]);
  });
});

describe("assertProductionConfig", () => {
  it("does nothing outside production", () => {
    expect(() => assertProductionConfig({ nodeEnv: "development", corsOrigins: ["*"] })).not.toThrow();
  });

  it("rejects a wildcard origin in production", () => {
    expect(() => assertProductionConfig({ nodeEnv: "production", corsOrigins: ["*"] })).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it("rejects an empty origin list in production", () => {
    expect(() => assertProductionConfig({ nodeEnv: "production", corsOrigins: [] })).toThrow(/CORS_ORIGINS/);
  });

  it("requires the internal token when asked", () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: "production",
        corsOrigins: ["https://app.example"],
        requireInternalToken: true,
      }),
    ).toThrow(/INTERNAL_API_TOKEN/);
  });

  it("rejects a whitespace-only internal token", () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: "production",
        corsOrigins: ["https://app.example"],
        internalToken: "   ",
        requireInternalToken: true,
      }),
    ).toThrow(/INTERNAL_API_TOKEN/);
  });

  it("accepts a fully configured production setup", () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: "production",
        corsOrigins: ["https://app.example"],
        internalToken: "secret",
        requireInternalToken: true,
      }),
    ).not.toThrow();
  });
});

describe("FixedWindowRateLimiter", () => {
  it("allows up to the max then blocks within the window", () => {
    const limiter = new FixedWindowRateLimiter(1_000, 3);
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 1).allowed).toBe(true);
    expect(limiter.check("ip", 2).allowed).toBe(true);

    const blocked = limiter.check("ip", 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window has elapsed", () => {
    const limiter = new FixedWindowRateLimiter(1_000, 1);
    expect(limiter.check("ip", 0).allowed).toBe(true);
    expect(limiter.check("ip", 500).allowed).toBe(false);
    expect(limiter.check("ip", 1_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = new FixedWindowRateLimiter(1_000, 1);
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("b", 0).allowed).toBe(true);
    expect(limiter.check("a", 1).allowed).toBe(false);
  });

  it("prunes expired windows", () => {
    const limiter = new FixedWindowRateLimiter(1_000, 1);
    limiter.check("a", 0);
    limiter.check("b", 0);
    expect(limiter.size).toBe(2);
    limiter.prune(2_000);
    expect(limiter.size).toBe(0);
  });

  it("rejects non-integer configuration", () => {
    expect(() => new FixedWindowRateLimiter(1_000, 2.5)).toThrow(/integer/);
    expect(() => new FixedWindowRateLimiter(1_000.5, 2)).toThrow(/integer/);
  });
});
