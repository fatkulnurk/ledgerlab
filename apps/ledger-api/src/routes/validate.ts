import type { Context } from "hono";
import type { ZodTypeAny, output } from "zod";
import { ValidationError } from "@ledgerlab/shared";

/** Parse and validate a JSON body, throwing a typed ValidationError on failure. */
export async function parseBody<S extends ZodTypeAny>(c: Context, schema: S): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError("Request body failed validation", result.error.flatten());
  }
  return result.data;
}

/** Parse and validate query string parameters. */
export function parseQuery<S extends ZodTypeAny>(c: Context, schema: S): output<S> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new ValidationError("Query parameters failed validation", result.error.flatten());
  }
  return result.data;
}
