# UI audit — G2 (un-slop)

Scope: `apps/web` and `packages/ui`, reviewed against [`DESIGN.md`](DESIGN.md).
Goal G2 in [`TASKS.md`](TASKS.md) and the scoring rubric in
[`../README.md`](../README.md).

Status: **done**. Every checklist item in `DESIGN.md` is met; the two G2 backlog
items (`un-slop the dashboard`, `keyboard access`) are complete. Evidence is in
`docs/evidence/g2/`.

## Method

1. Read every screen (`DashboardPage`, `LedgerPage`, `NewEntryPage`,
   `AccountsPage`, `ReportsPage`) and every `packages/ui` primitive.
2. Grep for the banned patterns (gradient, `backdrop-*`, `blur`, coloured/glow
   shadows, emoji, `border-l`, multiple accent hues).
3. Run the app (`pnpm --filter … dev`) and inspect each route at 1280 px and
   390 px with a real browser, checking console errors and horizontal overflow.
4. Fix the source, then re-verify: screenshots, overflow check, console check,
   `pnpm typecheck && pnpm test && pnpm build && pnpm format:check`.

## Findings and fixes

| #   | Finding                                                                                                                                                           | Where                                                                                                      | Fix                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `EmptyState` drew a dashed, rounded, bordered box; every call site mounted it inside a bordered `Card`, i.e. a card in a card                                     | `packages/ui/src/empty-state.tsx:11`; callers `DashboardPage`, `LedgerPage`, `AccountsPage`, `ReportsPage` | Removed the border/radius from `EmptyState` (text + spacing only). The one caller outside a card (`NewEntryPage`) now wraps it in a `Card`.     |
| 2   | Money rendered inside a `Badge` was not tabular                                                                                                                   | `NewEntryPage.tsx` (balance badge), `ReportsPage.tsx` (out-of-balance badge)                               | Added `tabular-nums` to both badges (`DESIGN.md:26`).                                                                                           |
| 3   | Balance sheet had no empty state; an all-empty ledger rendered only the total row                                                                                 | `ReportsPage.tsx`                                                                                          | Added `isEmpty` keyed on the report totals (the synthetic `3999` earnings row means the row array is never empty) plus a designed `EmptyState`. |
| 4   | `"Inter"` was declared in the font stack but never loaded — no `<link>`, no `@font-face` — so it silently fell back                                               | `apps/web/src/index.css:7` vs `index.html`                                                                 | Use the system UI stack (allowed by `DESIGN.md:24`). No external font dependency.                                                               |
| 5   | `Badge` had a dead `accent` tone that would break the one-accent rule if used                                                                                     | `packages/ui/src/badge.tsx:4,11`                                                                           | Removed the `accent` tone from the union and the map.                                                                                           |
| 6   | The nav was rendered twice with divergent wrappers (drift risk)                                                                                                   | `AppShell.tsx`                                                                                             | Extracted one `NavLinks` component used by both the sidebar and the mobile bar.                                                                 |
| 7   | `/ledger/new` overflowed horizontally on mobile — the lines table had no scroll container, so its 361 px min-content pushed the document past the 375 px viewport | `NewEntryPage.tsx`                                                                                         | Wrapped the lines table in `TableWrap` and made the amount column responsive (`w-28 sm:w-40`).                                                  |
| 8   | A `favicon.ico` 404 logged a console error on every page                                                                                                          | `index.html`                                                                                               | Added an inline SVG data-URI favicon. No new binary asset, no extra request.                                                                    |

## Accessibility (TASKS.md — keyboard access)

| Change                                                                                                                 | Where                                  |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `LoadingBlock` announces via `role="status"` / `aria-live="polite"`                                                    | `apps/web/src/components/states.tsx`   |
| Service status announces via `role="status"` / `aria-live="polite"`                                                    | `apps/web/src/components/AppShell.tsx` |
| Both navs get `aria-label="Primary"`                                                                                   | `apps/web/src/components/AppShell.tsx` |
| Inner entry-lines table headers get `scope="col"`                                                                      | `apps/web/src/pages/NewEntryPage.tsx`  |
| Amount input links to its error via `aria-describedby`                                                                 | `apps/web/src/pages/NewEntryPage.tsx`  |
| `TableWrap` is a focusable scroll region with an optional label (`role="region"`, `tabIndex=0`, focus-visible outline) | `packages/ui/src/table.tsx`            |

The ledger list and the entry form are native controls in DOM order, so both are
operable without a mouse; roving arrow-key navigation was left out deliberately
(see Limitations).

## Evidence

Screenshots (1280 px desktop and 390 px mobile) in `docs/evidence/g2/`:
`dashboard`, `ledger`, `new-entry`, `accounts`, `reports` × `desktop`/`mobile`.

Browser checks (all routes, both widths):

- **No console errors** (only the Vite HMR and React DevTools dev messages).
- **No horizontal overflow** on any route at either width (the `/ledger/new`
  overflow found in review is fixed).
- Accessibility tree confirms `navigation "Primary"`, `status`, and
  `region "Journal entries"` with `columnheader`s.

Command gate:

```
pnpm ai:verify      # OK: 27 entries
pnpm typecheck      # 6/6
pnpm test           # 82 passed, 6 skipped (Postgres contract without DATABASE_URL)
pnpm build          # 3/3
pnpm format:check   # clean
```

## Compliant already (no change needed)

No gradients, no `backdrop-filter`/glass, no coloured or glowing shadows, no
emoji assets, no icon-in-rounded-square, no `border-left` + radius, and exactly
one accent hue (indigo; `emerald`/`amber`/`red` only for state). Money in tables
and stats was already right-aligned with `tabular-nums`.

## Limitations

- Screenshots were captured against the in-memory adapter (the default), which is
  what the dashboard shows locally; the Postgres adapter renders the same UI.
- Roving arrow-key navigation on the ledger list is not implemented; every
  control is reachable by Tab, which satisfies the backlog item.
- The mobile screenshots are the mobile breakpoint, not a native app.
