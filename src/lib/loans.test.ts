import { describe, expect, it } from 'vitest'

import { monthIndexFrom, yearMonthOf, currentMonthIndex, MONTH_NAMES } from './jalali'
import {
  activeMonthIndices,
  endIndex,
  isFullyPaidIn,
  isPartiallyPaidIn,
  isPaidIn,
  isActiveIn,
  loanStatus,
  monthlyTotals,
  paidAmountIn,
  progressOf,
  remainingInstallments,
  summaryFor,
  yearTotals,
} from './loans'
import { formatMoney, parseMoney, toFaDigits } from './money'
import type { Loan, PaymentRecord } from './types'

function payment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: 'p1',
    monthIndex: monthIndexFrom(1405, 4),
    amount: 500_000,
    paidAt: '2026-04-21T00:00:00.000Z',
    ...overrides,
  }
}

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'l1',
    name: 'وام',
    amount: 1_000_000,
    startYear: 1405,
    startMonth: 4,
    duration: 3,
    payments: [],
    deadlineDay: 23,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const APR_1405 = monthIndexFrom(1405, 4)

describe('jalali helpers', () => {
  it('round-trips year/month and handles Esfand → Farvardin spill', () => {
    const esfand = monthIndexFrom(1405, 12)
    expect(yearMonthOf(esfand)).toEqual({ year: 1405, month: 12 })
    expect(yearMonthOf(esfand + 1)).toEqual({ year: 1406, month: 1 })
    expect(yearMonthOf(esfand + 2)).toEqual({ year: 1406, month: 2 })
  })

  it('derives the current month from Intl without a date library', () => {
    const index = currentMonthIndex(new Date('2026-11-11T12:00:00Z'))
    expect(yearMonthOf(index)).toEqual({ year: 1405, month: 8 })
    expect(MONTH_NAMES.fa[7]).toBe('آبان')
  })
})

describe('loan math', () => {
  it('spans month 12 into next year', () => {
    const edge = loan({ startMonth: 12, duration: 3 })
    expect(activeMonthIndices(edge)).toEqual([
      monthIndexFrom(1405, 12),
      monthIndexFrom(1406, 1),
      monthIndexFrom(1406, 2),
    ])
    expect(endIndex(edge)).toBe(monthIndexFrom(1406, 2))
  })

  it('treats duration 1 as a single month', () => {
    const single = loan({ duration: 1 })
    expect(activeMonthIndices(single)).toEqual([APR_1405])
    expect(loanStatus(single, APR_1405 + 1)).toBe('finished')
  })

  it('computes status per month', () => {
    const l = loan({ payments: [payment()] })
    expect(loanStatus(l, APR_1405 - 1)).toBe('upcoming')
    expect(loanStatus(l, APR_1405)).toBe('partial')
    expect(loanStatus(l, APR_1405 + 1)).toBe('active')
    expect(loanStatus(l, APR_1405 + 5)).toBe('finished')
  })

  it('ignores paid months outside the active range', () => {
    const l = loan({ payments: [payment({ monthIndex: APR_1405 - 1 }), payment({ id: 'p2', monthIndex: APR_1405 + 99 })] })
    expect(isPaidIn(l, APR_1405 - 1)).toBe(false)
    expect(isPaidIn(l, APR_1405 + 99)).toBe(false)
    expect(progressOf(l, APR_1405 + 10).paid).toBe(0)
  })

  it('sums the current month correctly', () => {
    const loans = [
      loan({ id: 'a', amount: 2_000_000, duration: 6, payments: [payment()] }),
      loan({ id: 'b', amount: 500_000, duration: 3 }),
      loan({ id: 'c', amount: 9_000_000, startMonth: 10, duration: 2 }),
    ]
    expect(summaryFor(loans, APR_1405)).toEqual({
      totalMonthly: 2_500_000,
      paidThisMonth: 500_000,
      remainingThisMonth: 2_000_000,
      activeCount: 2,
      paidCount: 1,
    })
  })

  it('paidAmountIn sums all payments for a month', () => {
    const l = loan({
      payments: [
        payment({ amount: 300_000 }),
        payment({ id: 'p2', amount: 200_000 }),
      ],
    })
    expect(paidAmountIn(l, APR_1405)).toBe(500_000)
    expect(paidAmountIn(l, APR_1405 + 1)).toBe(0)
  })

  it('distinguishes fully paid, partial, and unpaid', () => {
    const l = loan()
    expect(isFullyPaidIn(l, APR_1405)).toBe(false)
    expect(isPartiallyPaidIn(l, APR_1405)).toBe(false)

    const halfPaid = loan({ payments: [payment({ amount: 500_000 })] })
    expect(isFullyPaidIn(halfPaid, APR_1405)).toBe(false)
    expect(isPartiallyPaidIn(halfPaid, APR_1405)).toBe(true)

    const fullyPaid = loan({ payments: [payment({ amount: 1_000_000 })] })
    expect(isFullyPaidIn(fullyPaid, APR_1405)).toBe(true)
    expect(isPartiallyPaidIn(fullyPaid, APR_1405)).toBe(false)
  })

  it('remainingInstallments counts unpaid installments across lifespan', () => {
    const l = loan({ duration: 3 })
    expect(remainingInstallments(l)).toBe(3)

    const onePaid = loan({
      duration: 3,
      payments: [payment({ amount: 1_000_000 })],
    })
    expect(remainingInstallments(onePaid)).toBe(2)

    const allPaid = loan({
      duration: 3,
      payments: [
        payment({ amount: 1_000_000 }),
        payment({ id: 'p2', monthIndex: APR_1405 + 1, amount: 1_000_000 }),
        payment({ id: 'p3', monthIndex: APR_1405 + 2, amount: 1_000_000 }),
      ],
    })
    expect(remainingInstallments(allPaid)).toBe(0)
  })

  it('isActiveIn respects start and end regardless of payments', () => {
    const l = loan()
    expect(isActiveIn(l, APR_1405 - 1)).toBe(false)
    expect(isActiveIn(l, APR_1405)).toBe(true)
    expect(isActiveIn(l, APR_1405 + 2)).toBe(true)
    expect(isActiveIn(l, APR_1405 + 3)).toBe(false)
  })

  it('zero-fills a year for charts and ignores other years', () => {
    const loans = [loan({ amount: 1_000_000, startMonth: 4, duration: 3 })]
    const series = yearTotals(loans, 1405)
    expect(series).toHaveLength(12)
    expect(series.map((point) => point.total)).toEqual([
      0, 0, 0, 1_000_000, 1_000_000, 1_000_000, 0, 0, 0, 0, 0, 0,
    ])
    expect(yearTotals(loans, 1406).every((point) => point.total === 0)).toBe(true)
  })

  it('aggregates monthly totals across loans', () => {
    const loans = [loan({ id: 'a', amount: 100 }), loan({ id: 'b', amount: 50, duration: 2 })]
    const totals = monthlyTotals(loans)
    expect(totals.get(APR_1405)).toBe(150)
    expect(totals.get(APR_1405 + 2)).toBe(100)
  })
})

describe('money formatting', () => {
  it('uses Persian digits and separator for fa', () => {
    expect(formatMoney(1_234_567, 'fa')).toBe('۱٬۲۳۴٬۵۶۷')
    expect(formatMoney(1_234_567, 'en')).toBe('1,234,567')
    expect(toFaDigits('1405')).toBe('۱۴۰۵')
  })

  it('parses localized input back to a number', () => {
    expect(parseMoney('۱٬۲۳۴٬۵۶۷')).toBe(1_234_567)
    expect(parseMoney(' 1,234,567 تومان ')).toBe(1_234_567)
    expect(parseMoney('')).toBe(0)
  })
})
