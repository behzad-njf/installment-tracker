import { describe, expect, it } from 'vitest'

import {
  canTransitionCheck,
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
    status: 'issued',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  }
}

describe('checkMonthIndex', () => {
  it('maps year/month to absolute month index, null for blank checks', () => {
    expect(checkMonthIndex(makeCheck({ dueYear: 1405, dueMonth: 1 }))).toBe(1405 * 12)
    expect(checkMonthIndex(makeCheck({ dueYear: 1405, dueMonth: 12 }))).toBe(1405 * 12 + 11)
    expect(checkMonthIndex(makeCheck({ status: 'blank', dueYear: undefined, dueMonth: undefined }))).toBeNull()
  })
})

describe('status transitions', () => {
  it('only issued checks can be cleared or bounced', () => {
    expect(canTransitionCheck('blank', 'issued')).toBe(true)
    expect(canTransitionCheck('blank', 'cleared')).toBe(false)
    expect(canTransitionCheck('issued', 'cleared')).toBe(true)
    expect(canTransitionCheck('issued', 'bounced')).toBe(true)
    expect(canTransitionCheck('cleared', 'bounced')).toBe(false)
    expect(canTransitionCheck('bounced', 'issued')).toBe(false)
    expect(canTransitionCheck('void', 'issued')).toBe(false)
  })
})

describe('daysUntilCheckDue', () => {
  it('returns null for non-issued checks', () => {
    expect(daysUntilCheckDue(makeCheck({ status: 'cleared' }), new Date())).toBeNull()
    expect(daysUntilCheckDue(makeCheck({ status: 'blank' }), new Date())).toBeNull()
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
  it('returns only issued checks within the window, sorted ascending', () => {
    const today = new Date('2026-03-21') // Farvardin 1, 1405
    const t0 = jalaliPartsFromDate(today)
    const prev = yearMonthOf(monthIndexFrom(t0.year, t0.month) - 1)

    const in2 = makeCheck({ id: 'a', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day + 2 })
    const in5 = makeCheck({ id: 'b', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day + 5 })
    const cleared = makeCheck({ id: 'c', status: 'cleared', dueYear: t0.year, dueMonth: t0.month, dueDay: t0.day })
    const overdue = makeCheck({ id: 'd', dueYear: prev.year, dueMonth: prev.month, dueDay: 30 })

    const list = [in5, cleared, in2, overdue]
    const up = upcomingChecks(list, 10, today)
    expect(up.map(c => c.id)).toEqual(['a', 'b'])
    expect(overdueChecks(list, today).map(c => c.id)).toEqual(['d'])
  })
})

describe('checkSummary', () => {
  it('counts and sums by status', () => {
    const list = [
      makeCheck({ id: 'a', amount: 100, status: 'issued' }),
      makeCheck({ id: 'b', amount: 200, status: 'issued' }),
      makeCheck({ id: 'c', amount: 300, status: 'cleared' }),
      makeCheck({ id: 'd', amount: 400, status: 'bounced' }),
      makeCheck({ id: 'e', amount: 0, status: 'blank' }),
    ]
    const s = checkSummary(list)
    expect(s.count).toBe(5)
    expect(s.counts.issued).toBe(2)
    expect(s.counts.blank).toBe(1)
    expect(s.amounts.issued).toBe(300)
    expect(s.amounts.cleared).toBe(300)
    expect(s.amounts.bounced).toBe(400)
    expect(s.amounts.blank).toBe(0)
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
  it('keeps valid issued checks and drops orphans / invalid amounts / bad dates', () => {
    const ids = new Set([BOOK.id])
    const ok = sanitizeCheck(makeCheck() as unknown as Check, ids)
    expect(ok?.payee).toBe('بیمه شخص ثالث')
    expect(ok?.status).toBe('issued')

    const orphan = sanitizeCheck(makeCheck({ checkbookId: 'ghost' }) as unknown as Check, ids)
    expect(orphan).toBeNull()

    const zero = sanitizeCheck(makeCheck({ amount: 0 }) as unknown as Check, ids)
    expect(zero).toBeNull()

    const badDate = sanitizeCheck(makeCheck({ dueMonth: 13 }) as unknown as Check, ids)
    expect(badDate?.status).toBe('issued')
    expect(badDate?.dueMonth).toBeUndefined()

    const noPayee = sanitizeCheck(makeCheck({ payee: '' }) as unknown as Check, ids)
    expect(noPayee).toBeNull()
  })

  it('turns an unused shell into a blank check with no due date', () => {
    const shell = sanitizeCheck(
      makeCheck({ serial: 105, status: 'blank', payee: '', amount: 0, dueYear: undefined, dueMonth: undefined, dueDay: undefined }) as unknown as Check,
      new Set([BOOK.id]),
    )
    expect(shell?.status).toBe('blank')
    expect(shell?.dueYear).toBeUndefined()
  })

  it('trims note and migrates legacy statuses', () => {
    expect(sanitizeCheck(makeCheck({ status: 'paid' as Check['status'] }), new Set([BOOK.id]))?.status).toBe('cleared')
    expect(sanitizeCheck(makeCheck({ status: 'weird' as Check['status'], note: '  hi  ' }), new Set([BOOK.id]))?.status).toBe('issued')
    expect(sanitizeCheck(makeCheck({ note: '  hi  ' }), new Set([BOOK.id]))?.note).toBe('hi')
  })
})

describe('newCheck', () => {
  it('defaults to a blank check when no status is given', () => {
    const check = newCheck({ checkbookId: 'cb', payee: 'x', amount: 100, dueYear: 1405, dueMonth: 1, dueDay: 1 })
    expect(check?.status).toBe('blank')
    expect(check?.payee).toBe('')
    expect(check?.amount).toBe(0)
  })

  it('requires payee, amount and purpose to issue', () => {
    expect(newCheck({ checkbookId: 'cb', payee: 'x', amount: 0, status: 'issued', purpose: 'p' })).toBeNull()
    expect(newCheck({ checkbookId: 'cb', payee: '', amount: 100, status: 'issued', purpose: 'p' })).toBeNull()
    expect(newCheck({ checkbookId: 'cb', payee: 'x', amount: 100, status: 'issued', purpose: '' })).toBeNull()
    const ok = newCheck({
      checkbookId: 'cb',
      payee: 'x',
      amount: 100,
      status: 'issued',
      purpose: 'p',
      dueYear: 1405,
      dueMonth: 1,
      dueDay: 1,
      note: 'n',
    })
    expect(ok?.status).toBe('issued')
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

describe('blank shells', () => {
  it('creates a check carrying nothing but its serial', () => {
    const shell = newCheckShell('cb1', 105)
    expect(shell.serial).toBe(105)
    expect(shell.payee).toBe('')
    expect(shell.amount).toBe(0)
    expect(shell.dueYear).toBeUndefined()
    expect(shell.status).toBe('blank')
    expect(sanitizeCheck(shell, new Set(['cb1']))?.serial).toBe(105)
    expect(sanitizeCheck({ ...shell, serial: 0 }, new Set(['cb1']))).toBeNull()
  })
})