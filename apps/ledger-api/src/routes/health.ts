import type { HealthResponse } from "@ledgerlab/shared";
import { Hono } from "hono";

const startedAt = Date.now();
const VERSION = "0.1.0";

export function healthRoutes(serviceName: string, repositoryKind: string): Hono {
  const app = new Hono();

  app.get("/health", (c) => {
    const body: HealthResponse = {
      status: "ok",
      service: serviceName,
      version: VERSION,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      repository: repositoryKind,
    };
    return c.json(body);
  });

  return app;
}
