import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, LayoutDashboard, ListTree, PlusCircle, Wallet } from "lucide-react";
import { cn } from "@ledgerlab/ui";
import { useAsync } from "../lib/useAsync";
import { api } from "../lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/ledger", label: "Ledger", icon: BookOpen, end: false },
  { to: "/ledger/new", label: "New entry", icon: PlusCircle, end: true },
  { to: "/accounts", label: "Chart of accounts", icon: ListTree, end: true },
  { to: "/reports", label: "Reports", icon: Wallet, end: true },
];

const NAV_LINK =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function navLinkClass(isActive: boolean): string {
  return cn(
    NAV_LINK,
    isActive ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
  );
}

function ServiceStatus() {
  const { data, error, loading } = useAsync(() => api.ledger.health(), []);
  const ok = Boolean(data) && !error;
  const dot = loading ? "bg-zinc-300" : ok ? "bg-emerald-500" : "bg-red-500";
  const label = loading ? "checking…" : ok ? `ledger · ${data?.repository}` : "ledger offline";
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500">
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4">
          <span className="text-sm font-semibold tracking-tight text-zinc-900">LedgerLab</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navLinkClass(isActive)}>
              <Icon className="size-4 text-zinc-400" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-200">
          <ServiceStatus />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white md:hidden">
          <div className="flex h-14 items-center px-4">
            <span className="text-sm font-semibold text-zinc-900">LedgerLab</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(navLinkClass(isActive), "shrink-0 py-1.5")}
              >
                <Icon className="size-4 text-zinc-400" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
