import type { CreateAccountInput } from "./domain";

/**
 * Deterministic demo data used by the in-memory repository and by `pnpm seed`
 * against Postgres. Entries are expressed against account CODES so the same
 * dataset works whether or not ids are pre-assigned.
 */
export const SEED_ACCOUNTS: readonly CreateAccountInput[] = [
  { code: "1000", name: "Cash", type: "ASSET", currency: "USD" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", currency: "USD" },
  { code: "1500", name: "Equipment", type: "ASSET", currency: "USD" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", currency: "USD" },
  { code: "2100", name: "Sales Tax Payable", type: "LIABILITY", currency: "USD" },
  { code: "3000", name: "Owner's Equity", type: "EQUITY", currency: "USD" },
  { code: "4000", name: "Service Revenue", type: "REVENUE", currency: "USD" },
  { code: "5000", name: "Rent Expense", type: "EXPENSE", currency: "USD" },
];

export interface SeedEntryLine {
  accountCode: string;
  /** Signed minor units: > 0 debit, < 0 credit. */
  amountMinor: number;
  memo?: string;
}

export interface SeedEntry {
  date: string;
  memo: string;
  reference?: string;
  lines: SeedEntryLine[];
}

function daysAgo(days: number, today: Date): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Build demo journal entries relative to `today` so dashboards look current. */
export function buildSeedEntries(today: Date = new Date()): SeedEntry[] {
  return [
    {
      date: daysAgo(45, today),
      memo: "Owner capital contribution",
      reference: "CONTRIB-001",
      lines: [
        { accountCode: "1000", amountMinor: 5_000_00 },
        { accountCode: "3000", amountMinor: -5_000_00 },
      ],
    },
    {
      date: daysAgo(30, today),
      memo: "Invoice #1042 - Northwind Co.",
      reference: "INV-1042",
      lines: [
        { accountCode: "1100", amountMinor: 2_500_00 },
        { accountCode: "4000", amountMinor: -2_500_00 },
      ],
    },
    {
      date: daysAgo(21, today),
      memo: "Office rent - monthly",
      reference: "RENT",
      lines: [
        { accountCode: "5000", amountMinor: 1_200_00 },
        { accountCode: "1000", amountMinor: -1_200_00 },
      ],
    },
    {
      date: daysAgo(12, today),
      memo: "Collected invoice #1042",
      reference: "DEP-5521",
      lines: [
        { accountCode: "1000", amountMinor: 1_500_00 },
        { accountCode: "1100", amountMinor: -1_500_00 },
      ],
    },
    {
      date: daysAgo(5, today),
      memo: "Purchased laptop on account",
      reference: "BILL-88",
      lines: [
        { accountCode: "1500", amountMinor: 800_00 },
        { accountCode: "2000", amountMinor: -800_00 },
      ],
    },
  ];
}
