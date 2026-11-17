import { daysInJalaliMonth, monthIndexFrom } from './jalali'
import type { MonthIndex, Person, PersonAccount, PersonTxn, PersonTxnKind } from './types'

function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ?? `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function newPersonId(): string {
  return newId('person')
}

export function newPersonAccountId(): string {
  return newId('account')
}

export function newPersonTxnId(): string {
  return newId('txn')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed === '' ? undefined : trimmed
}

/** Trust boundary: any stored/imported person passes through here. */
export function sanitizePerson(raw: unknown): Person | null {
  if (!isRecord(raw)) return null
  const name = text(raw.name, 60)
  if (!name) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newPersonId(),
    name,
    phone: text(raw.phone, 20),
    nationalId: text(raw.nationalId, 10),
    note: text(raw.note, 200),
    openingBalance:
      typeof raw.openingBalance === 'number' &&
      Number.isFinite(raw.openingBalance) &&
      raw.openingBalance !== 0
        ? raw.openingBalance
        : undefined,
    createdAt:
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : new Date().toISOString(),
  }
}

export function sanitizePersonAccount(raw: unknown, personIds: Set<string>): PersonAccount | null {
  if (!isRecord(raw)) return null
  if (typeof raw.personId !== 'string' || !personIds.has(raw.personId)) return null
  const bank = text(raw.bank, 40)
  if (!bank) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newPersonAccountId(),
    personId: raw.personId,
    bank,
    accountNumber: text(raw.accountNumber, 40),
    iban: text(raw.iban, 40),
    cardNumber: text(raw.cardNumber, 30),
  }
}

export function sanitizePersonTxn(
  raw: unknown,
  personIds: Set<string>,
  accountIds: Set<string>,
): PersonTxn | null {
  if (!isRecord(raw)) return null
  if (typeof raw.personId !== 'string' || !personIds.has(raw.personId)) return null
  const kind: PersonTxnKind | null = raw.kind === 'payment' || raw.kind === 'receipt' ? raw.kind : null
  if (!kind) return null
  if (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount <= 0) return null
  if (!isInt(raw.year, 1300, 1500)) return null
  if (!isInt(raw.month, 1, 12)) return null
  if (!isInt(raw.day, 1, daysInJalaliMonth(raw.year, raw.month))) return null
  const accountId = typeof raw.accountId === 'string' && accountIds.has(raw.accountId) ? raw.accountId : undefined
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newPersonTxnId(),
    personId: raw.personId,
    kind,
    accountId,
    title: text(raw.title, 80),
    amount: raw.amount,
    year: raw.year,
    month: raw.month,
    day: raw.day,
    note: text(raw.note, 200),
    createdAt:
      typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : new Date().toISOString(),
  }
}

export function personTxnMonthIndex(txn: PersonTxn): MonthIndex {
  return monthIndexFrom(txn.year, txn.month)
}

/** Newest first, then by creation time as a stable tiebreak. */
export function sortPersonTxns(txns: PersonTxn[]): PersonTxn[] {
  return [...txns].sort((a, b) => {
    const byMonth = personTxnMonthIndex(b) - personTxnMonthIndex(a)
    if (byMonth !== 0) return byMonth
    if (b.day !== a.day) return b.day - a.day
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export interface PersonTotals {
  payments: number
  receipts: number
  /** payments - receipts: positive means the person still owes the user. */
  balance: number
}

export function totalOf(txns: PersonTxn[], kind: PersonTxnKind): number {
  return txns.filter(t => t.kind === kind).reduce((sum, t) => sum + t.amount, 0)
}

/** The opening balance counts as a payment when positive, as a receipt when negative. */
export function openingSplit(opening: number): { payment: number; receipt: number } {
  return opening > 0 ? { payment: opening, receipt: 0 } : { payment: 0, receipt: -opening }
}

export function personTotals(txns: PersonTxn[], opening = 0): PersonTotals {
  const split = openingSplit(opening)
  const payments = totalOf(txns, 'payment') + split.payment
  const receipts = totalOf(txns, 'receipt') + split.receipt
  return { payments, receipts, balance: payments - receipts }
}

export interface PersonsOverview {
  /** Sum of positive balances: people who owe the user. */
  receivable: number
  /** Sum of absolute negative balances: user owes these people. */
  payable: number
  /** receivable - payable: positive means net owed to user. */
  net: number
  /** Number of persons with positive balance. */
  creditors: number
  /** Number of persons with negative balance. */
  debtors: number
}

export function personsOverview(
  persons: { id: string; openingBalance?: number }[],
  txns: PersonTxn[],
): PersonsOverview {
  const txnsByPerson = new Map<string, number>()
  for (const t of txns) {
    const delta = t.kind === 'payment' ? t.amount : -t.amount
    txnsByPerson.set(t.personId, (txnsByPerson.get(t.personId) ?? 0) + delta)
  }
  let receivable = 0
  let payable = 0
  let creditors = 0
  let debtors = 0
  for (const p of persons) {
    const netTxns = txnsByPerson.get(p.id) ?? 0
    const bal = personTotals([], p.openingBalance ?? 0).balance
    // personTotals with empty txns gives just opening split; but we need combined.
    // Easier: combine opening + netTxns
    const combined = bal + netTxns
    if (combined > 0) {
      receivable += combined
      creditors++
    } else if (combined < 0) {
      payable += -combined
      debtors++
    }
  }
  return { receivable, payable, net: receivable - payable, creditors, debtors }
}
