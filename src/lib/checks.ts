import type { Check, Checkbook, CheckbookDraft, CheckDraft, CheckStatus, MonthIndex } from './types'
import { daysInJalaliMonth, jalaliPartsFromDate, monthIndexFrom } from './jalali'

export const CHECK_STATUS_KEYS: CheckStatus[] = ['pending', 'paid', 'bounced']

/** Collision-safe id for checks/checkbooks — UUID when available, random string otherwise. */
function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ?? `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newCheckbookId(): string {
  return newId('checkbook')
}

export function newCheckId(): string {
  return newId('check')
}

/** Absolute Jalali month index a check is due in. */
export function checkMonthIndex(check: Check): MonthIndex {
  return check.dueYear * 12 + (check.dueMonth - 1)
}

/** Days until a pending check's due date, relative to `today`. Negative means overdue. */
export function daysUntilCheckDue(check: Check, today: Date = new Date()): number | null {
  if (check.status !== 'pending') return null
  const todayParts = jalaliPartsFromDate(today)
  const dueIdx = checkMonthIndex(check)
  const todayIdx = monthIndexFrom(todayParts.year, todayParts.month)
  if (dueIdx < todayIdx) {
    // Overdue: approximate using 30-day months for cross-month distance.
    return -(todayIdx - dueIdx) * 30 - (todayParts.day - check.dueDay)
  }
  if (dueIdx === todayIdx) {
    return check.dueDay - todayParts.day
  }
  // Future month: days left in current month + dueDay, plus 30 per intervening month.
  const daysInCurrent = daysInJalaliMonth(todayParts.year, todayParts.month)
  const monthsBetween = dueIdx - todayIdx - 1
  return daysInCurrent - todayParts.day + 1 + check.dueDay + monthsBetween * 30
}

/** Checks due within `days` days from today (0 = today). Sorted by due date ascending. */
export function upcomingChecks(checks: Check[], days: number, today: Date = new Date()): Check[] {
  return checks
    .filter(c => {
      const until = daysUntilCheckDue(c, today)
      return until !== null && until >= 0 && until <= days
    })
    .sort((a, b) => (daysUntilCheckDue(a, today) ?? 0) - (daysUntilCheckDue(b, today) ?? 0))
}

/** Pending checks already past their due date. Sorted oldest first. */
export function overdueChecks(checks: Check[], today: Date = new Date()): Check[] {
  return checks
    .filter(c => {
      const until = daysUntilCheckDue(c, today)
      return until !== null && until < 0
    })
    .sort((a, b) => (daysUntilCheckDue(a, today) ?? 0) - (daysUntilCheckDue(b, today) ?? 0))
}

/** Checks whose due month is `month`. */
export function checksInMonth(checks: Check[], month: MonthIndex): Check[] {
  return checks.filter(c => checkMonthIndex(c) === month)
}

export interface CheckSummary {
  count: number
  total: number
  pending: number
  paid: number
  bounced: number
  pendingAmount: number
}

export function checkSummary(checks: Check[]): CheckSummary {
  const totals: Record<CheckStatus, number> = { pending: 0, paid: 0, bounced: 0 }
  for (const check of checks) totals[check.status] += check.amount
  return {
    count: checks.length,
    total: Object.values(totals).reduce((sum, v) => sum + v, 0),
    pending: totals.pending,
    paid: totals.paid,
    bounced: totals.bounced,
    pendingAmount: totals.pending,
  }
}

/** Remaining (unused) serial capacity of a checkbook: range size minus registered checks. */
export function remainingChecks(book: Checkbook, checks: Check[]): number {
  const capacity =
    book.serialFrom && book.serialTo && book.serialTo >= book.serialFrom
      ? book.serialTo - book.serialFrom + 1
      : 0
  const used = checks.filter(c => c.checkbookId === book.id).length
  return Math.max(0, capacity - used)
}

/** Build a serial-only check shell (bulk creation) — no payee/amount yet. */
export function newCheckShell(checkbookId: string, serial: number, dueYear: number, dueMonth: number, dueDay: number): Check {
  return {
    id: newCheckId(),
    checkbookId,
    serial,
    payee: '',
    amount: 0,
    purpose: '',
    dueYear,
    dueMonth,
    dueDay,
    note: '',
    status: 'pending',
    updatedAt: new Date().toISOString(),
  }
}

/** Trust boundary: checkbook data from localStorage or an imported file. */
export function sanitizeCheckbook(raw: unknown): Checkbook | null {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    Array.isArray(raw)
  ) return null
  const source = raw as Record<string, unknown>
  const name = typeof source.name === 'string' ? source.name.trim().slice(0, 80) : ''
  if (!name) return null
  const bank =
    typeof source.bank === 'string' && source.bank.length > 0 ? source.bank.trim().slice(0, 60) : ''
  const accountNumber =
    typeof source.accountNumber === 'string' ? source.accountNumber.trim().slice(0, 40) : ''
  const isPositiveInt = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 9_999_999
  const serialFrom = isPositiveInt(source.serialFrom) ? source.serialFrom : undefined
  const serialTo = isPositiveInt(source.serialTo) ? source.serialTo : undefined
  return {
    id: typeof source.id === 'string' && source.id ? source.id : newCheckbookId(),
    name,
    bank,
    accountNumber,
    serialFrom,
    serialTo,
    createdAt:
      typeof source.createdAt === 'string' && !Number.isNaN(Date.parse(source.createdAt))
        ? source.createdAt
        : new Date().toISOString(),
  }
}

/** Trust boundary: check data from localStorage or an imported file. `books` must already be sanitized; checks referencing unknown books are dropped. */
export function sanitizeCheck(raw: unknown, bookIds: Set<string>): Check | null {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    Array.isArray(raw)
  ) return null
  const source = raw as Record<string, unknown>
  const checkbookId = typeof source.checkbookId === 'string' ? source.checkbookId : ''
  if (!bookIds.has(checkbookId)) return null
  const payee =
    typeof source.payee === 'string' ? source.payee.trim().slice(0, 80) : ''
  const serial =
    typeof source.serial === 'number' && Number.isInteger(source.serial) && source.serial >= 1 && source.serial <= 9_999_999
      ? source.serial
      : undefined
  const amount = typeof source.amount === 'number' && Number.isFinite(source.amount) ? source.amount : 0
  // Shells (serial only) are allowed; anything else must have a payee and a positive amount.
  if (!serial && (!payee || amount <= 0)) return null
  if (payee && amount <= 0) return null
  const purpose =
    typeof source.purpose === 'string' ? source.purpose.trim().slice(0, 120) : ''
  const dueYearRaw = Number(source.dueYear)
  const dueMonthRaw = Number(source.dueMonth)
  const dueDayRaw = Number(source.dueDay)
  const dueYear = Number.isInteger(dueYearRaw) && dueYearRaw >= 1300 && dueYearRaw <= 1500 ? dueYearRaw : null
  const dueMonth = Number.isInteger(dueMonthRaw) && dueMonthRaw >= 1 && dueMonthRaw <= 12 ? dueMonthRaw : null
  const dueDay = Number.isInteger(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : null
  if (dueYear === null || dueMonth === null || dueDay === null) return null
  const status = CHECK_STATUS_KEYS.includes(source.status as CheckStatus)
    ? (source.status as CheckStatus)
    : 'pending'
  const note =
    typeof source.note === 'string' ? source.note.trim().slice(0, 200) : ''
  return {
    id: typeof source.id === 'string' && source.id ? source.id : newCheckId(),
    checkbookId,
    serial,
    payee,
    amount,
    purpose,
    dueYear,
    dueMonth,
    dueDay,
    note,
    status,
    updatedAt:
      typeof source.updatedAt === 'string' && !Number.isNaN(Date.parse(source.updatedAt))
        ? source.updatedAt
        : new Date().toISOString(),
  }
}

/** Build a full Checkbook+Checks snapshot from an empty draft — used by fixtures/tests. */
export function newCheckbook(draft: CheckbookDraft): Checkbook {
  return {
    id: newCheckbookId(),
    name: draft.name,
    bank: draft.bank,
    accountNumber: draft.accountNumber,
    serialFrom: draft.serialFrom,
    serialTo: draft.serialTo,
    createdAt: new Date().toISOString(),
  }
}

export function newCheck(draft: CheckDraft): Check | null {
  if (!draft.checkbookId) return null
  if (!draft.payee || draft.payee.trim() === '') return null
  if (!draft.amount || draft.amount <= 0 || !Number.isFinite(draft.amount)) return null
  return {
    id: newCheckId(),
    checkbookId: draft.checkbookId,
    serial: draft.serial,
    payee: draft.payee.trim(),
    amount: draft.amount,
    purpose: draft.purpose,
    dueYear: draft.dueYear,
    dueMonth: draft.dueMonth,
    dueDay: draft.dueDay,
    note: draft.note,
    status: draft.status ?? 'pending',
    updatedAt: new Date().toISOString(),
  }
}
