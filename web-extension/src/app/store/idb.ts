/** Tiny IndexedDB wrapper. IDB (not chrome.storage) because it can store
 *  FileSystemFileHandle objects via structured clone (LEDGER X-020). */
const DB = 'claymark'
const VERSION = 1
let dbp: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, VERSION)
    r.onupgradeneeded = () => {
      const d = r.result
      if (!d.objectStoreNames.contains('recent')) d.createObjectStore('recent', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  return dbp
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((res, rej) => {
        const t = d.transaction(store, mode)
        const req = fn(t.objectStore(store))
        t.oncomplete = () => res(req ? (req.result as T) : (undefined as T))
        t.onerror = () => rej(t.error)
        t.onabort = () => rej(t.error)
      }),
  )
}

export const idb = {
  getAll: <T>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
  put: (store: string, value: unknown, key?: IDBValidKey) => tx(store, 'readwrite', (s) => void s.put(value, key)),
  get: <T>(store: string, key: IDBValidKey) => tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>),
  del: (store: string, key: IDBValidKey) => tx(store, 'readwrite', (s) => void s.delete(key)),
  clear: (store: string) => tx(store, 'readwrite', (s) => void s.clear()),
}
