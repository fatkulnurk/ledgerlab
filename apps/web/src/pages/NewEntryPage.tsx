import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMinor, isBalanced, parseAmountToMinor } from "@ledgerlab/shared";
import { Badge, Button, Card, Field, Input, PageHeader, Select, TD, TR } from "@ledgerlab/ui";
import { Async } from "../components/states";
import { api, ApiError } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { money, today } from "../lib/format";

interface DraftLine {
  accountId: string;
  amount: string;
  side: "DEBIT" | "CREDIT";
}

let lineKey = 0;
const blankLine = (): DraftLine & { key: number } => ({
  key: lineKey++,
  accountId: "",
  amount: "",
  side: "DEBIT",
});

export function NewEntryPage() {
  const navigate = useNavigate();
  const accounts = useAsync(() => api.ledger.listAccounts(), []);
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Array<DraftLine & { key: number }>>([blankLine(), blankLine()]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: number) {
    setLines((current) => (current.length <= 2 ? current : current.filter((line) => line.key !== key)));
  }

  function signedMinor(line: DraftLine): number | undefined {
    if (!line.amount.trim()) return undefined;
    try {
      const value = Math.abs(parseAmountToMinor(line.amount));
      return line.side === "DEBIT" ? value : -value;
    } catch {
      return undefined;
    }
  }

  const parsed = lines.map(signedMinor);
  const complete = parsed.every((value) => value !== undefined);
  const total = parsed.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const balanced = complete && isBalanced(parsed as number[]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!balanced) {
      setError("Debits and credits must balance before posting.");
      return;
    }
    setSubmitting(true);
    try {
      await api.ledger.createJournalEntry({
        date,
        memo,
        reference: reference.trim() || undefined,
        lines: lines.map((line) => ({ accountId: line.accountId, amountMinor: signedMinor(line)! })),
      });
      navigate("/ledger");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New journal entry"
        description="Debits must equal credits before the entry can be posted."
      />

      <Async loading={accounts.loading} error={accounts.error} data={accounts.data} onRetry={accounts.reload}>
        {(accountList) => (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <Card title="Entry details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Date" htmlFor="date">
                  <Input
                    id="date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field label="Memo" htmlFor="memo">
                  <Input
                    id="memo"
                    required
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Invoice #1043 — Acme Ltd."
                  />
                </Field>
                <Field label="Reference" htmlFor="reference" hint="Optional">
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="INV-1043"
                  />
                </Field>
              </div>
            </Card>

            <Card
              title="Lines"
              actions={
                <Badge tone={complete ? (balanced ? "positive" : "negative") : "neutral"}>
                  {complete ? (balanced ? "Balanced" : `Off by ${money(Math.abs(total))}`) : "Incomplete"}
                </Badge>
              }
              padded={false}
            >
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200">
                  <tr className="text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-2.5 text-left font-medium">Account</th>
                    <th className="px-4 py-2.5 text-left font-medium">Side</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lines.map((line) => (
                    <TR key={line.key}>
                      <TD className="w-1/2">
                        <Select
                          required
                          value={line.accountId}
                          onChange={(e) => updateLine(line.key, { accountId: e.target.value })}
                        >
                          <option value="">Select account…</option>
                          {accountList.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </Select>
                      </TD>
                      <TD>
                        <Select
                          value={line.side}
                          onChange={(e) =>
                            updateLine(line.key, { side: e.target.value as DraftLine["side"] })
                          }
                        >
                          <option value="DEBIT">Debit</option>
                          <option value="CREDIT">Credit</option>
                        </Select>
                      </TD>
                      <TD numeric className="w-40">
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                          className="text-right"
                        />
                      </TD>
                      <TD>
                        <Button size="sm" variant="ghost" onClick={() => removeLine(line.key)} type="button">
                          Remove
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
                <Button type="button" onClick={() => setLines((current) => [...current, blankLine()])}>
                  Add line
                </Button>
                <span className="text-sm text-zinc-600">
                  Net: <span className="tabular-nums">{formatMinor(total)}</span>
                </span>
              </div>
            </Card>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => navigate("/ledger")}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting} disabled={!balanced}>
                Post entry
              </Button>
            </div>
          </form>
        )}
      </Async>
    </div>
  );
}
