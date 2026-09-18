// Phase 2.4 (android-to-desktop-checklist.md §3): crash-recovery draft
// buffer. Always-on regardless of the autosave setting (distinct from
// autosave.ts's separate 1200ms writer — these are two independent
// debounced writers per the checklist's explicit framing). Debounced
// 700ms, keyed by document id, auto-clears once content matches the
// last-saved baseline, and force-flushable synchronously for
// window-blur/close/quit handlers (Phase 2.4/5's wiring).
import { clearDraft, writeDraft } from './draftPersistence'

export interface DraftBuffer {
  onChange: (content: string) => void
  /** Force-flush with no debounce — call on window blur/close-requested/quit. */
  flush: () => void
  dispose: () => void
}

const DEBOUNCE_MS = 700

export function createDraftBuffer(documentId: string, lastSavedContent: string): DraftBuffer {
  let pending: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const commit = (content: string): void => {
    if (content === lastSavedContent) {
      clearDraft(documentId)
    } else {
      writeDraft(documentId, content)
    }
    pending = null
  }

  const onChange = (content: string): void => {
    pending = content
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (pending !== null) commit(pending)
    }, DEBOUNCE_MS)
  }

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pending !== null) commit(pending)
  }

  const dispose = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  return { onChange, flush, dispose }
}
