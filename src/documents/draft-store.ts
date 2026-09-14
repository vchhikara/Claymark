// Recovery-draft persistence (audit §27–28). P0 implementation: debounced
// localStorage, keyed by document id — works identically inside the Tauri
// WebView and a browser tab with no runtime branching. This is a known,
// disclosed simplification of the audit's fuller recommendation (Tauri
// app-data dir / OPFS): localStorage has a ~5-10MB per-origin quota and is
// cleared by "clear site data", which is an acceptable P0 risk for typical
// Markdown file sizes but not a P1-complete implementation — see
// progress.md's P1 item for the follow-up.

export interface RecoveryDraft {
  documentId: string
  displayName: string
  text: string
  baseModifiedAt?: number
  draftModifiedAt: number
}

const KEY_PREFIX = 'claymark:draft:'

function keyFor(documentId: string): string {
  // documentId can contain arbitrary characters (a full path or content://
  // URI) — hash-free but namespaced; localStorage keys have no character
  // restriction, so no encoding is needed beyond the prefix.
  return `${KEY_PREFIX}${documentId}`
}

export const draftStore = {
  put(draft: RecoveryDraft): void {
    try {
      localStorage.setItem(keyFor(draft.documentId), JSON.stringify(draft))
    } catch {
      // Quota exceeded or storage disabled — the draft is best-effort; the
      // explicit Save path remains the real persistence guarantee.
    }
  },

  get(documentId: string): RecoveryDraft | null {
    try {
      const raw = localStorage.getItem(keyFor(documentId))
      return raw ? (JSON.parse(raw) as RecoveryDraft) : null
    } catch {
      return null
    }
  },

  remove(documentId: string): void {
    try {
      localStorage.removeItem(keyFor(documentId))
    } catch {
      // no-op
    }
  },
}
