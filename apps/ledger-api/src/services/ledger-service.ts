import type {
  Account,
  CreateAccountInput,
  CreateJournalEntryInput,
  EntryStatus,
  JournalEntry,
  LedgerRepository,
  Paginated,
  PostingRow,
  TrialBalance,
} from "@ledgerlab/shared";
import {
  ConflictError,
  NotFoundError,
  UnbalancedEntryError,
  ValidationError,
  buildTrialBalance,
  isBalanced,
  isIsoDate,
  sumMinor,
} from "@ledgerlab/shared";

export interface ListEntriesParams {
  page: number;
  pageSize: number;
  status?: EntryStatus;
  from?: string;
  to?: string;
}

export interface LedgerServiceOptions {
  /**
   * Entries dated on or before this ISO date (YYYY-MM-DD) belong to a closed
   * accounting period and are rejected. Unset means no period is closed.
   */
  closedThrough?: string;
}

/**
 * Application layer for the ledger. Owns the business rules:
 *   - a journal entry must have at least two lines
 *   - every line amount must be non-zero
 *   - debits must equal credits (sum of signed minor units === 0)
 *   - referenced accounts must exist and be active
 *   - the entry date must not fall in a closed accounting period
 *
 * The repository only persists; it does not decide what is valid.
 */
export class LedgerService {
  private readonly closedThrough?: string;

  constructor(
    private readonly repo: LedgerRepository,
    options: LedgerServiceOptions = {},
  ) {
    if (options.closedThrough !== undefined && !isIsoDate(options.closedThrough)) {
      throw new ValidationError(
        `CLOSED_THROUGH must be a real ISO date (YYYY-MM-DD), got "${options.closedThrough}"`,
      );
    }
    this.closedThrough = options.closedThrough;
  }

  /** True when the given date falls on or before the closed period boundary. */
  private isClosed(date: string): boolean {
    return this.closedThrough !== undefined && date <= this.closedThrough;
  }

  get repositoryKind(): "memory" | "postgres" {
    return this.repo.kind;
  }

  listAccounts(): Promise<Account[]> {
    return this.repo.listAccounts();
  }

  async getAccountOrThrow(id: string): Promise<Account> {
    const account = await this.repo.getAccountById(id);
    if (!account) throw new NotFoundError(`Account ${id} not found`);
    return account;
  }

  createAccount(input: CreateAccountInput): Promise<Account> {
    return this.repo.createAccount(input);
  }

  async setAccountActive(id: string, isActive: boolean): Promise<Account> {
    const account = await this.repo.setAccountActive(id, isActive);
    if (!account) throw new NotFoundError(`Account ${id} not found`);
    return account;
  }

  listJournalEntries(params: ListEntriesParams): Promise<Paginated<JournalEntry>> {
    return this.repo.listJournalEntries(params);
  }

  async getJournalEntryOrThrow(id: string): Promise<JournalEntry> {
    const entry = await this.repo.getJournalEntry(id);
    if (!entry) throw new NotFoundError(`Journal entry ${id} not found`);
    return entry;
  }

  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    if (this.isClosed(input.date)) {
      throw new ValidationError(
        `Entry date ${input.date} falls in a closed accounting period (closed through ${this.closedThrough})`,
      );
    }
    if (input.lines.length < 2) {
      throw new ValidationError("A journal entry requires at least two lines");
    }
    for (const line of input.lines) {
      if (line.amountMinor === 0) {
        throw new ValidationError("Journal line amounts must not be zero");
      }
    }
    const amounts = input.lines.map((line) => line.amountMinor);
    if (!isBalanced(amounts)) {
      const total = sumMinor(amounts);
      throw new UnbalancedEntryError(
        `Entry is out of balance by ${total} minor units (debits must equal credits)`,
        total,
      );
    }
    // Every referenced account must exist and be active before persisting.
    for (const line of input.lines) {
      const account = await this.getAccountOrThrow(line.accountId);
      if (!account.isActive) {
        throw new ValidationError(`Account ${account.code} is inactive and cannot be posted to`);
      }
    }
    return this.repo.createJournalEntry(input);
  }

  async voidJournalEntry(id: string): Promise<JournalEntry> {
    const entry = await this.getJournalEntryOrThrow(id);
    if (entry.status !== "POSTED") {
      throw new ConflictError(`Journal entry ${id} is ${entry.status}; only POSTED entries can be voided`);
    }
    if (this.isClosed(entry.date)) {
      throw new ValidationError(
        `Journal entry ${id} is dated ${entry.date}, inside a closed accounting period ` +
          `(closed through ${this.closedThrough}); it cannot be voided`,
      );
    }
    const voided = await this.repo.voidJournalEntry(id);
    if (!voided) throw new NotFoundError(`Journal entry ${id} not found`);
    return voided;
  }

  async trialBalance(asOf: string): Promise<TrialBalance> {
    const postings = await this.repo.listPostings();
    return buildTrialBalance(postings, asOf);
  }

  /** Raw postings for downstream services (used by the reporting API). */
  listPostings(): Promise<PostingRow[]> {
    return this.repo.listPostings();
  }
}
