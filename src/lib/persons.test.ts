import { describe, expect, it } from 'vitest'

import { personTotals, personsOverview, personsStandingByMonth, sanitizePerson, sanitizePersonTxn, sortPersonTxns } from './persons'
import { monthIndexFrom } from './jalali'
import type { PersonTxn } from './types'

const base: PersonTxn = {
  id: 't1',
  personId: 'p1',
  kind: 'payment',
  amount: 5_000_000,
  year: 1405,
  month: 8,
  day: 12,
  createdAt: '2026-11-03T00:00:00.000Z',
}

describe('personTotals', () => {
  it('nets payments against receipts', () => {
    const totals = personTotals([
      base,
      { ...base, id: 't2', kind: 'receipt', amount: 2_000_000 },
    ])
    expect(totals).toEqual({ payments: 5_000_000, receipts: 2_000_000, balance: 3_000_000 })
  })

  it('folds a positive opening balance into payments and a negative one into receipts', () => {
    const creditor = personTotals([base], 1_000_000)
    expect(creditor).toEqual({ payments: 6_000_000, receipts: 0, balance: 6_000_000 })

    const debtor = personTotals([base], -2_000_000)
    expect(debtor).toEqual({ payments: 5_000_000, receipts: 2_000_000, balance: 3_000_000 })
  })
})

describe('personsOverview', () => {
  it('aggregates receivable, payable and net across persons', () => {
    const persons = [
      { id: 'p1', openingBalance: 1_000_000 },
      { id: 'p2', openingBalance: -500_000 },
      { id: 'p3' },
    ]
    const txns: PersonTxn[] = [
      { ...base, id: 't1', personId: 'p1', kind: 'payment', amount: 2_000_000 },
      { ...base, id: 't2', personId: 'p2', kind: 'receipt', amount: 500_000 },
      { ...base, id: 't3', personId: 'p3', kind: 'payment', amount: 1_000_000 },
    ]
    const overview = personsOverview(persons, txns)
    expect(overview).toEqual({
      receivable: 4_000_000, // p1: 1M opening + 2M payments = 3M; p3: 1M
      payable: 1_000_000, // p2: -500k opening + -500k receipt = -1M
      net: 3_000_000,
      creditors: 2, // p1, p3
      debtors: 1, // p2
    })
  })

  it('counts a zero-balance person as settled', () => {
    const persons = [{ id: 'p1' }, { id: 'p2' }]
    const txns: PersonTxn[] = [
      { ...base, id: 't1', personId: 'p1', kind: 'payment', amount: 5_000_000 },
      { ...base, id: 't2', personId: 'p1', kind: 'receipt', amount: 5_000_000 },
    ]
    const overview = personsOverview(persons, txns)
    expect(overview).toEqual({ receivable: 0, payable: 0, net: 0, creditors: 0, debtors: 0 })
  })
})

describe('sanitizePerson', () => {
  it('keeps a signed opening balance and drops zero or garbage', () => {
    expect(sanitizePerson({ id: 'p1', name: 'a', openingBalance: -900, createdAt: 'x' })?.openingBalance).toBe(-900)
    expect(sanitizePerson({ id: 'p1', name: 'a', openingBalance: 0, createdAt: 'x' })?.openingBalance).toBeUndefined()
    expect(sanitizePerson({ id: 'p1', name: 'a', openingBalance: 'x', createdAt: 'x' })?.openingBalance).toBeUndefined()
  })
})

describe('sortPersonTxns', () => {
  it('puts the newest month first and leaves the input untouched', () => {
    const older = { ...base, id: 'old', year: 1405, month: 6 }
    const sorted = sortPersonTxns([older, base])
    expect(sorted.map(t => t.id)).toEqual(['t1', 'old'])
  })
})

describe('personsStandingByMonth', () => {
  it('carries an unsettled debt into later months and folds older txns in first', () => {
    const start = monthIndexFrom(1405, 8)
    const persons = [
      { id: 'p1', openingBalance: 1_000_000 },
      { id: 'p2', openingBalance: -500_000 },
    ]
    const txns: PersonTxn[] = [
      // before the window: p1 gave 500k → its balance drops to 500k at the window start
      { ...base, id: 'old', personId: 'p1', kind: 'receipt', amount: 500_000, year: 1405, month: 7 },
      { ...base, id: 'a', personId: 'p1', kind: 'payment', amount: 2_000_000, year: 1405, month: 8 },
      { ...base, id: 'b', personId: 'p2', kind: 'payment', amount: 1_000_000, year: 1405, month: 9 },
    ]
    const rows = personsStandingByMonth(persons, txns, start, 3)
    expect(rows.map(r => r.monthIdx)).toEqual([start, start + 1, start + 2])
    // month 1: p1 = 1M - 0.5M + 2M = 2.5M; p2 = -0.5M
    expect(rows[0]).toEqual({ monthIdx: start, receivable: 2_500_000, payable: 500_000, net: 2_000_000 })
    // month 2: p2 pays 1M and turns creditor (0.5M); debt is gone, nothing carries
    expect(rows[1]).toEqual({ monthIdx: start + 1, receivable: 3_000_000, payable: 0, net: 3_000_000 })
    // month 3: no txns, the standing repeats
    const { monthIdx: _ignored, ...last } = rows[2]
    const { monthIdx: _ignored2, ...prev } = rows[1]
    expect(last).toEqual(prev)
  })
})

describe('sanitizePersonTxn', () => {
  const persons = new Set(['p1'])
  const accounts = new Set(['a1'])

  it('drops a transaction with an unknown person or a bad date', () => {
    expect(sanitizePersonTxn({ ...base, personId: 'ghost' }, persons, accounts)).toBeNull()
    expect(sanitizePersonTxn({ ...base, day: 31, month: 7 }, persons, accounts)).toBeNull()
    expect(sanitizePersonTxn({ ...base, amount: 0 }, persons, accounts)).toBeNull()
  })

  it('keeps a valid transaction and clears a dangling account reference', () => {
    const kept = sanitizePersonTxn({ ...base, accountId: 'ghost' }, persons, accounts)
    expect(kept?.accountId).toBeUndefined()
    expect(sanitizePersonTxn({ ...base, accountId: 'a1' }, persons, accounts)?.accountId).toBe('a1')
  })
})
