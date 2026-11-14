# Aghsat — Monthly Installments Dashboard

🇮🇷 [نسخه فارسی](README.md)

A digital replacement for a Google Sheet used to track monthly installments and
debts. Fully client-side: no backend, no signup, no paid service — data never
leaves your browser.

Version **2.5.0** · Persian/English · RTL-first · Jalali calendar · installable (PWA) and offline

## Features

- **Loans:** amount per installment, number of installments, start year/month
  (multi-year safe) and a deadline day
- **Payments:** full or partial payment per month, plus per-loan payment history
- **Current month summary:** total due, paid, remaining, next month estimate
- **Deadline alert:** banner for installments due within 3 days — a compact table
  with loan name, due date, amount and a pay button; overdue loans listed too
- **Year calendar:** 12 months color-coded (paid / overdue); clicking a month opens
  a dialog listing that month's loans with totals for **total / paid / unpaid**
- **Chart:** each loan's share of the monthly cost (Recharts)
- **Open / closed loans tabs**
- **Bilingual:** Persian (default, RTL) and English; Persian or Latin digits, Toman
- **Light / dark theme**
- **PWA:** installable, versioned offline cache with an in-app update prompt
- **Backup:** JSON export/import + an automatic internal backup in `localStorage`

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## Scripts

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Dev server                                        |
| `npm run build`   | `tsc -b` + Vite build + precache injection into SW |
| `npm run preview` | Preview the production build                      |
| `npm run lint`    | oxlint                                            |
| `npm test`        | Pure calculation tests in `src/lib` (vitest)      |

## Data & privacy

- Everything lives in browser `localStorage`; no network calls are made.
- Primary key: `finance.data.v2` (versioned with migrations); internal backup key:
  `finance.backup.v2`.
- Move data between devices with the JSON export/import buttons in the header.
- Clearing "site data" in the browser wipes your data — export a JSON backup first.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · Recharts ·
react-i18next · hand-rolled Service Worker (no PWA plugin)

Dates use only `Intl.DateTimeFormat('fa-IR-u-ca-persian')` — no date library.
Months are stored as absolute indices `year * 12 + (month - 1)`, so multi-year
schedules never break at the year boundary.

## Structure

```
src/
  components/dashboard/   summary cards, loans table, year calendar, payment dialogs
  components/loans/       add/edit/delete loan forms + context
  components/ui/          shadcn/ui primitives
  lib/                    pure math, storage, money and Jalali helpers (tested)
  i18n/                   fa.json, en.json
scripts/                  Service Worker precache injection
```

## License

Completely free, no conditions — released into the public domain
([Unlicense](LICENSE)). Anyone may copy, modify, publish, sell or use it for any
purpose, commercial or not, without permission or attribution.
