import { describe, expect, it } from 'vitest'

import { exportDataFile, importDataFile } from './storage'
import type { DataFile } from './types'

const VALID: DataFile = {
  version: 2,
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
}

describe('importDataFile', () => {
  it('imports a real backup payload with version, settings and payments', () => {
    const result = importDataFile(JSON.stringify(VALID))
    expect(result).not.toBeNull()
    expect(result?.loans[0].name).toBe('وام ازدواج')
    expect(result?.loans[0].payments).toHaveLength(1)
    expect(result?.loans[0].payments[0].monthIndex).toBe(16865)
    expect(result?.settings.lang).toBe('fa')
  })

  it('rejects raw JSON text that was never parsed', () => {
    expect(importDataFile(JSON.stringify(VALID))).not.toBeNull()
  })

  it('rejects non-JSON garbage', () => {
    expect(importDataFile('not json at all')).toBeNull()
  })

  it('rejects a JSON object without loans array', () => {
    expect(importDataFile(JSON.stringify({ version: 2 }))).toBeNull()
  })

  it('drops loans missing name/amount but keeps valid ones', () => {
    const mixed = JSON.stringify({ ...VALID, loans: [...VALID.loans, { id: 'bad' }] })
    const result = importDataFile(mixed)
    expect(result?.loans).toHaveLength(1)
  })
})

describe('export/import round-trip', () => {
  it('export → import preserves data', () => {
    const roundTripped = importDataFile(exportDataFile(VALID))
    expect(roundTripped).toEqual(VALID)
  })
})
