import { Fragment, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TableWrap,
  cn,
} from "@ledgerlab/ui";
import { Async } from "../components/states";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { formatDate, money } from "../lib/format";

const PAGE_SIZE = 20;

export function LedgerPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const { data, loading, error, reload } = useAsync(
    () =>
      api.ledger.listJournalEntries({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    [page, status, from, to],
  );

  const hasFilters = Boolean(status || from || to);

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function voidEntry(id: string) {
    if (!window.confirm("Void this entry? It will no longer affect reports.")) return;
    setBusyId(id);
    try {
      await api.ledger.voidJournalEntry(id);
      reload();
    } finally {
      setBusyId(undefined);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="General ledger" description="Every posted journal entry, newest first." />

      <Card padded={false}>
        <div className="flex flex-wrap items-end gap-4 border-b border-zinc-200 px-4 py-3">
          <Field label="Status" htmlFor="filter-status" className="w-40">
            <Select
              id="filter-status"
              value={status}
              onChange={(e) => changeFilter(setStatus, e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="POSTED">Posted</option>
              <option value="VOID">Void</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </Field>
          <Field label="From" htmlFor="filter-from" className="w-44">
            <Input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => changeFilter(setFrom, e.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="filter-to" className="w-44">
            <Input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => changeFilter(setTo, e.target.value)}
            />
          </Field>
          <Button type="button" onClick={clearFilters} disabled={!hasFilters}>
            Clear
          </Button>
        </div>

        <Async
          loading={loading}
          error={error}
          data={data}
          onRetry={reload}
          isEmpty={(result) => result.data.length === 0}
          empty={
            <div className="p-4">
              <EmptyState
                title={hasFilters ? "No entries match these filters" : "No journal entries yet"}
                description={
                  hasFilters
                    ? "Try widening the date range or clearing the status filter."
                    : "Entries you post will appear here."
                }
              />
            </div>
          }
        >
          {(result) => (
            <>
              <TableWrap>
                <THead>
                  <TR>
                    <TH className="w-28">Date</TH>
                    <TH>Memo</TH>
                    <TH className="w-28">Reference</TH>
                    <TH className="w-24">Status</TH>
                    <TH numeric className="w-28">
                      Amount
                    </TH>
                    <TH className="w-32" />
                  </TR>
                </THead>
                <TBody>
                  {result.data.map((entry) => {
                    const total = entry.lines
                      .filter((line) => line.amountMinor > 0)
                      .reduce((sum, line) => sum + line.amountMinor, 0);
                    const isOpen = expanded === entry.id;
                    return (
                      <Fragment key={entry.id}>
                        <TR>
                          <TD className="whitespace-nowrap">{formatDate(entry.date)}</TD>
                          <TD>
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={`entry-lines-${entry.id}`}
                              onClick={() => setExpanded(isOpen ? undefined : entry.id)}
                              className="rounded-sm text-left font-medium text-zinc-900 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                              {entry.memo}
                            </button>
                            <span className="ml-2 text-xs text-zinc-400">{entry.lines.length} lines</span>
                          </TD>
                          <TD muted>{entry.reference ?? "—"}</TD>
                          <TD>
                            <Badge
                              tone={
                                entry.status === "POSTED"
                                  ? "positive"
                                  : entry.status === "VOID"
                                    ? "negative"
                                    : "warning"
                              }
                            >
                              {entry.status.toLowerCase()}
                            </Badge>
                          </TD>
                          <TD numeric>{money(total)}</TD>
                          <TD>
                            {entry.status === "POSTED" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={busyId === entry.id}
                                onClick={() => void voidEntry(entry.id)}
                              >
                                Void
                              </Button>
                            ) : null}
                          </TD>
                        </TR>
                        {isOpen ? (
                          <TR id={`entry-lines-${entry.id}`} className="bg-zinc-50/70">
                            <TD colSpan={6} className="p-0">
                              <div className="px-4 py-3">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs uppercase tracking-wide text-zinc-500">
                                      <th scope="col" className="py-1 text-left font-medium">
                                        Account
                                      </th>
                                      <th scope="col" className="py-1 text-right font-medium">
                                        Debit
                                      </th>
                                      <th scope="col" className="py-1 text-right font-medium">
                                        Credit
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {entry.lines.map((line) => (
                                      <tr key={line.id} className="border-t border-zinc-200/70">
                                        <td className="py-1.5 text-zinc-700">
                                          <span className="font-mono text-xs text-zinc-500">
                                            {line.accountCode ?? "----"}
                                          </span>{" "}
                                          {line.accountName ?? line.accountId}
                                        </td>
                                        <td className="py-1.5 text-right tabular-nums text-zinc-800">
                                          {line.amountMinor > 0 ? money(line.amountMinor) : ""}
                                        </td>
                                        <td className="py-1.5 text-right tabular-nums text-zinc-800">
                                          {line.amountMinor < 0 ? money(Math.abs(line.amountMinor)) : ""}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </TD>
                          </TR>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TBody>
              </TableWrap>
              <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
                <span>
                  Page {result.page} of {totalPages} · {result.total} entries
                </span>
                <div className="flex gap-2">
                  <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Async>
      </Card>
    </div>
  );
}
