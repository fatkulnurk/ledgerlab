/**
 * Security primitives shared by the API services: configuration guards and a
 * small in-process rate limiter.
 *
 * These are deliberately dependency-free so they can be unit tested and reused
 * by both the ledger and reporting APIs.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets; 0 while the request is allowed. */
  retryAfterSeconds: number;
}

/**
 * A fixed-window rate limiter keyed by an arbitrary string (usually the client
 * IP). In-memory and per-process, which is enough for a single replica; put a
 * shared store or an edge limiter in front when scaling horizontally.
 */
export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
      throw new Error("Rate limit window must be a positive integer");
    }
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error("Rate limit max must be a positive integer");
    }
  }

  check(key: string, now: number = Date.now()): RateLimitDecision {
    const entry = this.hits.get(key);
    if (!entry || now >= entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1, retryAfterSeconds: 0 };
    }
    if (entry.count >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      };
    }
    entry.count += 1;
    return { allowed: true, remaining: this.max - entry.count, retryAfterSeconds: 0 };
  }

  /** Drop expired windows so the map cannot grow without bound. */
  prune(now: number = Date.now()): void {
    for (const [key, entry] of this.hits) {
      if (now >= entry.resetAt) this.hits.delete(key);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}

/** Split a comma-separated `CORS_ORIGINS` value into a clean allowlist. */
export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface ProductionConfigInput {
  nodeEnv?: string;
  corsOrigins: readonly string[];
  internalToken?: string;
  /** Require `INTERNAL_API_TOKEN` in production (the ledger API). */
  requireInternalToken?: boolean;
}

/**
 * Reject insecure production configuration at startup rather than silently
 * serving. A wildcard CORS origin or an unset internal token is an automatic
 * failure for this project, so the process must refuse to boot.
 */
export function assertProductionConfig(input: ProductionConfigInput): void {
  if (input.nodeEnv !== "production") return;

  const problems: string[] = [];
  if (input.corsOrigins.length === 0) {
    problems.push("CORS_ORIGINS must list at least one explicit origin");
  }
  if (input.corsOrigins.includes("*")) {
    problems.push('CORS_ORIGINS must not be "*" in production');
  }
  if (input.requireInternalToken && !input.internalToken?.trim()) {
    problems.push("INTERNAL_API_TOKEN must be set in production");
  }

  if (problems.length > 0) {
    throw new Error(`Insecure production configuration:\n- ${problems.join("\n- ")}`);
  }
}
