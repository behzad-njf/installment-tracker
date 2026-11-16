import { monthIndexFrom } from './jalali'
import { daysUntilDeadline } from './jalali'
import type { Loan, MonthIndex } from './types'

export type LoanStatus = 'upcoming' | 'active' | 'partial' | 'paid' | 'finished'

export interface Summary {
  /** Sum of installments due in the given month. */
  totalMonthly: number
  /** Installments already paid for that month (sum of payment amounts). */
  paidThisMonth: number
  /** totalMonthly - paidThisMonth. */
  remainingThisMonth: number
  activeCount: number
  paidCount: number
}

export interface Progress {
  paid: number
  total: number
  /** 0..100, integer. */
  percent: number
}

export function startIndex(loan: Loan): MonthIndex {
  return monthIndexFrom(loan.startYear, loan.startMonth)
}

export function endIndex(loan: Loan): MonthIndex {
  return startIndex(loan) + Math.max(1, loan.duration) - 1
}

export function activeMonthIndices(loan: Loan): MonthIndex[] {
  const start = startIndex(loan)
  const end = endIndex(loan)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function isActiveIn(loan: Loan, month: MonthIndex): boolean {
  return month >= startIndex(loan) && month <= endIndex(loan)
}

export function isPaidIn(loan: Loan, month: MonthIndex): boolean {
  return isActiveIn(loan, month) && loan.payments.some(p => p.monthIndex === month)
}

/** True when total payments for `month` cover the full installment amount. */
export function isFullyPaidIn(loan: Loan, month: MonthIndex): boolean {
  return isActiveIn(loan, month) && paidAmountIn(loan, month) >= loan.amount
}

/** True when `month` has at least one payment but not enough to cover the installment. */
export function isPartiallyPaidIn(loan: Loan, month: MonthIndex): boolean {
  const paid = paidAmountIn(loan, month)
  return isActiveIn(loan, month) && paid > 0 && paid < loan.amount
}

/** Count of installments in the loan's lifespan that are not yet fully paid. */
export function remainingInstallments(loan: Loan): number {
  return activeMonthIndices(loan).filter(
    m => paidAmountIn(loan, m) < loan.amount,
  ).length
}

/** Total amount paid for a given month across all payment records. */
export function paidAmountIn(loan: Loan, month: MonthIndex): number {
  return loan.payments
    .filter(p => p.monthIndex === month)
    .reduce((sum, p) => sum + p.amount, 0)
}

export function loanStatus(loan: Loan, month: MonthIndex): LoanStatus {
  if (month < startIndex(loan)) return 'upcoming'
  if (month > endIndex(loan)) return 'finished'
  const paid = paidAmountIn(loan, month)
  if (paid >= loan.amount) return 'paid'
  if (paid > 0) return 'partial'
  return 'active'
}

export function summaryFor(loans: Loan[], month: MonthIndex): Summary {
  let totalMonthly = 0
  let paidThisMonth = 0
  let activeCount = 0
  let paidCount = 0

  for (const loan of loans) {
    if (!isActiveIn(loan, month)) continue
    totalMonthly += loan.amount
    activeCount += 1
    const paid = paidAmountIn(loan, month)
    if (paid > 0) {
      paidThisMonth += paid
      paidCount += 1
    }
  }

  return {
    totalMonthly,
    paidThisMonth,
    remainingThisMonth: Math.max(0, totalMonthly - paidThisMonth),
    activeCount,
    paidCount,
  }
}

/** Every month that has at least one due installment, ascending. */
export function monthlyTotals(loans: Loan[]): Map<MonthIndex, number> {
  const totals = new Map<MonthIndex, number>()
  for (const loan of loans) {
    for (const month of activeMonthIndices(loan)) {
      totals.set(month, (totals.get(month) ?? 0) + loan.amount)
    }
  }
  return totals
}

/** 12 buckets for a Jalali year — chart-friendly, zero-filled. */
export function yearTotals(loans: Loan[], year: number): { month: MonthIndex; total: number }[] {
  const totals = monthlyTotals(loans)
  return Array.from({ length: 12 }, (_, i) => {
    const month = monthIndexFrom(year, i + 1)
    return { month, total: totals.get(month) ?? 0 }
  })
}

/** How many installments are paid up to and including `month` (future months ignored). */
export function progressOf(loan: Loan, month: MonthIndex): Progress {
  const total = Math.max(1, loan.duration)
  const paid = activeMonthIndices(loan).filter(
    (index) => index <= month && loan.payments.some(p => p.monthIndex === index),
  ).length
  return { paid, total, percent: Math.round((paid / total) * 100) }
}

/**
 * Days until the loan's deadline day for `currentMonth`.
 * Returns `null` when the current month isn't active for the loan or its
 * installment is already fully paid (the deadline rolls to the next cycle).
 * Negative means overdue.
 */
export function daysUntilLoanDeadline(loan: Loan, currentMonth: MonthIndex): number | null {
  if (!isActiveIn(loan, currentMonth)) return null
  if (isFullyPaidIn(loan, currentMonth)) return null
  return daysUntilDeadline(loan.deadlineDay)
}

/** Unpaid loans whose deadline is within 3 days (`upcoming`) or already past (`overdue`). */
export function deadlineBuckets(
  loans: Loan[],
  currentMonth: MonthIndex,
): { upcoming: Loan[]; overdue: Loan[] } {
  const upcoming: Loan[] = []
  const overdue: Loan[] = []
  for (const loan of loans) {
    if (remainingInstallments(loan) === 0) continue
    if (loan.deadlineDay < 1 || loan.deadlineDay > 31) continue
    const days = daysUntilLoanDeadline(loan, currentMonth)
    if (days === null) continue
    if (days < 0) overdue.push(loan)
    else if (days <= 3) upcoming.push(loan)
  }
  return { upcoming, overdue }
}
