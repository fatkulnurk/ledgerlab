import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "@ledgerlab/shared";
import type { ReportingService } from "./services/reporting-service";
import { healthRoutes } from "./routes/health";
import { reportRoutes } from "./routes/reports";
import { DEFAULT_RATE_LIMIT, rateLimit, type RateLimitOptions } from "./middleware/rate-limit";

export interface CreateAppOptions {
  service: ReportingService;
  corsOrigins?: string[];
  /** Rate limit for /api/*; pass false to disable (tests). */
  rateLimit?: RateLimitOptions | false;
}

export function createReportingApp({
  service,
  corsOrigins = ["*"],
  rateLimit: rateLimitOptions = DEFAULT_RATE_LIMIT,
}: CreateAppOptions): Hono {
  const app = new Hono();

  if (process.env.NODE_ENV !== "test") app.use("*", logger());
  app.use(
    "*",
    secureHeaders({
      strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
      xFrameOptions: "DENY",
      referrerPolicy: "strict-origin-when-cross-origin",
      xContentTypeOptions: "nosniff",
    }),
  );
  app.use(
    "*",
    cors({
      origin: (origin) =>
        corsOrigins.includes("*") ? (origin ?? "*") : corsOrigins.includes(origin) ? origin : null,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  if (rateLimitOptions) app.use("/api/*", rateLimit(rateLimitOptions));

  app.route("/", healthRoutes("reporting-api"));
  app.route("/api/reports", reportRoutes(service));

  app.notFound((c) =>
    c.json({ error: { code: "NOT_FOUND", message: `Route ${c.req.method} ${c.req.path} not found` } }, 404),
  );

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        err.status as ContentfulStatusCode,
      );
    }
    console.error("[reporting-api] unhandled error:", err);
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
  });

  return app;
}
