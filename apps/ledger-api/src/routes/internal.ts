import { Hono } from "hono";
import type { LedgerService } from "../services/ledger-service";

/**
 * Service-to-service endpoints. Not intended for the browser.
 * If INTERNAL_API_TOKEN is set, callers must send `Authorization: Bearer <token>`.
 */
export function internalRoutes(service: LedgerService, internalToken?: string): Hono {
  const app = new Hono();

  app.use("*", async (c, next) => {
    if (!internalToken) return next();
    const header = c.req.header("authorization");
    if (header !== `Bearer ${internalToken}`) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } }, 401);
    }
    return next();
  });

  app.get("/postings", async (c) => {
    const postings = await service.listPostings();
    return c.json({ data: postings });
  });

  return app;
}
