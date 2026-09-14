// Reader-shell document domain types. See progress.md's "Reader-shell
// backlog" (P0/P1) and the Tauri/PWA audit's §3 `DocumentBackend` design —
// the UI must never branch on Tauri-vs-web directly; it talks to this
// interface only, and `createDocumentBackend()` (document-service.ts)
// picks the concrete adapter once at startup.

export type RuntimeKind = 'tauri' | 'web'

export type DocumentSourceKind =
  | 'tauri-path' // desktop: a real filesystem path
  | 'tauri-content-uri' // Android: a `content://` URI
  | 'web-file-handle' // PWA with File System Access API
  | 'web-ephemeral-file' // PWA/browser fallback: a one-shot `<input type=file>` File, no durable write-back

// Identifies an open document independent of platform representation.
// `writable` is a snapshot at open time — always re-checked before a save
// is attempted, never trusted blindly (per audit §16/§49).
export interface DocumentRef {
  id: string
  name: string
  mimeType?: string
  writable: boolean
  sourceKind: DocumentSourceKind
  // Opaque per-backend payload (a path string, a FileSystemFileHandle,
  // etc.) — only the backend that produced this ref ever reads it.
  handle: unknown
}

export interface DocumentSnapshot {
  ref: DocumentRef
  text: string
  modifiedAt?: number
  sizeBytes?: number
}

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'

// What the primary persist action should say and do, per audit §19 — never
// label a download "Save".
export type PersistAction = 'save' | 'save-as' | 'download-copy'

export interface DocumentBackend {
  readonly kind: RuntimeKind
  // Opens the native/browser file picker; null if the user cancelled.
  openFile: () => Promise<DocumentSnapshot | null>
  // Re-reads a previously opened ref (e.g. on relaunch/last-document reopen).
  read: (ref: DocumentRef) => Promise<DocumentSnapshot>
  // Writes back to the same ref. Throws on failure — caller keeps the
  // buffer and draft either way (see useDocumentSession's SAVE_FAILED path).
  save: (ref: DocumentRef, text: string) => Promise<void>
  // "Save as": always prompts for a new destination and returns the new ref.
  saveAs: (ref: DocumentRef, text: string) => Promise<DocumentRef | null>
  // Browser-only escape hatch when there's no writable handle at all —
  // triggers a normal browser download. No-op ref on Tauri.
  downloadCopy: (ref: DocumentRef, text: string) => Promise<void>
  // What the primary persist button should say/do for this ref right now.
  persistAction: (ref: DocumentRef) => PersistAction
}
