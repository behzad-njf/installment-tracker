# PLAN — Personal Finance Dashboard (اقساط / installments)

Target dir: `/home/mrhib/Frontend/finance` (empty). Node v24.21.0, npm 12.2.1.
Stack pinned: react 19.3, vite 7, typescript 5.x (npm "latest" reports 7.0.2 — verify before use),
tailwindcss 4.3.5 + @tailwindcss/vite 4.3.5, shadcn/ui (new-york v4 registry, reachable),
recharts 3.x, react-i18next 18 + i18next 27, lucide-react, motion.
Dropped from the original brief: `date-fns-jalali` / `dayjs` — `Intl.DateTimeFormat('fa-IR-u-ca-persian')`
gives Jalali months/years with zero deps (add date-fns-jalali only if real date arithmetic appears later).

## Phase 0 — Scaffold + tooling (30 min)
1. `npm create vite@latest . -- --template react-ts` in the empty dir; `npm i`.
2. Tailwind v4: `npm i tailwindcss @tailwindcss/vite`, plugin in `vite.config.ts`, `@import "tailwindcss";` in `src/index.css`.
3. Path alias `@/*` (vite + tsconfig `paths`).
4. `npx shadcn@latest init` (new-york, neutral base, CSS vars) then add:
   `button input label dialog select table card badge dropdown-menu sonner tooltip separator skeleton switch alert-dialog`.
5. Fonts: install `@fontsource-variable/vazirmatn` (self-hosted, offline-safe) + Inter fallback for `en`.
6. Theme tokens in `src/index.css`: `@theme`, light/dark palettes, `--font-sans` per direction.
Gate: `npm run dev` serves, `npx tsc --noEmit` + `npm run build` clean.

## Phase 1 — Domain model + pure calc (logic first, no UI)
1. `lib/types.ts`: `Loan { id, name, amount, startMonth: 1..12, startYear, duration: 1..60, paidMonths: number[] }`
   (`paidMonths` stores absolute month indices `year*12 + month`; keep a doc comment so the array stays
   unambiguous. Spec-literal `paidMonths: number[]` of 1..12 only works if data is single-year — decision Q3.)
2. `lib/loans.ts`: `activeMonths(loan)`, `isActiveIn(loan, monthIndex)`, `monthlyTotals(loans)`,
   `summaryFor(loans, monthIndex)` → `{ totalMonthly, paidThisMonth, remainingThisMonth, overdueCount }`,
   `progress(loan, monthIndex)`.
3. `lib/storage.ts`: versioned `finance.data.v1`, shape validation, migration hook, demo seed on first run,
   JSON export/import.
4. Vitest unit tests for `loans.ts` (boundaries: duration 1, start 12 spilling into next year, paid/unpaid mix).
Gate: `npm test` green; numbers hand-checked against the old sheet logic.

## Phase 2 — i18n + RTL shell
1. `i18n/index.ts` — `fa` default + `en`, `fallbackLng: 'fa'`, namespaces `common`/`dashboard`; `main.tsx` awaits init.
2. `fa.json` + `en.json` complete key set; `fa` uses Persian digits via `lib/money.ts`.
3. `useDirection`/`useTheme`: set `<html lang dir class>`, persist `finance.lang` / `finance.theme`.
4. `lib/jalali.ts`: month names, current Jalali month index, `formatMonth`.
5. `AppShell`: header (logo/title, current-month badge, lang toggle, theme toggle) + content container.
Gate: toggling fa/en flips direction, digits, and fonts without layout breakage (screenshot both).

## Phase 3 — Dashboard core UI
1. `SummaryCards`: 3 cards (total monthly debt, paid this month, remaining this month) + progress ring/overdue hint.
2. `LoanTable`: shadcn Table, sortable columns (name, amount, start, duration, status), paid/unpaid badge per
   current month, edit/delete row actions, empty state, mobile → stacked cards.
3. `AddEditLoanDialog`: name, amount (thousand separators), start month Select, duration Input, optional
   pre-checked paid months; inline validation; same dialog for edit.
4. `DeleteLoanDialog` (AlertDialog) + `sonner` toasts + undo-lite (confirm only).
5. `useLoans` context wired to storage; render-time purity respected.
Gate: add → persists across reload; edit/delete work; no console errors.

## Phase 4 — Charts + animations
1. `BreakdownChart` (Recharts `BarChart`): per-month totals for the year, current month highlighted, tooltip in
   Persian, RTL-safe axis (`reversed` for fa, mirrored Y axis), responsive container, rounded bars, gradient fill.
2. Secondary visual: paid vs remaining donut or per-loan share list (cheap, one extra Recharts component).
3. `motion` micro-animations: card entrance stagger, row hover, dialog/select transitions, number count-up.
Gate: chart renders correctly in both directions and both themes; `prefers-reduced-motion` respected.

## Phase 5 — Persistence robustness + polish
1. Export/import JSON buttons (header menu) — guards against localStorage loss.
2. Corrupt-data recovery path, storage-full handling, cross-tab sync via `storage` event.
3. Mobile/tablet pass (360px, 768px), focus-visible audit, keyboard nav for dialogs/table actions.
4. Demo seed toggle (clear demo data / start empty).
Gate: manual smoke on all three viewports; a11y spot-check (tab order, labels, contrast).

## Phase 6 — Docs + release check
1. `README.md` (setup, scripts, data model, screenshots).
2. Final `AGENTS.md` (needs user approval to write — protected file).
3. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run preview` smoke, bundle-size note.
Gate: build artifact previewed and clicked through; report delivered.

## Open decisions (need answers before Phase 1)
- Q1 currency: Toman with Persian digits (default) / Toman Latin / Rial.
- Q2 year scope: single Jalali year 1405 / multi-year (loans can spill into next year).
- Q3 `paidMonths` shape: absolute month index (multi-year safe) vs 1..12 per spec.
- Q4 demo data on first run: seed 3 sample loans vs start empty.
