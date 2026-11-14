/** Absolute Jalali month index: `year * 12 + (month - 1)`. 0-based, monotonic across years. */
export type MonthIndex = number

export type Lang = 'fa' | 'en'
export type Theme = 'light' | 'dark'

export type CheckStatus = 'pending' | 'paid' | 'bounced'

export interface PaymentRecord {
  id: string
  /** Absolute MonthIndex this payment is applied to. */
  monthIndex: MonthIndex
  /** Amount paid in Toman (can be partial). */
  amount: number
  /** ISO timestamp of when the payment was made. */
  paidAt: string
}

export interface Loan {
  id: string
  name: string
  /** Monthly installment in Toman. */
  amount: number
  /** Jalali start year, e.g. 1405. */
  startYear: number
  /** Start month, 1..12. */
  startMonth: number
  /** Number of installments, >= 1. */
  duration: number
  /** Payment records (never bare 1..12 month numbers). */
  payments: PaymentRecord[]
  /** ISO timestamp, set on creation. */
  createdAt: string
  /** Exact day of month payment is due (1-31), shown in table; used for overdue/alert. */
  deadlineDay: number
}

export interface Checkbook {
  id: string
  name: string
  /** Optional bank name, e.g. «بانک ملی». */
  bank?: string
  /** ISO timestamp, set on creation. */
  createdAt: string
}

export interface Check {
  id: string
  checkbookId: string
  /** Payee / recipient name. */
  payee: string
  /** Amount in Toman. */
  amount: number
  /** Jalali due year. */
  dueYear: number
  /** Due month, 1..12. */
  dueMonth: number
  /** Due day, 1..31. */
  dueDay: number
  /** Optional note. */
  note?: string
  status: CheckStatus
  /** ISO timestamp when status was last changed. */
  updatedAt: string
}

export interface Settings {
  lang: Lang
  theme: Theme
  /** true once demo data has been seeded, so it is never re-seeded after clearing. */
  seeded: boolean
}

export interface DataFile {
  version: 3
  settings: Settings
  loans: Loan[]
  checkbooks: Checkbook[]
  checks: Check[]
}

export type LoanDraft = Omit<
  Loan,
  'id' | 'payments' | 'createdAt' | 'deadlineDay'
> & {
  payments?: PaymentRecord[]
  deadlineDay?: number
}

export type CheckbookDraft = Omit<Checkbook, 'id' | 'createdAt'>
export type CheckDraft = Omit<Check, 'id' | 'checkbookId' | 'updatedAt' | 'status'> & {
  checkbookId?: string
  status?: CheckStatus
}