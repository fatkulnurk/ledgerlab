import type { PostingRow } from "@ledgerlab/shared";
import { AppError } from "@ledgerlab/shared";

/**
 * Anything the reporting service can read postings from. The production
 * implementation is LedgerClient (HTTP); tests inject a fake.
 */
export interface PostingSource {
  listPostings(): Promise<PostingRow[]>;
}

export interface LedgerClientOptions {
  baseUrl: string;
  internalToken?: string;
  /** Milliseconds before the upstream request is aborted. */
  timeoutMs?: number;
}

/** HTTP client for the ledger API's internal postings endpoint. */
export class LedgerClient implements PostingSource {
  private readonly baseUrl: string;
  private readonly internalToken?: string;
  private readonly timeoutMs: number;

  constructor(options: LedgerClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.internalToken = options.internalToken;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  async listPostings(): Promise<PostingRow[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/api/internal/postings`, {
        headers: this.internalToken ? { authorization: `Bearer ${this.internalToken}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AppError("UPSTREAM_ERROR", `Ledger API responded with ${response.status}`, 502);
      }
      const body = (await response.json()) as { data: PostingRow[] };
      return body.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("UPSTREAM_TIMEOUT", "Ledger API request timed out", 504);
      }
      throw new AppError("UPSTREAM_UNAVAILABLE", "Ledger API is unavailable", 503);
    } finally {
      clearTimeout(timer);
    }
  }
}
