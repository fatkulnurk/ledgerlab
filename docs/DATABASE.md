# Database

The scaffold defines one storage port and ships two adapters. **G3 requires you
to run against a real database.** PostgreSQL is wired end to end; **MySQL,
MariaDB, SQLite/libSQL, and SQL Server are all acceptable** if you implement the
port.

## The port

```ts
// packages/shared/src/repository.ts
export interface LedgerRepository {
  readonly kind: "memory" | "postgres"; // extend the union for new engines
  listAccounts(): Promise<Account[]>;
  getAccountById(id: string): Promise<Account | undefined>;
  getAccountByCode(code: string): Promise<Account | undefined>;
  createAccount(input: CreateAccountInput): Promise<Account>;
  setAccountActive(id: string, isActive: boolean): Promise<Account | undefined>;

  listJournalEntries(query: ListJournalEntriesQuery): Promise<Paginated<JournalEntry>>;
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry>;
  voidJournalEntry(id: string): Promise<JournalEntry | undefined>;

  /** POSTED lines joined with account metadata — the source for all reports. */
  listPostings(): Promise<PostingRow[]>;
}
```

Business rules live in `LedgerService`, **not** in the adapter. An adapter only
persists and reads back; it must not silently "fix" an unbalanced entry.

## Option A — PostgreSQL (wired, recommended)

- Schema: `packages/db/src/schema.ts` (Drizzle, `pg-core`).
- Adapter: `packages/db/src/postgres-repository.ts`.
- Migration SQL: `packages/db/migrations/0000_init.sql`.

```bash
cp .env.example .env
# DATABASE_URL=postgres://ledgerlab:ledgerlab@localhost:5432/ledgerlab

# Apply the schema (idempotent SQL). Or use drizzle-kit generate/migrate
# once you start evolving the schema.
pnpm --filter @ledgerlab/db migrate:sql

# Load the demo chart of accounts + journal entries (idempotent)
pnpm --filter @ledgerlab/db seed
```

Selecting the adapter is automatic: if `DATABASE_URL` is set, `resolveLedgerRepository()`
uses Postgres; otherwise it falls back to the seeded in-memory adapter.

### Connection pooling

The Postgres adapter uses a `postgres.js` pool (`packages/db/src/client.ts`). Size
it per environment with:

| Variable                  | Default | Purpose                                        |
| ------------------------- | ------- | ---------------------------------------------- |
| `DB_POOL_MAX`             | `10`    | Max pool connections per replica               |
| `DB_IDLE_TIMEOUT_SECONDS` | `30`    | Close idle connections after this many seconds |

Keep `DB_POOL_MAX × replicas` below the database's connection limit. On managed
Postgres that enforces a low cap, put a pooler (PgBouncer / provider pooler) in
front and point `DATABASE_URL` at it.

### Accounting rules enforced in the service

- **Inactive accounts**: `POST /api/journal-entries` rejects (400) any line whose
  account has `isActive = false`. Deactivate via `PATCH /api/accounts/:id` with
  `{ "isActive": false }`.
- **Closed periods**: set `CLOSED_THROUGH=YYYY-MM-DD` to reject (400) any entry
  dated on or before that date. Unset means every period is open. The rule lives
  in `LedgerService`, so it applies identically to both adapters.

### Repository contract test

`apps/ledger-api/src/__tests__/repository-contract.test.ts` runs the same
balancing-invariant contract against the in-memory adapter always and the
Postgres adapter when `DATABASE_URL` is set. Run it against a real database with:

```bash
DATABASE_URL=postgres://ledgerlab:ledgerlab@localhost:5432/ledgerlab \
  pnpm --filter @ledgerlab/ledger-api test
```

> The contract test **truncates** `journal_lines`, `journal_entries` and
> `accounts` before each Postgres case, so runs are deterministic and isolated.
> Point `DATABASE_URL` at a **disposable** database, never production.

Local Postgres without Docker:

```bash
createuser ledgerlab --pwprompt
createdb ledgerlab -O ledgerlab
```

Or with Docker (if available):

```bash
docker run --name ledgerlab-db -e POSTGRES_USER=ledgerlab -e POSTGRES_PASSWORD=ledgerlab \
  -e POSTGRES_DB=ledgerlab -p 5432:5432 -d postgres:16
```

## Option B — MySQL / MariaDB

1. Add `mysql2` and a `mysqlTable` schema in `packages/db/src/schema.mysql.ts`.
2. Implement `MySqlLedgerRepository` against the same port.
3. Generate migrations with `drizzle-kit` (`dialect: "mysql"`).
4. Extend `resolveLedgerRepository()` to pick it from `DATABASE_URL` (e.g. the
   `mysql://` scheme) and widen the `kind` union.

## Option C — SQLite / libSQL

Useful for local dev and edge. Implement the port over `better-sqlite3` or
`@libsql/client`, store money as `INTEGER` (never `REAL`), and enable
`PRAGMA foreign_keys = ON` plus WAL mode.

## Option D — SQL Server

Implement the port with `mssql`/Drizzle `mssql-core`. Use `BIGINT` for
`amount_minor` and a `VARCHAR(4)` unique index on `accounts.code`.

## Data model

```
accounts(id, code UNIQUE, name, type, currency, is_active, created_at)
journal_entries(id, entry_date, memo, reference, status, created_at)
journal_lines(id, entry_id → journal_entries, account_id → accounts,
              amount_minor, position, memo)
```

**Money is `amount_minor`, a signed integer**: `> 0` debit, `< 0` credit.
No `REAL`/`FLOAT`/`DOUBLE` column may ever hold money.

## Migrations

- Never auto-sync schema in production. Run migrations as a deploy step or a
  one-off job, with the DB user that owns the schema.
- The app's runtime user should be least-privilege (SELECT/INSERT/UPDATE on the
  three tables; no DDL outside the migration step).
- Keep migrations forward-only and idempotent where possible (`CREATE TABLE IF NOT EXISTS`).

## Seeding

`packages/shared/src/seed.ts` defines the demo chart of accounts and entries.
`seed()` on the in-memory adapter and `pnpm --filter @ledgerlab/db seed` against
Postgres both consume it, so behaviour matches. Seeding is **idempotent**: accounts
are skipped by `code` and entries by `reference`, so re-running never duplicates
data (verified by running the seed twice: the second run creates 0 rows).

## Production checklist

- [ ] Managed database (RDS / Cloud SQL / Azure Flexible Server / Render
      Postgres) in a private network; not publicly reachable.
- [ ] TLS required; verify the certificate.
- [ ] Connection pool sized to the plan (start at 10); enable an idle timeout.
- [ ] Automated backups with a retention policy; **test a restore**.
- [ ] Point-in-time recovery or daily snapshots.
- [ ] Alerts on connection saturation and slow queries.
- [ ] Migrations applied before the new version starts serving traffic.
