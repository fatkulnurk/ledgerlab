import { describe, expect, it } from "vitest";
import { InMemoryLedgerRepository } from "@ledgerlab/db";
import { createLedgerApp, type CreateAppOptions } from "../app";
import { LedgerService } from "../services/ledger-service";

function build(overrides: Partial<CreateAppOptions> = {}) {
  const service = new LedgerService(new InMemoryLedgerRepository({ seed: true }));
  return createLedgerApp({ service, ...overrides });
}

describe("security: rate limiting", () => {
  it("returns 429 with Retry-After once the window is exhausted", async () => {
    const app = build({ rateLimit: { windowMs: 60_000, max: 3 } });

    for (let i = 0; i < 3; i += 1) {
      const res = await app.request("/api/accounts");
      expect(res.status).toBe(200);
      expect(res.headers.get("x-ratelimit-limit")).toBe("3");
    }

    const blocked = await app.request("/api/accounts");
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("does not rate limit /health", async () => {
    const app = build({ rateLimit: { windowMs: 60_000, max: 1 } });
    await app.request("/health");
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("keys on the trusted (rightmost) forwarded hop, not a spoofed leftmost entry", async () => {
    const app = build({ rateLimit: { windowMs: 60_000, max: 2 } });

    // Same real client (rightmost hop) but a different forged leftmost value
    // each time must still share one bucket.
    const first = await app.request("/api/accounts", {
      headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.7" },
    });
    expect(first.status).toBe(200);
    const second = await app.request("/api/accounts", {
      headers: { "x-forwarded-for": "2.2.2.2, 203.0.113.7" },
    });
    expect(second.status).toBe(200);
    const third = await app.request("/api/accounts", {
      headers: { "x-forwarded-for": "3.3.3.3, 203.0.113.7" },
    });
    expect(third.status).toBe(429);
  });

  it("prefers cf-connecting-ip when present", async () => {
    const app = build({ rateLimit: { windowMs: 60_000, max: 1 } });
    const first = await app.request("/api/accounts", {
      headers: { "cf-connecting-ip": "198.51.100.9", "x-forwarded-for": "9.9.9.9" },
    });
    expect(first.status).toBe(200);
    const second = await app.request("/api/accounts", {
      headers: { "cf-connecting-ip": "198.51.100.9", "x-forwarded-for": "8.8.8.8" },
    });
    expect(second.status).toBe(429);
  });
});

describe("security: internal boundary", () => {
  it("rejects a missing or wrong bearer token with 401", async () => {
    const app = build({ internalToken: "s3cret", requireInternalToken: true });

    const missing = await app.request("/api/internal/postings");
    expect(missing.status).toBe(401);

    const wrong = await app.request("/api/internal/postings", {
      headers: { authorization: "Bearer nope" },
    });
    expect(wrong.status).toBe(401);
  });

  it("allows the correct bearer token", async () => {
    const app = build({ internalToken: "s3cret", requireInternalToken: true });
    const res = await app.request("/api/internal/postings", {
      headers: { authorization: "Bearer s3cret" },
    });
    expect(res.status).toBe(200);
  });

  it("fails closed when the token is required but unset", async () => {
    const app = build({ requireInternalToken: true });
    const res = await app.request("/api/internal/postings");
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(200);
  });
});

describe("security: CORS allowlist", () => {
  it("echoes an allowed origin and rejects an unknown one", async () => {
    const app = build({ corsOrigins: ["https://app.example"] });

    const allowed = await app.request("/api/accounts", {
      headers: { Origin: "https://app.example" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://app.example");

    const evil = await app.request("/api/accounts", {
      headers: { Origin: "https://evil.example" },
    });
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("security: response headers", () => {
  it("sets HSTS and hardening headers on API responses", async () => {
    const app = build();
    const res = await app.request("/health");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(res.headers.get("strict-transport-security")).toContain("preload");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
