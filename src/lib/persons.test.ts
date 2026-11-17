import { describe, expect, it } from 'vitest'

import { personTotals, sanitizePerson, sanitizePersonTxn, sortPersonTxns } from './persons'
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
