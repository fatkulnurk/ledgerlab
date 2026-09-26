import { serve } from "@hono/node-server";
import { assertProductionConfig, parseCorsOrigins } from "@ledgerlab/shared";
import { loadRootEnv } from "@ledgerlab/shared/node";
import { createReportingApp } from "./app";
import { LedgerClient } from "./ledger-client";
import { ReportingService } from "./services/reporting-service";
import { rateLimitFromEnv } from "./middleware/rate-limit";

// Local development reads the repository-root `.env`. No-op in production, where
// the platform injects the same variables (and a `.env` is never shipped).
loadRootEnv();

// `PORT` is the platform convention (Render forwards traffic to it);
// `REPORTING_API_PORT` stays supported for local development.
const port = Number(process.env.REPORTING_API_PORT ?? process.env.PORT ?? 4002);
const hostname = process.env.REPORTING_API_HOST ?? "0.0.0.0";
const ledgerUrl = process.env.LEDGER_API_URL ?? "http://localhost:4001";
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

assertProductionConfig({
  nodeEnv: process.env.NODE_ENV,
  corsOrigins,
  internalToken: process.env.INTERNAL_API_TOKEN,
  requireInternalToken: true,
});

const source = new LedgerClient({ baseUrl: ledgerUrl, internalToken: process.env.INTERNAL_API_TOKEN });
const service = new ReportingService(source);
const app = createReportingApp({ service, corsOrigins, rateLimit: rateLimitFromEnv() });

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[reporting-api] listening on http://${info.address}:${info.port} (ledger: ${ledgerUrl})`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
