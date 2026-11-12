/** Absolute Jalali month index: `year * 12 + (month - 1)`. 0-based, monotonic across years. */
export type MonthIndex = number

export type Lang = 'fa' | 'en'
export type Theme = 'light' | 'dark'

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

export interface Settings {
  lang: Lang
  theme: Theme
  /** true once demo data has been seeded, so it is never re-seeded after clearing. */
  seeded: boolean
}

export interface DataFile {
  version: 2
  settings: Settings
  loans: Loan[]
}

export type LoanDraft = Omit<
  Loan,
  'id' | 'payments' | 'createdAt' | 'deadlineDay'
> & {
  payments?: PaymentRecord[]
  deadlineDay?: number
}
