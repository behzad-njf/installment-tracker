import { describe, expect, it } from 'vitest'

import { exportDataFile, importDataFile } from './storage'
import type { DataFile } from './types'

const VALID: DataFile = {
  version: 3,
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
    { id: 'cb1', name: 'دسته چک ملی', bank: 'بانک ملی', createdAt: '2026-11-01T00:00:00.000Z' },
  ],
  checks: [
    {
      id: 'c1',
      checkbookId: 'cb1',
      payee: 'بیمه شخص ثالث',
      amount: 3_200_000,
      dueYear: 1405,
      dueMonth: 11,
      dueDay: 18,
      note: '',
      status: 'pending',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
}

describe('importDataFile', () => {
  it('imports a real v3 payload with loans, checkbooks and checks', () => {
    const result = importDataFile(JSON.stringify(VALID))
    expect(result).not.toBeNull()
    expect(result?.version).toBe(3)
    expect(result?.loans[0].name).toBe('وام ازدواج')
    expect(result?.loans[0].payments).toHaveLength(1)
    expect(result?.loans[0].payments[0].monthIndex).toBe(16865)
    expect(result?.checkbooks).toHaveLength(1)
    expect(result?.checks).toHaveLength(1)
    expect(result?.checks[0].status).toBe('pending')
  })

  it('accepts a pre-checks v2 payload (backwards-compatible import)', () => {
    const legacy = { ...VALID, version: 2, checkbooks: undefined, checks: undefined }
    const result = importDataFile(JSON.stringify(legacy as unknown as DataFile))
    expect(result).not.toBeNull()
    expect(result?.version).toBe(3)
    expect(result?.loans[0].name).toBe('وام ازدواج')
    expect(result?.checkbooks).toEqual([])
    expect(result?.checks).toEqual([])
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
          status: 'pending',
        },
      ],
    })
    const result = importDataFile(orphan)
    expect(result?.checks).toHaveLength(1)
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
})