/** Absolute Jalali month index: `year * 12 + (month - 1)`. 0-based, monotonic across years. */
export type MonthIndex = number

export type Lang = 'fa' | 'en'
export type Theme = 'light' | 'dark'

export type CheckStatus = 'blank' | 'issued' | 'cleared' | 'bounced' | 'void'

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
  /** Optional bank name, e.g. «بانک ملی». */
  bank?: string
  /** Account number this checkbook is tied to (required in UI, kept as text to preserve leading zeros). */
  accountNumber?: string
  /** First serial number in the checkbook's range (>= 1). */
  serialFrom?: number
  /** Last serial number in the checkbook's range (inclusive). */
  serialTo?: number
  /** ISO timestamp, set on creation. */
  createdAt: string
}

export interface Check {
  id: string
  checkbookId: string
  /** Serial number of the physical check within its checkbook range. */
  serial?: number
  /** Payee / recipient name. Empty for a blank (defined but unused) check. */
  payee: string
  /** Amount in Toman. 0 for a blank check. */
  amount: number
  /** Purpose of the check (بابت). */
  purpose?: string
  /** Jalali due year — only set once the check is issued. */
  dueYear?: number
  /** Due month, 1..12 — only set once the check is issued. */
  dueMonth?: number
  /** Due day, 1..31 — only set once the check is issued. */
  dueDay?: number
  /** Optional note. */
  note?: string
  status: CheckStatus
  /** ISO timestamp when status was last changed. */
  updatedAt: string
}

export interface Person {
  id: string
  name: string
  /** Free-form contact number; kept as text to preserve leading zeros. */
  phone?: string
  nationalId?: string
  note?: string
  /** ISO timestamp, set on creation. */
  createdAt: string
}

export interface PersonAccount {
  id: string
  personId: string
  /** Bank name, e.g. «بانک ملی». */
  bank: string
  accountNumber?: string
  iban?: string
  cardNumber?: string
}

export type PersonTxnKind = 'payment' | 'receipt'

/** Money between the user and a person: `payment` = given to them, `receipt` = taken from them. */
export interface PersonTxn {
  id: string
  personId: string
  kind: PersonTxnKind
  /** Optional PersonAccount.id the money moved through. */
  accountId?: string
  title?: string
  /** Amount in Toman, > 0. */
  amount: number
  /** Jalali date of the transaction. */
  year: number
  month: number
  day: number
  note?: string
  createdAt: string
}

export interface Settings {
  lang: Lang
  theme: Theme
  /** true once demo data has been seeded, so it is never re-seeded after clearing. */
  seeded: boolean
}

export interface DataFile {
  version: 6
  settings: Settings
  loans: Loan[]
  checkbooks: Checkbook[]
  checks: Check[]
  persons: Person[]
  personAccounts: PersonAccount[]
  personTxns: PersonTxn[]
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

export type PersonDraft = Omit<Person, 'id' | 'createdAt'>
export type PersonAccountDraft = Omit<PersonAccount, 'id' | 'personId'>
export type PersonTxnDraft = Omit<PersonTxn, 'id' | 'personId' | 'createdAt'>