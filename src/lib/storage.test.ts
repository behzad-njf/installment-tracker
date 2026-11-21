import { describe, expect, it } from 'vitest'

import { exportDataFile, importDataFile } from './storage'
import type { DataFile } from './types'

const VALID: DataFile = {
  version: 6,
  settings: { lang: 'fa', theme: 'light', seeded: true },
  loans: [
    {
      id: 'l1',
      name: 'وام ازدواج',
      amount: 2_800_000,
      startYear: 1405,
      startMonth: 6,
      duration: 120,
      payments: [
        {
          id: 'p1',
          monthIndex: 16865,
          amount: 2_800_000,
          paidAt: '2026-09-19T00:00:00.000Z',
        },
      ],
      createdAt: '2026-11-12T18:38:16.815Z',
      deadlineDay: 28,
    },
  ],
  checkbooks: [
    {
      id: 'cb1',
      bank: 'بانک ملی',
      accountNumber: '0123456789012',
      serialFrom: 100,
      serialTo: 125,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ],
  checks: [
    {
      id: 'c1',
      checkbookId: 'cb1',
      serial: 100,
      payee: 'بیمه شخص ثالث',
      amount: 3_200_000,
      purpose: 'بیمه خودرو',
      dueYear: 1405,
      dueMonth: 11,
      dueDay: 18,
      note: '',
      status: 'issued',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    {
      id: 'c2',
      checkbookId: 'cb1',
      serial: 101,
      payee: '',
      amount: 0,
      purpose: '',
      note: '',
      status: 'blank',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
  persons: [{ id: 'p1', name: 'علی رضایی', phone: '09123456789', createdAt: '2026-11-02T00:00:00.000Z' }],
  personAccounts: [{ id: 'a1', personId: 'p1', bank: 'بانک ملی', accountNumber: '0123456789012' }],
  personTxns: [
    {
      id: 't1',
      personId: 'p1',
      kind: 'payment',
      accountId: 'a1',
      title: 'بابت قرض',
      amount: 5_000_000,
      year: 1405,
      month: 8,
      day: 12,
      createdAt: '2026-11-03T00:00:00.000Z',
    },
  ],
}

describe('importDataFile', () => {
  it('imports a real v6 payload with loans, checkbooks, checks and persons', () => {
    const result = importDataFile(JSON.stringify(VALID))
    expect(result).not.toBeNull()
    expect(result?.version).toBe(6)
    expect(result?.loans[0].name).toBe('وام ازدواج')
    expect(result?.loans[0].payments).toHaveLength(1)
    expect(result?.loans[0].payments[0].monthIndex).toBe(16865)
    expect(result?.checkbooks).toHaveLength(1)
    expect(result?.checkbooks[0].accountNumber).toBe('0123456789012')
    expect(result?.checkbooks[0].serialFrom).toBe(100)
    expect(result?.checks).toHaveLength(2)
    expect(result?.checks[0].serial).toBe(100)
    expect(result?.checks[0].purpose).toBe('بیمه خودرو')
    expect(result?.checks[0].status).toBe('issued')
    expect(result?.checks[1].status).toBe('blank')
    expect(result?.checks[1].dueYear).toBeUndefined()
    expect(result?.persons[0].name).toBe('علی رضایی')
    expect(result?.personAccounts[0].bank).toBe('بانک ملی')
    expect(result?.personTxns[0].kind).toBe('payment')
    expect(result?.personTxns[0].accountId).toBe('a1')
  })

  it('accepts a pre-checks v2 payload (backwards-compatible import)', () => {
    const legacy = {
      ...VALID,
      version: 2,
      checkbooks: undefined,
      checks: undefined,
      persons: undefined,
      personAccounts: undefined,
      personTxns: undefined,
    }
    const result = importDataFile(JSON.stringify(legacy as unknown as DataFile))
    expect(result).not.toBeNull()
    expect(result?.version).toBe(6)
    expect(result?.loans[0].name).toBe('وام ازدواج')
    expect(result?.checkbooks).toEqual([])
    expect(result?.checks).toEqual([])
    expect(result?.persons).toEqual([])
    expect(result?.personAccounts).toEqual([])
    expect(result?.personTxns).toEqual([])
  })

  it('migrates a v3 payload and keeps serial-only check shells', () => {
    const legacy = {
      ...VALID,
      version: 3,
      checkbooks: [{ id: 'cb1', bank: 'ملی', createdAt: '2026-11-01T00:00:00.000Z' }],
      checks: [
        {
          id: 'shell',
          checkbookId: 'cb1',
          serial: 101,
          payee: '',
          amount: 0,
          dueYear: 1405,
          dueMonth: 12,
          dueDay: 1,
          status: 'pending',
        },
      ],
    }
    const result = importDataFile(JSON.stringify(legacy))
    expect(result?.version).toBe(6)
    expect(result?.checkbooks[0].accountNumber).toBe('')
    expect(result?.checks).toHaveLength(1)
    expect(result?.checks[0].serial).toBe(101)
    expect(result?.checks[0].status).toBe('blank')
    expect(result?.checks[0].dueYear).toBeUndefined()
  })

  it('migrates a v4 pending check with content to issued', () => {
    const legacy = {
      ...VALID,
      version: 4,
      checks: [
        {
          id: 'c4',
          checkbookId: 'cb1',
          serial: 103,
          payee: 'فروشنده',
          amount: 500_000,
          purpose: 'خرید',
          dueYear: 1405,
          dueMonth: 10,
          dueDay: 5,
          status: 'pending',
        },
        {
          id: 'c5',
          checkbookId: 'cb1',
          serial: 104,
          payee: 'حسابدار',
          amount: 700_000,
          purpose: 'حقوق',
          dueYear: 1405,
          dueMonth: 10,
          dueDay: 6,
          status: 'paid',
        },
      ],
    }
    const result = importDataFile(JSON.stringify(legacy))
    expect(result?.checks[0].status).toBe('issued')
    expect(result?.checks[1].status).toBe('cleared')
  })

  it('rejects non-JSON garbage', () => {
    expect(importDataFile('not json at all')).toBeNull()
  })

  it('rejects a JSON object without loans array', () => {
    expect(importDataFile(JSON.stringify({ version: 3 }))).toBeNull()
  })

  it('drops loans missing name/amount but keeps valid ones', () => {
    const mixed = JSON.stringify({ ...VALID, loans: [...VALID.loans, { id: 'bad' }] })
    const result = importDataFile(mixed)
    expect(result?.loans).toHaveLength(1)
  })

  it('drops checks whose checkbook is unknown', () => {
    const orphan = JSON.stringify({
      ...VALID,
      checks: [
        ...VALID.checks,
        {
          id: 'orphan',
          checkbookId: 'ghost',
          payee: 'ت',
          amount: 1_000_000,
          dueYear: 1405,
          dueMonth: 1,
          dueDay: 1,
          status: 'issued',
        },
      ],
    })
    const result = importDataFile(orphan)
    expect(result?.checks).toHaveLength(2)
  })
})

describe('export/import round-trip', () => {
  it('export → import preserves data', () => {
    const roundTripped = importDataFile(exportDataFile(VALID))
    expect(roundTripped).toEqual(VALID)
  })

  it('round-trips a payload with empty checks', () => {
    const minimal = { ...VALID, checkbooks: [], checks: [] }
    expect(importDataFile(exportDataFile(minimal))).toEqual(minimal)
  })

  it('preserves every optional field of every entity', () => {
    const full: DataFile = {
      version: 6,
      settings: { lang: 'en', theme: 'dark', seeded: true },
      loans: [
        {
          id: 'l1',
          name: 'وام مسکن',
          amount: 9_000_000,
          startYear: 1404,
          startMonth: 12,
          duration: 60,
          payments: [
            { id: 'p1', monthIndex: 16860, amount: 4_500_000, paidAt: '2026-10-01T00:00:00.000Z' },
            { id: 'p2', monthIndex: 16861, amount: 9_000_000, paidAt: '2026-11-01T00:00:00.000Z' },
          ],
          createdAt: '2026-09-01T00:00:00.000Z',
          deadlineDay: 25,
        },
      ],
      checkbooks: [
        {
          id: 'cb1',
          bank: 'بانک ملت',
          accountNumber: '9876543210',
          serialFrom: 500,
          serialTo: 525,
          createdAt: '2026-10-05T00:00:00.000Z',
        },
      ],
      checks: [
        {
          id: 'c1',
          checkbookId: 'cb1',
          serial: 500,
          payee: 'فروشنده',
          amount: 1_500_000,
          purpose: 'خرید لوازم',
          dueYear: 1405,
          dueMonth: 9,
          dueDay: 3,
          note: 'یادداشت چک',
          status: 'cleared',
          updatedAt: '2026-11-10T00:00:00.000Z',
        },
        {
          id: 'c2',
          checkbookId: 'cb1',
          serial: 501,
          payee: '',
          amount: 0,
          purpose: '',
          note: '',
          status: 'blank',
          updatedAt: '2026-11-10T00:00:00.000Z',
        },
      ],
      persons: [
        {
          id: 'p1',
          name: 'مریم احمدی',
          phone: '09120000000',
          nationalId: '0012345678',
          note: 'همکار',
          openingBalance: -2_500_000,
          createdAt: '2026-09-02T00:00:00.000Z',
        },
      ],
      personAccounts: [
        {
          id: 'a1',
          personId: 'p1',
          bank: 'بانک صادرات',
          holderName: 'مریم احمدی',
          accountNumber: '1112223334',
          iban: 'IR000000000000000000000000',
          cardNumber: '6104337700000000',
        },
      ],
      personTxns: [
        {
          id: 't1',
          personId: 'p1',
          kind: 'receipt',
          accountId: 'a1',
          title: 'دریافت قرض',
          amount: 1_000_000,
          year: 1405,
          month: 8,
          day: 20,
          note: 'نقدی',
          createdAt: '2026-11-11T00:00:00.000Z',
        },
      ],
    }

    expect(importDataFile(exportDataFile(full))).toEqual(full)
  })
})