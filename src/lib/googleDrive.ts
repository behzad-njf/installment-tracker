/**
 * Google Drive backup: one file `finance-backup.json` in the user's own Drive.
 * Uses the Google Identity Services token model — no backend, no client secret.
 * ponytail: access tokens live ~1h and cannot be extended without a backend, so the
 * token sits in localStorage and is renewed silently ~5 min before expiry — the user
 * stays connected for as long as their Google login lives.
 * Ceiling: browsers that block third-party cookies to accounts.google.com (Safari)
 * cannot refresh silently; there the user reconnects when the token dies.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILE_NAME = 'finance-backup.json'
const ATTACHMENT_FOLDER_NAME = 'finance-attachments/'
const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const TOKEN_KEY = 'finance.drive.token'
const LINK_KEY = 'finance.drive.linked'

import type { Attachment, PersonTxn } from './types'
import { clearAttachments, getAttachment, putAttachment } from './attachments'

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export interface DriveBackup {
  id: string
  modifiedTime: string
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string }) => void
          }): { requestAccessToken(options?: { prompt?: string }): void }
        }
      }
    }
  }
}

let token: { value: string; expiresAt: number } | null = readToken()
let refreshTimer: number | undefined
let watching = false

function readToken(): { value: string; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value?: unknown; expiresAt?: unknown }
    if (typeof parsed.value !== 'string' || typeof parsed.expiresAt !== 'number') return null
    return parsed.expiresAt > Date.now() ? { value: parsed.value, expiresAt: parsed.expiresAt } : null
  } catch {
    return null
  }
}

function storeToken(next: { value: string; expiresAt: number } | null): void {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, JSON.stringify(next))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode / storage disabled — session-only token */
  }
  if (next) scheduleRefresh(next.expiresAt)
  else clearRefresh()
}

function markLinked(on: boolean): void {
  try {
    if (on) localStorage.setItem(LINK_KEY, '1')
    else localStorage.removeItem(LINK_KEY)
  } catch {
    /* ignore */
  }
}

/** True once this browser connected — a silent refresh can then restore access without a click. */
export function isLinked(): boolean {
  try {
    return localStorage.getItem(LINK_KEY) === '1'
  } catch {
    return false
  }
}

function clearRefresh(): void {
  if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
  refreshTimer = undefined
}

/** Renews silently 5 min before expiry so a long session never hits the 1 h wall. */
function scheduleRefresh(expiresAt: number): void {
  clearRefresh()
  const delay = Math.max(30_000, expiresAt - Date.now() - 5 * 60_000)
  refreshTimer = window.setTimeout(() => {
    requestToken('').catch(() => {
      storeToken(null)
      markLinked(false)
    })
  }, delay)
}

function loadGis(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('gis')))
    if (!existing) {
      script.src = GIS_SRC
      script.async = true
      document.head.appendChild(script)
    }
  })
}

function requestToken(prompt: '' | 'select_account' | 'consent'): Promise<string> {
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error('client'))
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPE,
          callback: response => {
            if (!response.access_token) {
              reject(new Error(response.error ?? 'auth'))
              return
            }
            const expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
            markLinked(true)
            storeToken({ value: response.access_token, expiresAt })
            resolve(response.access_token)
          },
          error_callback: error => reject(new Error(error.type)),
        })
        client.requestAccessToken({ prompt })
      }),
  )
}

/** Reuses the stored token, silently renewing it while the Google login is still alive. */
export async function ensureAccess(): Promise<void> {
  if (token && token.expiresAt > Date.now() + 60_000) return
  if (!token && !isLinked()) throw new Error('auth')
  await requestToken('')
}

/**
 * Silent, gesture-free renewal on app start and whenever the tab regains focus.
 * Keeps a previously connected browser connected without any user click.
 */
export function warmUp(): void {
  if (!watching) {
    watching = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') warmUp()
    })
  }
  if (!isLinked()) return
  if (token && token.expiresAt > Date.now() + 5 * 60_000) {
    scheduleRefresh(token.expiresAt)
    return
  }
  requestToken('').catch(() => {
    storeToken(null)
    markLinked(false)
  })
}

/** Explicit user gesture: opens the account picker / consent screen. */
export async function connect(): Promise<void> {
  storeToken(null)
  await requestToken('select_account')
}

export function disconnect(): void {
  storeToken(null)
  markLinked(false)
}

/** Connected = a live token, or a previous connection a silent refresh can revive. */
export function isConnected(): boolean {
  return Boolean(token && token.expiresAt > Date.now()) || isLinked()
}

/** Newest file wins; Drive returns whatever order it likes. */
export function pickLatest(files: DriveBackup[]): DriveBackup | null {
  return files.reduce<DriveBackup | null>(
    (best, file) => (!best || Date.parse(file.modifiedTime) > Date.parse(best.modifiedTime) ? file : best),
    null,
  )
}

/** Drive multipart upload body: metadata part + JSON content part. */
export function buildMultipart(metadata: Record<string, unknown>, json: string): { body: string; contentType: string } {
  const boundary = `finance${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    json,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return { body, contentType: `multipart/related; boundary=${boundary}` }
}

async function authorized(input: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await ensureAccess()
    const response = await fetch(input, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token!.value}` },
    })
    if (response.status !== 401) {
      if (!response.ok) throw new Error(`drive ${response.status}`)
      return response
    }
    // Revoked or rotated token: one silent renewal, then retry the same request.
    storeToken(null)
    if (attempt > 0) {
      markLinked(false)
      throw new Error('auth')
    }
  }
}

export async function findBackup(): Promise<DriveBackup | null> {
  const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const response = await authorized(
    `${DRIVE}/files?spaces=drive&q=${query}&fields=files(id,modifiedTime)&pageSize=10`,
  )
  const payload = (await response.json()) as { files?: DriveBackup[] }
  return pickLatest(payload.files ?? [])
}

/** Overwrites the single backup file (creates it on first run). */
export async function backup(json: string): Promise<DriveBackup> {
  const existing = await findBackup()
  if (existing) {
    const response = await authorized(`${UPLOAD}/files/${existing.id}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: json,
    })
    return (await response.json()) as DriveBackup
  }
  const { body, contentType } = buildMultipart({ name: FILE_NAME, mimeType: 'application/json' }, json)
  const response = await authorized(`${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
  return (await response.json()) as DriveBackup
}

/** Returns the raw backup JSON, or null when the account has no backup yet. */
export async function restore(): Promise<string | null> {
  const existing = await findBackup()
  if (!existing) return null
  const response = await authorized(`${DRIVE}/files/${existing.id}?alt=media`)
  return response.text()
}

/** Authenticated user profile (email, name) — same drive.file token. */
export interface DriveUser {
  emailAddress?: string
  displayName?: string
}

export async function getUser(): Promise<DriveUser | null> {
  const response = await authorized(`${DRIVE}/about?fields=user`)
  const payload = (await response.json()) as { user?: DriveUser }
  return payload.user ?? null
}

/** Finds the `finance-attachments/` folder, without creating it. */
export async function findAttachmentFolder(): Promise<string | null> {
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${ATTACHMENT_FOLDER_NAME}' and trashed=false`
  )
  const response = await authorized(
    `${DRIVE}/files?spaces=drive&q=${query}&fields=files(id)&pageSize=1`
  )
  const payload = (await response.json()) as { files?: { id: string }[] }
  return payload.files?.[0]?.id ?? null
}

/** Ensures the `finance-attachments/` folder exists and returns its id. */
export async function ensureAttachmentFolder(): Promise<string> {
  const existing = await findAttachmentFolder()
  if (existing) return existing
  const response = await authorized(`${DRIVE}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ name: ATTACHMENT_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const created = (await response.json()) as { id: string }
  return created.id
}

/** Uploads one attachment blob to Drive and returns its file id. */
export async function uploadAttachmentBlob(attachmentId: string, name: string, blob: Blob): Promise<string> {
  const folderId = await ensureAttachmentFolder()
  const boundary = `finance${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  const metadata = JSON.stringify({
    name: `${attachmentId}-${name}`,
    parents: [folderId],
    mimeType: blob.type ?? 'application/octet-stream',
  })
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: ${blob.type ?? 'application/octet-stream'}\r\n\r\n`),
    new Uint8Array(await blob.arrayBuffer()),
    encoder.encode(`\r\n--${boundary}--\r\n`),
  ]
  const body = new Blob(parts as unknown as BlobPart[], { type: `multipart/related; boundary=${boundary}` })
  const response = await authorized(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': body.type },
    body,
  })
  const uploaded = (await response.json()) as { id: string }
  return uploaded.id
}

/** Downloads one attachment blob from Drive. */
export async function downloadAttachmentBlob(driveFileId: string): Promise<Blob> {
  const response = await authorized(`${DRIVE}/files/${driveFileId}?alt=media`)
  return response.blob()
}

/** Deletes one attachment file from Drive. */
export async function deleteAttachmentBlob(driveFileId: string): Promise<void> {
  await authorized(`${DRIVE}/files/${driveFileId}`, { method: 'DELETE' })
}

/**
 * Uploads every attachment blob missing a `driveFileId`, returning txns with `driveFileId` filled in.
 * Blobs already backed up (driveFileId present) are left untouched.
 */
export async function stageAttachments(txns: PersonTxn[]): Promise<PersonTxn[]> {
  const result: PersonTxn[] = []
  for (const txn of txns) {
    if (!txn.attachments?.length) {
      result.push(txn)
      continue
    }
    const updated: Attachment[] = []
    for (const att of txn.attachments) {
      if (att.driveFileId) {
        updated.push(att)
        continue
      }
      const blob = await getAttachment(att.id)
      if (!blob) {
        updated.push(att)
        continue
      }
      const driveFileId = await uploadAttachmentBlob(att.id, att.name, blob)
      updated.push({ ...att, driveFileId })
    }
    result.push({ ...txn, attachments: updated })
  }
  return result
}

/**
 * Clears the local attachment store, then downloads every attachment blob that has a `driveFileId`
 * back into IndexedDB. Mirrors "restore replaces everything".
 */
export async function restoreAttachments(txns: PersonTxn[]): Promise<void> {
  await clearAttachments()
  for (const txn of txns) {
    if (!txn.attachments?.length) continue
    for (const att of txn.attachments) {
      if (!att.driveFileId) continue
      const blob = await downloadAttachmentBlob(att.driveFileId)
      await putAttachment(att.id, blob)
    }
  }
}
