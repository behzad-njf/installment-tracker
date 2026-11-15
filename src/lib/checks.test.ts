import { describe, expect, it } from 'vitest'

import {
  checkMonthIndex,
  checkSummary,
  daysUntilCheckDue,
  newCheck,
  newCheckShell,
  overdueChecks,
  remainingChecks,
  sanitizeCheck,
  sanitizeCheckbook,
  upcomingChecks,
} from './checks'
import { jalaliPartsFromDate, monthIndexFrom, yearMonthOf } from './jalali'
import type { Check, Checkbook } from './types'

const BOOK: Checkbook = {
  id: 'cb1',
  name: 'دسته چک ملی',
  bank: 'بانک ملی',
  createdAt: '2026-11-01T00:00:00.000Z',
}

function makeCheck(over: Partial<Check> = {}): Check {
  return {
    id: 'c1',
    checkbookId: BOOK.id,
    payee: 'بیمه شخص ثالث',
    amount: 3_200_000,
    dueYear: 1405,
    dueMonth: 11,
    dueDay: 18,
    note: '',
    status: 'pending',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  }
}

describe('checkMonthIndex', () => {
  it('maps year/month to absolute month index', () => {
    expect(checkMonthIndex(makeCheck({ dueYear: 1405, dueMonth: 1 }))).toBe(1405 * 12)
    expect(checkMonthIndex(makeCheck({ dueYear: 1405, dueMonth: 12 }))).toBe(1405 * 12 + 11)
  })
})

describe('daysUntilCheckDue', () => {
  it('returns null for non-pending checks', () => {
    const paid = makeCheck({ status: 'paid' })
    expect(daysUntilCheckDue(paid, new Date())).toBeNull()
  })

  it('returns 0 when due today', () => {
    const today = new Date()
    const parts = jalaliPartsFromDate(today)
    const check = makeCheck({ dueYear: parts.year, dueMonth: parts.month, dueDay: parts.day })
    expect(daysUntilCheckDue(check, today)).toBe(0)
  })

  it('computes exact difference for same month', () => {
    const today = new Date('2026-03-21') // Farvardin 1, 1405
    const parts = jalaliPartsFromDate(today)
    const sameDay = makeCheck({ dueYear: parts.year, dueMonth: parts.month, dueDay: parts.day })
    expect(daysUntilCheckDue(sameDay, today)).toBe(0)
    const later = makeCheck({ dueYear: parts.year, dueMonth: parts.month, dueDay: parts.day + 5 })
    expect(daysUntilCheckDue(later, today)).toBe(5)
    const earlier = makeCheck({ dueYear: parts.year, dueMonth: parts.month, dueDay: parts.day - 1 })
    expect(daysUntilCheckDue(earlier, today)).toBe(-1)
  })
})

describe('upcomingChecks / overdueChecks', () => {
  it('returns only pending checks within the window, sorted ascending', () => {
    const today = new Date('2026-03-21') // Farvardin 1, 1405
    const t0 = jalaliPartsFromDate(today)
    const todayIdx = monthIndexFrom(t0.year, t0.month)
    const prev = yearMonthOf(todayIdx - 1)

    const in2 = makeCheck({ id: 'a', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day + 2 })
    const in5 = makeCheck({ id: 'b', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day + 5 })
    const paid = makeCheck({ id: 'c', status: 'paid', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day })
    const overdue = makeCheck({ id: 'd', dueYear: prev.year, dueMonth: prev.month, dueDay: 30 })

    const list = [in5, paid, in2, overdue]
    const up = upcomingChecks(list, 10, today)
    expect(up.map(c => c.id)).toEqual(['a', 'b'])
    expect(overdueChecks(list, today).map(c => c.id)).toEqual(['d'])
  })
})

describe('checkSummary', () => {
  it('sums amounts by status', () => {
    const list = [
      makeCheck({ id: 'a', amount: 100, status: 'pending' }),
      makeCheck({ id: 'b', amount: 200, status: 'pending' }),
      makeCheck({ id: 'c', amount: 300, status: 'paid' }),
      makeCheck({ id: 'd', amount: 400, status: 'bounced' }),
    ]
    const s = checkSummary(list)
    expect(s.count).toBe(4)
    expect(s.total).toBe(1000)
    expect(s.pending).toBe(300)
    expect(s.paid).toBe(300)
    expect(s.bounced).toBe(400)
    expect(s.pendingAmount).toBe(300)
  })
})

describe('sanitizeCheckbook', () => {
  it('keeps valid fields and defaults the rest', () => {
    const result = sanitizeCheckbook({ id: 'x', name: '  ملی  ', bank: '', createdAt: 'nope' })
    expect(result?.name).toBe('ملی')
    expect(result?.bank).toBe('')
    expect(result?.id).toBe('x')
    expect(result?.createdAt).toBeTruthy()
  })

  it('rejects empty name or non-object', () => {
    expect(sanitizeCheckbook({ name: '' })).toBeNull()
    expect(sanitizeCheckbook('nope')).toBeNull()
    expect(sanitizeCheckbook(null)).toBeNull()
  })
})

describe('sanitizeCheck', () => {
  it('keeps valid checks and drops orphans / invalid amounts / bad dates', () => {
    const ids = new Set([BOOK.id])
    const ok = sanitizeCheck(makeCheck(), ids)
    expect(ok?.payee).toBe('بیمه شخص ثالث')

    const orphan = sanitizeCheck(makeCheck({ checkbookId: 'ghost' }), ids)
    expect(orphan).toBeNull()

    const zero = sanitizeCheck(makeCheck({ amount: 0 }), ids)
    expect(zero).toBeNull()

    const badDate = sanitizeCheck(makeCheck({ dueMonth: 13 }), ids)
    expect(badDate).toBeNull()

    const noPayee = sanitizeCheck(makeCheck({ payee: '' }), ids)
    expect(noPayee).toBeNull()
  })

  it('defaults unknown status to pending and trims note', () => {
    const result = sanitizeCheck(makeCheck({ status: 'weird' as Check['status'], note: '  hi  ' }), new Set([BOOK.id]))
    expect(result?.status).toBe('pending')
    expect(result?.note).toBe('hi')
  })
})

describe('newCheck', () => {
  it('rejects missing checkbookId / payee / amount', () => {
    expect(newCheck({ payee: 'x', amount: 100, dueYear: 1405, dueMonth: 1, dueDay: 1 })).toBeNull()
    expect(newCheck({ checkbookId: 'cb', payee: 'x', amount: 0, dueYear: 1405, dueMonth: 1, dueDay: 1 })).toBeNull()
    const ok = newCheck({ checkbookId: 'cb', payee: 'x', amount: 100, dueYear: 1405, dueMonth: 1, dueDay: 1, note: 'n' })
    expect(ok?.status).toBe('pending')
    expect(ok?.note).toBe('n')
  })
})

describe('remainingChecks', () => {
  it('subtracts registered cheques from the serial range capacity', () => {
    const book: Checkbook = { ...BOOK, serialFrom: 100, serialTo: 125 }
    expect(remainingChecks(book, [])).toBe(26)
    expect(remainingChecks(book, [makeCheck({ serial: 100 }), makeCheck({ id: 'c2', serial: 101 })])).toBe(24)
    expect(remainingChecks(book, [])).toBe(26)
    // no range recorded -> unknown capacity, never negative
    expect(remainingChecks(BOOK, [makeCheck()])).toBe(0)
    expect(remainingChecks({ ...BOOK, serialFrom: 10, serialTo: 9 }, [])).toBe(0)
  })
})

describe('bulk shells', () => {
  it('creates a payee-less shell only when it has a valid serial', () => {
    const shell = newCheckShell('cb1', 105, 1405, 8, 24)
    expect(shell.serial).toBe(105)
    expect(shell.payee).toBe('')
    expect(shell.amount).toBe(0)
    expect(shell.dueDay).toBe(24)
    expect(sanitizeCheck(shell, new Set(['cb1']))?.serial).toBe(105)
    expect(sanitizeCheck({ ...shell, serial: 0 }, new Set(['cb1']))).toBeNull()
  })
})