// Web/PWA DocumentBackend adapter. Audit §17–19: prefer the File System
// Access API when the browser supports it (real Save-in-place); fall back
// to `<input type=file>` + download everywhere else, and never claim a
// download is a "Save".

import type { DocumentBackend, DocumentRef, DocumentSnapshot, PersistAction } from '../types'

// Minimal ambient shape for the File System Access API — not yet in
// TypeScript's lib.dom.d.ts as of the pinned `typescript` version, and only
// the handful of members this adapter actually calls.
interface FsaFileHandle {
  readonly kind: 'file'
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>
  queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

interface WindowWithFsa extends Window {
  showOpenFilePicker?: (opts: unknown) => Promise<FsaFileHandle[]>
  showSaveFilePicker?: (opts: unknown) => Promise<FsaFileHandle>
}

export function canUseFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

let ephemeralIdCounter = 0

function snapshotFromFile(file: File, ref: DocumentRef): Promise<DocumentSnapshot> {
  return file.text().then((text) => ({
    ref,
    text,
    modifiedAt: file.lastModified,
    sizeBytes: file.size,
  }))
}

async function openViaFsa(): Promise<DocumentSnapshot | null> {
  const win = window as WindowWithFsa
  let handles: FsaFileHandle[]
  try {
    handles = await win.showOpenFilePicker!({
      multiple: false,
      types: [
        {
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.md', '.markdown'] },
        },
      ],
    })
  } catch (error) {
    // AbortError: user cancelled the picker — not a failure.
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
  const handle = handles[0]
  if (!handle) return null
  const file = await handle.getFile()
  const ref: DocumentRef = {
    id: `web-file-handle:${handle.name}`,
    name: handle.name,
    ...(file.type ? { mimeType: file.type } : {}),
    writable: true, // re-verified in `save()` via queryPermission before every write
    sourceKind: 'web-file-handle',
    handle,
  }
  return snapshotFromFile(file, ref)
}

function openViaInput(): Promise<DocumentSnapshot | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown,text/plain'
    input.style.display = 'none'
    // A cancelled native picker fires no event at all (no 'cancel' event in
    // older browsers) — resolve null on window focus-return with no change,
    // via a short-lived focus listener, so the caller isn't left hanging.
    let settled = false
    const onChange = (): void => {
      settled = true
      window.removeEventListener('focus', onFocusReturn)
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      const id = `web-ephemeral-file:${Date.now()}:${(ephemeralIdCounter += 1)}`
      const ref: DocumentRef = {
        id,
        name: file.name,
        ...(file.type ? { mimeType: file.type } : {}),
        writable: false, // no durable write-back for a plain File — persistAction() says download-copy
        sourceKind: 'web-ephemeral-file',
        handle: null,
      }
      snapshotFromFile(file, ref).then(resolve, reject)
    }
    const onFocusReturn = (): void => {
      // Give the 'change' event (fired first on most browsers) a tick to
      // win the race before treating this as a cancel.
      window.removeEventListener('focus', onFocusReturn)
      setTimeout(() => {
        if (!settled) resolve(null)
      }, 300)
    }
    input.addEventListener('change', onChange, { once: true })
    window.addEventListener('focus', onFocusReturn)
    document.body.appendChild(input)
    input.click()
    // Not removed synchronously: some browsers ignore .click() on a
    // detached element. Cleaned up after the change/cancel resolves.
    setTimeout(() => input.remove(), 60_000)
  })
}

async function verifyWritable(handle: FsaFileHandle): Promise<boolean> {
  if (!handle.queryPermission) return true // API present but permission methods absent: assume granted (Chromium always has both together)
  const state = await handle.queryPermission({ mode: 'readwrite' })
  if (state === 'granted') return true
  if (!handle.requestPermission) return false
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

function triggerDownload(name: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on a delay, not immediately — some browsers cancel the download
  // if the object URL is revoked before the click has been fully handled.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function createWebDocumentBackend(): DocumentBackend {
  const useFsa = canUseFileSystemAccess()

  return {
    kind: 'web',

    openFile: () => (useFsa ? openViaFsa() : openViaInput()),

    read: async (ref) => {
      if (ref.sourceKind === 'web-file-handle') {
        const file = await (ref.handle as FsaFileHandle).getFile()
        return snapshotFromFile(file, ref)
      }
      throw new Error('This file cannot be reopened — open it again from the file picker.')
    },

    save: async (ref, text) => {
      if (ref.sourceKind !== 'web-file-handle') {
        throw new Error('No writable handle for this document — use Download copy instead.')
      }
      const handle = ref.handle as FsaFileHandle
      if (!(await verifyWritable(handle))) {
        throw new Error('Write permission was not granted for this file.')
      }
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
    },

    saveAs: async (ref, text) => {
      const win = window as WindowWithFsa
      if (!win.showSaveFilePicker) return null
      let handle: FsaFileHandle
      try {
        handle = await win.showSaveFilePicker({
          suggestedName: ref.name,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return null
        throw error
      }
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
      return {
        id: `web-file-handle:${handle.name}`,
        name: handle.name,
        ...(ref.mimeType ? { mimeType: ref.mimeType } : {}),
        writable: true,
        sourceKind: 'web-file-handle',
        handle,
      }
    },

    downloadCopy: async (ref, text) => {
      triggerDownload(ref.name, text)
    },

    persistAction: (ref): PersistAction => {
      if (ref.sourceKind === 'web-file-handle') return 'save'
      if (useFsa) return 'save-as' // File System Access present but this doc has no handle (came in some other way) — offer Save as
      return 'download-copy'
    },
  }
}
