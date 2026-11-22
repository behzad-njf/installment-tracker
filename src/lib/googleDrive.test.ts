import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import {
  buildMultipart,
  disconnect,
  isConnected,
  isLinked,
  pickLatest,
  restoreAttachments,
  stageAttachments,
} from './googleDrive'

const mocks = vi.hoisted(() => ({
  getAttachment: vi.fn(),
  putAttachment: vi.fn(),
  clearAttachments: vi.fn(),
}))

vi.mock('./attachments', () => mocks)

const { getAttachment, putAttachment, clearAttachments } = mocks

const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: mockFetch,
})

const fakeBlob = () => new Blob(['fake-bytes'], { type: 'image/png' })

const localStorageStore: Record<string, string> = {}

let storedCallback: ((resp: any) => void) | null = null

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => localStorageStore[k] ?? null,
    setItem: (k: string, v: string) => { localStorageStore[k] = v },
    removeItem: (k: string) => { delete localStorageStore[k] },
  },
})

// توکن همیشه منقضی شده است تا ensureAccess همیشه requestToken فراخوانی کند
const realDateNow = Date.now
vi.spyOn(Date, 'now').mockReturnValue(realDateNow() + 7200 * 1000)

// GSI + localStorage Made-up برای محیط Nodeodeon
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (k: string) => localStorageStore[k] ?? null,
      setItem: (k: string, v: string) => { localStorageStore[k] = v },
      removeItem: (k: string) => { delete localStorageStore[k] },
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    google: {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config: any) => {
            storedCallback = config.callback
            return {
              requestAccessToken: vi.fn(() => {
                if (storedCallback) storedCallback({ access_token: 'fake-token', expires_in: 3600 })
              }),
            }
          }),
        },
      },
    },
  },
})

beforeEach(() => {
  getAttachment.mockClear()
  putAttachment.mockClear()
  clearAttachments.mockClear()
  mockFetch.mockClear()
  storedCallback = null
  Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  localStorageStore['finance.drive.linked'] = '1'

  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const u = String(input)
    if (u.includes('/files?q=')) {
      return Promise.resolve(new Response(JSON.stringify({ files: [] }), { status: 200 }))
    }
    if (u.includes('/files?fields=id')) {
      return Promise.resolve(new Response(JSON.stringify({ id: 'folder-id' }), { status: 200 }))
    }
    if (u.includes('/files?uploadType=multipart')) {
      return Promise.resolve(new Response(JSON.stringify({ id: 'drive-file-1' }), { status: 200 }))
    }
    if (u.includes('?alt=media')) {
      return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('connection persistence', () => {
  it('stays connected with a dead token while the link flag survives', () => {
    disconnect()
    expect(isConnected()).toBe(false)
    localStorageStore['finance.drive.linked'] = '1'
    expect(isLinked()).toBe(true)
    expect(isConnected()).toBe(true)
  })

  it('disconnect clears the link so no silent refresh runs again', () => {
    localStorageStore['finance.drive.linked'] = '1'
    disconnect()
    expect(isLinked()).toBe(false)
    expect(isConnected()).toBe(false)
  })
})

describe('stageAttachments', () => {
  it('uploads blobs missing driveFileId and fills them in', async () => {
    ;(getAttachment as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(fakeBlob())

    const txns = [
      { id: 'txn-1', attachments: [{ id: 'att-1', name: 'a.png', type: 'image/png', size: 100 }] },
    ]

    const result = await stageAttachments(txns as any[])

    expect(result[0].attachments![0].driveFileId).toBe('drive-file-1')
    expect(getAttachment).toHaveBeenCalledWith('att-1')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('skips attachments that already have driveFileId', async () => {
    const txns = [
      {
        id: 'txn-1',
        attachments: [{ id: 'att-1', name: 'a.png', type: 'image/png', size: 100, driveFileId: 'existing' }],
      },
    ]

    const result = await stageAttachments(txns as any[])

    expect(result[0].attachments![0].driveFileId).toBe('existing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips attachments whose blob is not in IndexedDB', async () => {
    ;(getAttachment as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const txns = [
      { id: 'txn-1', attachments: [{ id: 'att-1', name: 'a.png', type: 'image/png', size: 100 }] },
    ]

    const result = await stageAttachments(txns as any[])

    expect(result[0].attachments![0].driveFileId).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('restoreAttachments', () => {
  it('clears store then downloads and puts blobs with driveFileId', async () => {
    const txns = [
      {
        id: 'txn-1',
        attachments: [{ id: 'att-1', name: 'a.png', type: 'image/png', size: 100, driveFileId: 'drive-1' }],
      },
    ]

    await restoreAttachments(txns as any[])

    expect(clearAttachments).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalled()
    expect(putAttachment).toHaveBeenCalledWith('att-1', expect.any(Blob))
  })

  it('skips attachments without driveFileId', async () => {
    const txns = [
      { id: 'txn-1', attachments: [{ id: 'att-1', name: 'a.png', type: 'image/png', size: 100 }] },
    ]

    await restoreAttachments(txns as any[])

    expect(mockFetch).not.toHaveBeenCalled()
    expect(putAttachment).not.toHaveBeenCalled()
  })
})

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
