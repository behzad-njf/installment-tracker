import type { Check, Checkbook, CheckbookDraft, CheckDraft, CheckStatus, MonthIndex } from './types'
import { daysInJalaliMonth, jalaliPartsFromDate, monthIndexFrom } from './jalali'

/** Lifecycle order: a blank check is defined but unused, then issued, then a terminal outcome. */
export const CHECK_STATUS_KEYS: CheckStatus[] = ['blank', 'issued', 'cleared', 'bounced', 'void']

/**
 * Allowed status moves. Only an issued check can be cleared or bounced, and the
 * terminal states are final — matches how a physical checkbook actually works.
 */
export const CHECK_STATUS_TRANSITIONS: Record<CheckStatus, CheckStatus[]> = {
  blank: ['issued', 'void'],
  issued: ['cleared', 'bounced', 'void'],
  cleared: [],
  bounced: [],
  void: [],
}

export function canTransitionCheck(from: CheckStatus, to: CheckStatus): boolean {
  return CHECK_STATUS_TRANSITIONS[from].includes(to)
}

export function isBlankCheck(check: Check): boolean {
  return check.status === 'blank'
}

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

/** Absolute Jalali month index a check is due in, or null for a check with no due date (blank). */
export function checkMonthIndex(check: Check): MonthIndex | null {
  if (check.dueYear === undefined || check.dueMonth === undefined) return null
  return check.dueYear * 12 + (check.dueMonth - 1)
}

/** Days until an issued check's due date, relative to `today`. Negative means overdue. */
export function daysUntilCheckDue(check: Check, today: Date = new Date()): number | null {
  if (check.status !== 'issued') return null
  if (check.dueDay === undefined) return null
  const dueIdx = checkMonthIndex(check)
  if (dueIdx === null) return null
  const todayParts = jalaliPartsFromDate(today)
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

/** Issued checks due within `days` days from today (0 = today). Sorted by due date ascending. */
export function upcomingChecks(checks: Check[], days: number, today: Date = new Date()): Check[] {
  return checks
    .filter(c => {
      const until = daysUntilCheckDue(c, today)
      return until !== null && until >= 0 && until <= days
    })
    .sort((a, b) => (daysUntilCheckDue(a, today) ?? 0) - (daysUntilCheckDue(b, today) ?? 0))
}

/** Issued checks already past their due date. Sorted oldest first. */
export function overdueChecks(checks: Check[], today: Date = new Date()): Check[] {
  return checks
    .filter(c => {
      const until = daysUntilCheckDue(c, today)
      return until !== null && until < 0
    })
    .sort((a, b) => (daysUntilCheckDue(a, today) ?? 0) - (daysUntilCheckDue(b, today) ?? 0))
}

/** Checks whose due month is `month` (blank checks have none and never match). */
export function checksInMonth(checks: Check[], month: MonthIndex): Check[] {
  return checks.filter(c => checkMonthIndex(c) === month)
}

export interface CheckSummary {
  count: number
  counts: Record<CheckStatus, number>
  amounts: Record<CheckStatus, number>
}

export function checkSummary(checks: Check[]): CheckSummary {
  const counts: Record<CheckStatus, number> = { blank: 0, issued: 0, cleared: 0, bounced: 0, void: 0 }
  const amounts: Record<CheckStatus, number> = { blank: 0, issued: 0, cleared: 0, bounced: 0, void: 0 }
  for (const check of checks) {
    counts[check.status] += 1
    amounts[check.status] += check.amount
  }
  return { count: checks.length, counts, amounts }
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

/** Build a blank check: serial only, no payee/amount/due date. */
export function newCheckShell(checkbookId: string, serial: number): Check {
  return {
    id: newCheckId(),
    checkbookId,
    serial,
    payee: '',
    amount: 0,
    purpose: '',
    note: '',
    status: 'blank',
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
  const bank =
    typeof source.bank === 'string' && source.bank.length > 0 ? source.bank.trim().slice(0, 60) : ''
  const accountNumber =
    typeof source.accountNumber === 'string' ? source.accountNumber.trim().slice(0, 40) : ''
  if (!bank) return null
  const isPositiveInt = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 9_999_999
  const serialFrom = isPositiveInt(source.serialFrom) ? source.serialFrom : undefined
  const serialTo = isPositiveInt(source.serialTo) ? source.serialTo : undefined
  return {
    id: typeof source.id === 'string' && source.id ? source.id : newCheckbookId(),
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

/** v4 → v5 statuses; `pending` splits into blank (shell) or issued (has payee + amount). */
function migrateStatus(raw: unknown, filled: boolean): CheckStatus {
  if (raw === 'paid') return 'cleared'
  if (raw === 'pending') return filled ? 'issued' : 'blank'
  if (raw === 'blank' || raw === 'issued' || raw === 'cleared' || raw === 'bounced' || raw === 'void') {
    return raw
  }
  return filled ? 'issued' : 'blank'
}

/** Trust boundary: check data from localStorage or an imported file. `bookIds` must already be sanitized; checks referencing unknown books are dropped. */
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
  // A check without a serial and without content is meaningless.
  if (!serial && (!payee || amount <= 0)) return null
  if (payee && amount <= 0) return null

  const status = migrateStatus(source.status, Boolean(payee) && amount > 0)
  // A blank check carries nothing but its serial.
  if (status === 'blank') {
    return {
      id: typeof source.id === 'string' && source.id ? source.id : newCheckId(),
      checkbookId,
      serial,
      payee: '',
      amount: 0,
      purpose: '',
      note: typeof source.note === 'string' ? source.note.trim().slice(0, 200) : '',
      status,
      updatedAt:
        typeof source.updatedAt === 'string' && !Number.isNaN(Date.parse(source.updatedAt))
          ? source.updatedAt
          : new Date().toISOString(),
    }
  }
  // Non-blank checks must carry a payee and an amount.
  if (!payee || amount <= 0) return null

  const purpose =
    typeof source.purpose === 'string' ? source.purpose.trim().slice(0, 120) : ''
  const dueYearRaw = Number(source.dueYear)
  const dueMonthRaw = Number(source.dueMonth)
  const dueDayRaw = Number(source.dueDay)
  const dueYear = Number.isInteger(dueYearRaw) && dueYearRaw >= 1300 && dueYearRaw <= 1500 ? dueYearRaw : undefined
  const dueMonth = Number.isInteger(dueMonthRaw) && dueMonthRaw >= 1 && dueMonthRaw <= 12 ? dueMonthRaw : undefined
  const dueDay = Number.isInteger(dueDayRaw) && dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : undefined
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
    bank: draft.bank,
    accountNumber: draft.accountNumber,
    serialFrom: draft.serialFrom,
    serialTo: draft.serialTo,
    createdAt: new Date().toISOString(),
  }
}

/** A blank check needs only a serial; an issued one needs payee, amount and purpose. */
export function newCheck(draft: CheckDraft): Check | null {
  if (!draft.checkbookId) return null
  const status = draft.status ?? 'blank'
  if (status === 'blank') {
    return {
      id: newCheckId(),
      checkbookId: draft.checkbookId,
      serial: draft.serial,
      payee: '',
      amount: 0,
      purpose: '',
      note: draft.note,
      status,
      updatedAt: new Date().toISOString(),
    }
  }
  if (status !== 'issued') return null
  if (!draft.payee || draft.payee.trim() === '') return null
  if (!draft.amount || draft.amount <= 0 || !Number.isFinite(draft.amount)) return null
  if (!draft.purpose || draft.purpose.trim() === '') return null
  return {
    id: newCheckId(),
    checkbookId: draft.checkbookId,
    serial: draft.serial,
    payee: draft.payee.trim(),
    amount: draft.amount,
    purpose: draft.purpose.trim(),
    dueYear: draft.dueYear,
    dueMonth: draft.dueMonth,
    dueDay: draft.dueDay,
    note: draft.note,
    status,
    updatedAt: new Date().toISOString(),
  }
}
