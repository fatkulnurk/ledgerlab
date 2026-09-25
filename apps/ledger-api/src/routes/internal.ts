import { Hono } from "hono";
import type { LedgerService } from "../services/ledger-service";

export interface InternalAuthOptions {
  /** Shared secret expected in `Authorization: Bearer <token>`. */
  token?: string;
  /**
   * When true, a missing token is a misconfiguration and every request is
   * rejected (fail closed). Production always sets this.
   */
  required?: boolean;
}

/**
 * Service-to-service endpoints. Not intended for the browser.
 *
 * Callers must send `Authorization: Bearer <token>`. When no token is
 * configured the route is only open in non-production (local dev); in
 * production a missing token rejects every request so the endpoint can never
 * be reached unauthenticated.
 */
export function internalRoutes(service: LedgerService, auth: InternalAuthOptions = {}): Hono {
  const app = new Hono();

  app.use("*", async (c, next) => {
    if (!auth.token) {
      if (auth.required) {
        return c.json({ error: { code: "UNAUTHORIZED", message: "Internal API is not configured" } }, 401);
      }
      return next();
    }
    const header = c.req.header("authorization");
    if (header !== `Bearer ${auth.token}`) {
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
