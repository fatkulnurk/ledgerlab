import type {
  BalanceSheet,
  DashboardSummary,
  IncomeStatement,
  PostingRow,
  TrialBalance,
} from "@ledgerlab/shared";
import { buildBalanceSheet, buildIncomeStatement, buildTrialBalance } from "@ledgerlab/shared";
import type { PostingSource } from "../ledger-client";

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function cashBalance(postings: readonly PostingRow[], asOf: string): number {
  return postings
    .filter((p) => p.entryStatus === "POSTED" && p.entryDate <= asOf && p.accountCode === "1000")
    .reduce((total, p) => total + p.amountMinor, 0);
}

/**
 * Reporting application layer. All reports are derived from a flat posting
 * list, so the service is stateless and trivially testable.
 */
export class ReportingService {
  constructor(private readonly source: PostingSource) {}

  private async postings(): Promise<PostingRow[]> {
    return this.source.listPostings();
  }

  async trialBalance(asOf: string): Promise<TrialBalance> {
    return buildTrialBalance(await this.postings(), asOf);
  }

  async incomeStatement(from: string, to: string): Promise<IncomeStatement> {
    return buildIncomeStatement(await this.postings(), from, to);
  }

  async balanceSheet(asOf: string): Promise<BalanceSheet> {
    return buildBalanceSheet(await this.postings(), asOf, "0000-01-01");
  }

  async dashboard(asOf: string): Promise<DashboardSummary> {
    const postings = await this.postings();
    const sheet = buildBalanceSheet(postings, asOf, "0000-01-01");
    const income = buildIncomeStatement(postings, monthStart(asOf), asOf);
    const posted = postings.filter((p) => p.entryStatus === "POSTED" && p.entryDate <= asOf);
    return {
      asOf,
      totalAssetsMinor: sheet.totalAssetsMinor,
      totalLiabilitiesMinor: sheet.totalLiabilitiesMinor,
      totalEquityMinor: sheet.totalEquityMinor,
      revenueMonthToDateMinor: income.totalRevenueMinor,
      expensesMonthToDateMinor: income.totalExpensesMinor,
      netIncomeMonthToDateMinor: income.netIncomeMinor,
      cashMinor: cashBalance(postings, asOf),
      accountCount: new Set(posted.map((p) => p.accountId)).size,
      entryCount: new Set(posted.map((p) => p.entryId)).size,
      balanced: sheet.outOfBalanceMinor === 0,
    };
  }
}
