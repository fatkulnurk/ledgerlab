-- LedgerLab initial schema. Apply with `pnpm --filter @ledgerlab/db migrate:sql`
-- (or use drizzle-kit generate/migrate once you start evolving the schema).

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE entry_status AS ENUM ('DRAFT', 'POSTED', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS accounts (
  id          VARCHAR(64) PRIMARY KEY,
  code        VARCHAR(4)  NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  type        account_type NOT NULL,
  currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_type_idx ON accounts (type);

CREATE TABLE IF NOT EXISTS journal_entries (
  id          VARCHAR(64) PRIMARY KEY,
  entry_date  VARCHAR(10) NOT NULL,
  memo        TEXT NOT NULL,
  reference   VARCHAR(64),
  status      entry_status NOT NULL DEFAULT 'POSTED',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_entries_date_idx ON journal_entries (entry_date);

CREATE TABLE IF NOT EXISTS journal_lines (
  id            VARCHAR(64) PRIMARY KEY,
  entry_id      VARCHAR(64) NOT NULL REFERENCES journal_entries (id) ON DELETE CASCADE,
  account_id    VARCHAR(64) NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
  amount_minor  INTEGER NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  memo          VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS journal_lines_entry_idx ON journal_lines (entry_id);
CREATE INDEX IF NOT EXISTS journal_lines_account_idx ON journal_lines (account_id);
