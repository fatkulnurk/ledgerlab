import { serve } from "@hono/node-server";
import { assertProductionConfig, parseCorsOrigins } from "@ledgerlab/shared";
import { loadRootEnv } from "@ledgerlab/shared/node";
import { createLedgerApp } from "./app";
import { LedgerService } from "./services/ledger-service";
import { resolveLedgerRepository } from "./repositories/resolve";
import { rateLimitFromEnv } from "./middleware/rate-limit";

// Local development reads the repository-root `.env`. No-op in production, where
// the platform injects the same variables (and a `.env` is never shipped).
loadRootEnv();

// `PORT` is the platform convention (Render forwards traffic to it);
// `LEDGER_API_PORT` stays supported for local development.
const port = Number(process.env.LEDGER_API_PORT ?? process.env.PORT ?? 4001);
const hostname = process.env.LEDGER_API_HOST ?? "0.0.0.0";
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
const internalToken = process.env.INTERNAL_API_TOKEN;
const isProduction = process.env.NODE_ENV === "production";

assertProductionConfig({
  nodeEnv: process.env.NODE_ENV,
  corsOrigins,
  internalToken,
  requireInternalToken: true,
});

const { repository, close } = resolveLedgerRepository();
const service = new LedgerService(repository, { closedThrough: process.env.CLOSED_THROUGH });
const app = createLedgerApp({
  service,
  corsOrigins,
  internalToken,
  requireInternalToken: isProduction,
  rateLimit: rateLimitFromEnv(),
});

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[ledger-api] listening on http://${info.address}:${info.port} (repo: ${repository.kind})`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[ledger-api] ${signal} received, shutting down`);
  await close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
