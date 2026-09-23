import { z } from "zod";

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
  uptimeSeconds: number;
  /** "memory" | "postgres" */
  repository: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type Pagination = z.infer<typeof paginationSchema>;
