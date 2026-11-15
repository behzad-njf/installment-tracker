import { monthIndexFrom } from './jalali'
import { sanitizeCheck, sanitizeCheckbook } from './checks'
import type { Check, Checkbook, DataFile, Lang, Loan, PaymentRecord, Settings, Theme } from './types'

export const STORAGE_KEY = 'finance.data.v5'
export const BACKUP_KEY = 'finance.backup.v5'

/** Older schemas, migrated up to v5 on load. */
const LEGACY_KEYS = ['finance.data.v4', 'finance.data.v3', 'finance.data.v2'] as const

const DEFAULT_SETTINGS: Settings = { lang: 'fa', theme: 'light', seeded: false }

/** Seeded once on first run so the dashboard is never an empty page; clearable in the UI. */
export const DEMO_LOANS: Loan[] = [
  {
    id: 'demo-mortgage',
    name: 'وام مسکن',
    amount: 4_500_000,
    startYear: 1405,
    startMonth: 4,
    duration: 12,
    payments: [],
    createdAt: '2026-03-21T00:00:00.000Z',
    deadlineDay: 23,
  },
  {
    id: 'demo-laptop',
    name: 'اقساط لپ‌تاپ',
    amount: 1_850_000,
    startYear: 1405,
    startMonth: 6,
    duration: 4,
    payments: [],
    createdAt: '2026-05-22T00:00:00.000Z',
    deadlineDay: 15,
  },
  {
    id: 'demo-car',
    name: 'وام خودرو',
    amount: 6_200_000,
    startYear: 1405,
    startMonth: 9,
    duration: 24,
    payments: [],
    createdAt: '2026-08-23T00:00:00.000Z',
    deadlineDay: 5,
  },
]

export const DEMO_CHECKBOOKS: Checkbook[] = [
  {
    id: 'demo-checkbook',
    bank: 'بانک ملی',
    accountNumber: '0123456789012',
    serialFrom: 100,
    serialTo: 125,
    createdAt: '2026-03-21T00:00:00.000Z',
  },
]

export const DEMO_CHECKS: Check[] = [
  {
    id: 'demo-check-1',
    checkbookId: 'demo-checkbook',
    serial: 100,
    payee: 'بیمه شخص ثالث',
    amount: 3_200_000,
    purpose: 'بیمه خودرو',
    dueYear: 1405,
    dueMonth: 11,
    dueDay: 18,
    note: '',
    status: 'issued',
    updatedAt: '2026-03-21T00:00:00.000Z',
  },
  {
    id: 'demo-check-2',
    checkbookId: 'demo-checkbook',
    serial: 101,
    payee: 'تعمیرات ساختمان',
    amount: 1_150_000,
    purpose: 'تعمیرات ملک',
    dueYear: 1405,
    dueMonth: 12,
    dueDay: 5,
    note: 'تعمیرات ملک',
    status: 'issued',
    updatedAt: '2026-03-21T00:00:00.000Z',
  },
  {
    id: 'demo-check-3',
    checkbookId: 'demo-checkbook',
    serial: 102,
    payee: '',
    amount: 0,
    purpose: '',
    note: '',
    status: 'blank',
    updatedAt: '2026-03-21T00:00:00.000Z',
  },
]

export function newLoanId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ?? `loan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function isPaymentRecord(raw: unknown): raw is PaymentRecord {
  if (!isRecord(raw)) return false
  return (
    typeof raw.id === 'string' &&
    raw.id.length > 0 &&
    typeof raw.amount === 'number' &&
    Number.isFinite(raw.amount) &&
    raw.amount > 0 &&
    typeof raw.monthIndex === 'number' &&
    Number.isInteger(raw.monthIndex) &&
    typeof raw.paidAt === 'string' &&
    !Number.isNaN(Date.parse(raw.paidAt))
  )
}

/** Trust boundary: everything from localStorage or a pasted JSON file passes through here. */
function sanitizeLoan(raw: unknown): Loan | null {
  if (!isRecord(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : ''
  const amount = typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : 0
  if (!name || amount <= 0) return null
  if (!isInt(raw.startYear, 1300, 1500)) return null
  if (!isInt(raw.startMonth, 1, 12)) return null
  if (!isInt(raw.duration, 1, 120)) return null

  const duration = raw.duration
  const start = monthIndexFrom(raw.startYear, raw.startMonth)

  const payments = Array.isArray(raw.payments)
    ? raw.payments
        .filter(isPaymentRecord)
        .filter(p => isInt(p.monthIndex, start, start + duration - 1))
        .sort((a, b) => a.monthIndex - b.monthIndex)
    : []

  const deadlineDay = isInt(raw.deadlineDay, 1, 31) ? raw.deadlineDay : 1

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newLoanId(),
    name,
    amount,
    startYear: raw.startYear,
    startMonth: raw.startMonth,
    duration,
    payments,
    createdAt:
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : new Date().toISOString(),
    deadlineDay,
  }
}

function sanitizeSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {}
  const lang: Lang = source.lang === 'en' ? 'en' : 'fa'
  const theme: Theme = source.theme === 'dark' ? 'dark' : 'light'
  return { lang, theme, seeded: source.seeded === true }
}

/** Returns null when the payload is unusable, so callers can fall back to defaults. */
export function parseDataFile(raw: unknown): DataFile | null {
  if (!isRecord(raw)) return null
  if (!Array.isArray(raw.loans)) return null
  if (raw.version !== 2 && raw.version !== 3 && raw.version !== 4 && raw.version !== 5) return null

  const settings = sanitizeSettings(raw.settings)
  const loans = raw.loans.map(sanitizeLoan).filter((loan): loan is Loan => loan !== null)

  const checkbooks = Array.isArray(raw.checkbooks)
    ? raw.checkbooks.map(sanitizeCheckbook).filter((book): book is Checkbook => book !== null)
    : []

  const bookIds = new Set(checkbooks.map(book => book.id))
  const checks = Array.isArray(raw.checks)
    ? raw.checks
        .map(rawCheck => sanitizeCheck(rawCheck, bookIds))
        .filter((check): check is Check => check !== null)
    : []

  return { version: 5, settings, loans, checkbooks, checks }
}

function readRawKey(key: string): unknown {
  try {
    const text = localStorage.getItem(key)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

function readRaw(): unknown {
  return readRawKey(STORAGE_KEY)
}

/** Settings without seeding or writing — safe to call before React renders (i18n bootstrap). */
export function peekSettings(): Settings {
  const parsed = parseDataFile(readRaw())
  return parsed ? parsed.settings : { ...DEFAULT_SETTINGS }
}

export function loadData(): DataFile {
  const parsed = parseDataFile(readRaw())
  if (parsed) return parsed

  // v2 → v3 migration: keep every stored loan, seed empty checkbooks.
  for (const legacyKey of LEGACY_KEYS) {
    const legacy = parseDataFile(readRawKey(legacyKey))
    if (legacy) {
      saveData(legacy)
      return legacy
    }
  }

  const seeded: DataFile = {
    version: 5,
    settings: { ...DEFAULT_SETTINGS, seeded: true },
    loans: DEMO_LOANS,
    checkbooks: DEMO_CHECKBOOKS,
    checks: DEMO_CHECKS,
  }
  saveData(seeded)
  return seeded
}

/** Download-safe JSON string of the current data file. */
export function exportDataFile(data: DataFile): string {
  return JSON.stringify(data, null, 2)
}

/** Validate an imported JSON payload; returns null when unusable. */
export function importDataFile(text: string): DataFile | null {
  try {
    return parseDataFile(JSON.parse(text))
  } catch {
    return null
  }
}

export function saveData(data: DataFile): boolean {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, json)
    localStorage.setItem(BACKUP_KEY, json)
    return true
  } catch {
    // Quota or private-mode failure: keep the app usable, callers surface a toast.
    return false
  }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const current = loadData()
  const settings = { ...current.settings, ...patch }
  saveData({ ...current, settings })
  return settings
}