import { useState } from "react";
import { ACCOUNT_TYPES, type CreateAccountInput } from "@ledgerlab/shared";
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
} from "@ledgerlab/ui";
import { Async } from "../components/states";
import { api, ApiError } from "../lib/api";
import { useAsync } from "../lib/useAsync";

const EMPTY: CreateAccountInput = { code: "", name: "", type: "ASSET", currency: "USD" };

export function AccountsPage() {
  const { data, loading, error, reload } = useAsync(() => api.ledger.listAccounts(), []);
  const [form, setForm] = useState<CreateAccountInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(undefined);
    try {
      await api.ledger.createAccount(form);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Chart of accounts" description="The accounts your ledger can post to." />

      <Card title="Add an account">
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Code" htmlFor="code" hint="Exactly four digits">
            <Input
              id="code"
              inputMode="numeric"
              maxLength={4}
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="6200"
            />
          </Field>
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Software subscriptions"
            />
          </Field>
          <Field label="Type" htmlFor="type">
            <Select
              id="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CreateAccountInput["type"] })}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="primary" loading={submitting}>
              Add account
            </Button>
          </div>
        </form>
        {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
      </Card>

      <Card title="Accounts" padded={false}>
        <Async
          loading={loading}
          error={error}
          data={data}
          onRetry={reload}
          isEmpty={(accounts) => accounts.length === 0}
          empty={
            <EmptyState
              title="No accounts yet"
              description="Add your first account above to start recording journal entries."
            />
          }
        >
          {(accounts) => (
            <TableWrap label="Chart of accounts">
              <THead>
                <TR>
                  <TH className="w-24">Code</TH>
                  <TH>Name</TH>
                  <TH className="w-32">Type</TH>
                  <TH className="w-24">Currency</TH>
                  <TH className="w-24">Status</TH>
                </TR>
              </THead>
              <TBody>
                {accounts.map((account) => (
                  <TR key={account.id}>
                    <TD className="font-mono text-xs text-zinc-500">{account.code}</TD>
                    <TD className="font-medium text-zinc-900">{account.name}</TD>
                    <TD>
                      <Badge tone="neutral">{account.type.toLowerCase()}</Badge>
                    </TD>
                    <TD muted>{account.currency}</TD>
                    <TD muted>{account.isActive ? "active" : "inactive"}</TD>
                  </TR>
                ))}
              </TBody>
            </TableWrap>
          )}
        </Async>
      </Card>
    </div>
  );
}
