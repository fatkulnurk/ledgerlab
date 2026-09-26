import type { MiddlewareHandler } from "hono";
import { FixedWindowRateLimiter } from "@ledgerlab/shared";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = { windowMs: 60_000, max: 120 };

/** Build options from env, falling back to the documented defaults. */
export function rateLimitFromEnv(env: NodeJS.ProcessEnv = process.env): RateLimitOptions {
  const max = Number(env.RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT.max);
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT.windowMs);
  return {
    max: Number.isInteger(max) && max > 0 ? max : DEFAULT_RATE_LIMIT.max,
    windowMs: Number.isInteger(windowMs) && windowMs > 0 ? windowMs : DEFAULT_RATE_LIMIT.windowMs,
  };
}

/**
 * Client key from proxy headers. `cf-connecting-ip` (set by Cloudflare and not
 * client-spoofable) wins; then `x-real-ip`; then the **rightmost** X-Forwarded-For
 * hop, which is the value appended by the closest trusted proxy. Taking the
 * leftmost XFF entry would let a caller forge a new bucket per request and
 * bypass the limit.
 */
function clientKey(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    return hops[hops.length - 1]!.trim();
  }
  return "unknown";
}

/**
 * Fixed-window rate limiting for the API surface. Returns 429 with a
 * `Retry-After` header when a client exceeds the window. Mounted on `/api/*`
 * only so `/health` stays reachable for platform probes.
 */
export function rateLimit(options: RateLimitOptions = DEFAULT_RATE_LIMIT): MiddlewareHandler {
  const limiter = new FixedWindowRateLimiter(options.windowMs, options.max);
  let lastPrune = Date.now();

  return async (c, next) => {
    const now = Date.now();
    if (now - lastPrune > options.windowMs) {
      limiter.prune(now);
      lastPrune = now;
    }

    const decision = limiter.check(clientKey(c.req.raw.headers), now);
    c.header("X-RateLimit-Limit", String(options.max));
    c.header("X-RateLimit-Remaining", String(decision.remaining));

    if (!decision.allowed) {
      c.header("Retry-After", String(decision.retryAfterSeconds));
      return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests, slow down" } }, 429);
    }
    await next();
  };
}
