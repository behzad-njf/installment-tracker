import { describe, expect, it } from 'vitest'

import { buildMultipart, pickLatest } from './googleDrive'

describe('pickLatest', () => {
  it('returns the newest file regardless of order', () => {
    const older = { id: 'a', modifiedTime: '2026-11-01T10:00:00.000Z' }
    const newer = { id: 'b', modifiedTime: '2026-11-20T10:00:00.000Z' }
    expect(pickLatest([older, newer])?.id).toBe('b')
    expect(pickLatest([newer, older])?.id).toBe('b')
  })

  it('returns null for an empty list', () => {
    expect(pickLatest([])).toBeNull()
  })
})

describe('buildMultipart', () => {
  const json = '{"version":6,"loans":[]}'
  const { body, contentType } = buildMultipart({ name: 'finance-backup.json' }, json)

  it('uses one boundary for the header and the body', () => {
    const boundary = contentType.split('boundary=')[1]
    expect(contentType.startsWith('multipart/related; boundary=')).toBe(true)
    expect(body.startsWith(`--${boundary}\r\n`)).toBe(true)
    expect(body.endsWith(`--${boundary}--\r\n`)).toBe(true)
  })

  it('carries the metadata and the untouched JSON payload', () => {
    expect(body).toContain(JSON.stringify({ name: 'finance-backup.json' }))
    expect(body).toContain(json)
    expect(body.split('Content-Type: application/json; charset=UTF-8')).toHaveLength(3)
  })
})
