# AGENTS.md — Personal Finance Dashboard (اقساط)

Digital replacement for a Google Sheet of monthly installments/debts.
Fully client-side, free, no backend, no paid services, no developer-account APIs.

## Stack (pinned at scaffold time)

| Concern    | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | React 19 + Vite + TypeScript                                  |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme`)      |
| Components | shadcn/ui (new-york, CSS vars) + `lucide-react`                |
| Charts     | Recharts 3                                                    |
| i18n       | `react-i18next` + `i18next`, `fa` default, `en`, RTL default   |
| Dates      | **no date lib** — `Intl.DateTimeFormat('fa-IR-u-ca-persian')`  |
| State      | `useState` + `useContext` + `localStorage` (versioned keys)    |
| Motion     | `motion` (framer-motion) for micro-animations only             |

Rule: do not add a dependency that replaces <30 lines of local code. Ask first.

## Commands

```bash
export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"   # node not on PATH in non-interactive shells
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run preview
npm run lint
npx tsc --noEmit
npm test           # vitest run — pure logic in src/lib only
```

## Structure

```
src/
  main.tsx              # i18n bootstrap before render
  App.tsx               # providers + shell + dashboard
  i18n/                 # index.ts (init), locales/fa.json, locales/en.json
  components/
    ui/                 # shadcn primitives only — never hand-edit, re-add instead
    layout/             # AppShell, Header, ThemeToggle, LangToggle
    dashboard/          # SummaryCards, LoanTable, LoanRow, BreakdownChart, EmptyState
    loans/              # AddEditLoanDialog, DeleteLoanDialog, PaidMonthsPicker
  lib/
    types.ts            # Loan, Settings, LoanDraft, MonthIndex
    loans.ts            # pure calc: activeMonths, monthlyTotals, summaryFor, progress
    storage.ts          # load/save/migrate localStorage, import/export JSON
    money.ts            # currency + digit formatting per locale
    jalali.ts           # month names, current Jalali month index, year helpers
    utils.ts            # cn()
  hooks/                # useLoans (context), useDirection, useTheme
```

## Conventions

- **No hardcoded user-visible text.** Every string via `t('key')`; `fa.json` and
  `en.json` get the key in the same commit. Persist language in
  `localStorage` (`finance.lang`); set `<html lang dir>` on change.
- **RTL first.** Layouts must work with `dir="rtl"` by default. Use logical
  utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`)
  or `rtl:`/`ltr:` modifiers. Never `ml-*`/`mr-*`/`left-*`/`right-*` for
  symmetric spacing. Recharts needs `reversed` axes / mirrored layout handled in
  the chart component — no CSS transforms.
- **Multi-year months.** A month is an absolute Jalali month index
  `year * 12 + (month - 1)`, 0-based. `Loan.startYear` + `startMonth` (1–12) map
  to it; `paidMonths: number[]` stores absolute indices, so schedules can spill
  into the next year safely. Never store bare 1–12 in `paidMonths`.
- **Numbers:** `fa` → Persian digits (`۱۲۳٬۴۵۶`), `en` → `123,456`. Toman.
  One formatter in `lib/money.ts`; components never format inline.
- **Persistence:** one key `finance.data.v1` = `{ version, settings, loans }`.
  Every read/write goes through `storage.ts`, which validates shape and falls
  back to seed data on corruption. Schema change → bump `version` + migration
  branch; never silently drop user data.
- **Data loss is the main risk** (no backend): keep JSON export/import, never
  mutate stored loans during render.
- **State:** all mutations live in `useLoans` context (add/update/remove/
  togglePaidMonth/clearDemo). Components are presentational; no `localStorage`
  access outside `storage.ts`.
- **Calc is pure and tested.** `lib/loans.ts` holds all month math; a loan is
  active in month `m` iff `m` is in `[start, start + duration - 1]`. No date math
  in components.
- **Accessibility:** every dialog has a title, icon-only buttons get
  `aria-label`, tables use real `th`/`scope`, focus rings never removed,
  `prefers-reduced-motion` respected.
- **Styling:** semantic CSS vars from shadcn (`--background`, `--primary`, …) +
  `@theme`. No hex colors in components. Dark mode = `.dark` on `<html>`,
  persisted in `finance.theme`.
- Code style: TypeScript strict, no `any`, named exports for components,
  files < 200 lines, explicit return types on exported functions.

## Phase gates

Work phase by phase; **stop for user confirmation after each phase**. Definition
of done per phase: `npx tsc --noEmit` clean, `npm run lint` clean,
`npm run build` succeeds, feature exercised in a real browser. Report what ran,
what passed, what is deferred.

## Non-goals

Backend, database, auth, cloud sync, bank integrations, multi-user, PWA/offline
service worker, test frameworks beyond vitest for `src/lib`.

Exception: Google Drive backup (`src/lib/googleDrive.ts`) is the only
user-owned OAuth client allowed — free Google Cloud project, scope
`drive.file`, client ID from `VITE_GOOGLE_CLIENT_ID`. No secret, no backend.
