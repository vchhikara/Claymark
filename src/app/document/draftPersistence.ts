// Phase 2.4 — the actual storage backend for crash-recovery drafts, kept as
// a thin, separately-mockable module so draftStore.ts's debounce/flush logic
// can be unit tested without touching real storage. Uses localStorage:
// drafts are small (a single in-progress document's text) and need no
// directory/path semantics, unlike the documents themselves (fileIO.ts).
// Revisit if draft size ever needs to exceed localStorage's practical quota.
const PREFIX = 'claymark-draft:'

export function readDraft(id: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null
  try {
    return window.localStorage.getItem(PREFIX + id)
  } catch {
    return null
  }
}

export function writeDraft(id: string, content: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + id, content)
  } catch {
    // Storage can throw (quota, private mode) — draft recovery degrades
    // gracefully to "no draft available", not a crash.
  }
}

export function clearDraft(id: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.removeItem(PREFIX + id)
  } catch {
    // See writeDraft.
  }
}
