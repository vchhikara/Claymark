/** File open/save via the File System Access API, with fallbacks (LEDGER X-019). */
import { idb } from './idb'

export interface Doc {
  id: string
  name: string
  content: string
  savedContent: string
  handle?: FileSystemFileHandle
  kind: 'file' | 'sample' | 'selection' | 'new' | 'snapshot'
}
export interface RecentEntry {
  id: string
  name: string
  handle?: FileSystemFileHandle
  content: string // snapshot; used when the handle is gone or permission denied
  openedAt: number
}
export interface Draft {
  docId: string
  name: string
  content: string
  savedAt: number
  kind: Doc['kind']
}

const MD_TYPES = [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd', '.mdx', '.txt'] } }]
export const MAX_BYTES = 10 * 1024 * 1024
const RECENT_LIMIT = 10
const SNAPSHOT_LIMIT = 2 * 1024 * 1024

export const hasFsAccess = typeof (window as any).showOpenFilePicker === 'function'
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function isMarkdownName(name: string) {
  return /\.(md|markdown|mdown|mkd|mdx|txt)$/i.test(name)
}

async function readFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`File is larger than ${MAX_BYTES / 1024 / 1024} MB`)
  return file.text()
}

export async function docFromHandle(handle: FileSystemFileHandle): Promise<Doc> {
  const content = await readFile(await handle.getFile())
  return { id: uid(), name: handle.name, content, savedContent: content, handle, kind: 'file' }
}
export async function docFromFile(file: File): Promise<Doc> {
  const content = await readFile(file)
  return { id: uid(), name: file.name, content, savedContent: content, kind: 'file' }
}

/** Returns null if the user cancelled. */
export async function pickFile(): Promise<Doc | null> {
  if (hasFsAccess) {
    try {
      const [h] = await (window as any).showOpenFilePicker({ types: MD_TYPES, excludeAcceptAllOption: false, multiple: false })
      return await docFromHandle(h)
    } catch (e: any) {
      if (e?.name === 'AbortError') return null
      throw e
    }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.mdown,.mkd,.mdx,.txt,text/markdown,text/plain'
    input.onchange = () => {
      const f = input.files?.[0]
      if (!f) return resolve(null)
      docFromFile(f).then(resolve, reject)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

async function ensureWrite(handle: FileSystemFileHandle, prompt: boolean) {
  const opts = { mode: 'readwrite' } as const
  const h = handle as any
  if ((await h.queryPermission?.(opts)) === 'granted') return true
  if (!prompt) return false
  return (await h.requestPermission?.(opts)) === 'granted'
}

async function write(handle: FileSystemFileHandle, content: string) {
  const w = await (handle as any).createWritable()
  await w.write(content)
  await w.close()
}

/** Save in place. Returns false if not possible without a picker. */
export async function saveInPlace(doc: Doc, prompt = true): Promise<boolean> {
  if (!doc.handle) return false
  if (!(await ensureWrite(doc.handle, prompt))) return false
  await write(doc.handle, doc.content)
  return true
}

/** Save as. Returns the new handle, 'downloaded', or null if cancelled. */
export async function saveAs(doc: Doc): Promise<FileSystemFileHandle | 'downloaded' | null> {
  const suggestedName = isMarkdownName(doc.name) ? doc.name : `${doc.name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Untitled'}.md`
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      const h: FileSystemFileHandle = await (window as any).showSaveFilePicker({ suggestedName, types: MD_TYPES })
      await write(h, doc.content)
      return h
    } catch (e: any) {
      if (e?.name === 'AbortError') return null
      throw e
    }
  }
  const url = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}

/* ---- recent files ---- */
export async function listRecent(): Promise<RecentEntry[]> {
  try {
    return (await idb.getAll<RecentEntry>('recent')).sort((a, b) => b.openedAt - a.openedAt)
  } catch {
    return []
  }
}
export async function touchRecent(doc: Doc) {
  if (doc.kind === 'sample' || doc.kind === 'new') return
  try {
    const all = await listRecent()
    // Same file (by handle) or same name without handle → replace entry.
    for (const r of all) {
      const same = doc.handle && r.handle ? await (r.handle as any).isSameEntry(doc.handle) : !doc.handle && !r.handle && r.name === doc.name
      if (same) await idb.del('recent', r.id)
    }
    await idb.put('recent', {
      id: uid(),
      name: doc.name,
      handle: doc.handle,
      content: doc.savedContent.length <= SNAPSHOT_LIMIT ? doc.savedContent : '',
      openedAt: Date.now(),
    } satisfies RecentEntry)
    const fresh = await listRecent()
    for (const r of fresh.slice(RECENT_LIMIT)) await idb.del('recent', r.id)
  } catch {
    /* storage unavailable — non-fatal */
  }
}
export async function openRecent(r: RecentEntry): Promise<Doc> {
  if (r.handle) {
    try {
      const h = r.handle as any
      let perm = await h.queryPermission?.({ mode: 'read' })
      if (perm !== 'granted') perm = await h.requestPermission?.({ mode: 'read' })
      if (perm === 'granted') return await docFromHandle(r.handle)
    } catch {
      /* moved/deleted → fall back to snapshot */
    }
  }
  return { id: uid(), name: r.name, content: r.content, savedContent: r.content, kind: 'snapshot' }
}
export const clearRecent = () => idb.clear('recent').catch(() => {})

/* ---- crash-recovery draft ---- */
export const saveDraft = (d: Draft) => idb.put('kv', d, 'draft').catch(() => {})
export const loadDraft = () => idb.get<Draft | undefined>('kv', 'draft').catch(() => undefined)
export const clearDraft = () => idb.del('kv', 'draft').catch(() => {})
