/**
 * Local blob store for transaction attachment images.
 * IndexedDB, not localStorage — a few screenshots exceed localStorage's ~5MB quota.
 * ponytail: one object store keyed by attachment id; no indexes or versioning needed
 * until we start querying by person/txn. Upgrade path: add indexes on open.
 */
const DB_NAME = 'finance.attachments'
const DB_VERSION = 1
const STORE = 'blobs'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = run(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function putAttachment(id: string, blob: Blob): Promise<void> {
  await request('readwrite', store => store.put(blob, id))
}

export async function getAttachment(id: string): Promise<Blob | undefined> {
  return request<Blob | undefined>('readonly', store => store.get(id))
}

export async function deleteAttachment(id: string): Promise<void> {
  await request('readwrite', store => store.delete(id))
}

export async function deleteAttachments(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const id of ids) store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Wipe every stored blob — used by «clear all data». */
export async function clearAttachments(): Promise<void> {
  await request('readwrite', store => store.clear())
}
