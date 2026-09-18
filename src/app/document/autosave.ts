// Phase 2.4 (android-to-desktop-checklist.md §3): autosave — separate from
// the crash-recovery draft buffer (draftStore.ts). Debounced 1200ms, gated
// on (setting ON && writable in-place), re-validates writability at the
// moment it actually fires (not a value captured when scheduled), and never
// falls back to a save-as picker — if it can't write in place, it silently
// skips rather than surprising the user with a file dialog mid-keystroke.
import { saveDocument } from './fileIO'

export interface AutosaveOptions {
  path: string
  enabled: boolean
  writable: boolean
  onSaved: () => void
}

export interface Autosave {
  onChange: (content: string) => void
  dispose: () => void
}

const DEBOUNCE_MS = 1200

export function createAutosave(options: AutosaveOptions): Autosave {
  let timer: ReturnType<typeof setTimeout> | null = null

  const onChange = (content: string): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (!options.enabled || !options.writable) return
      void saveDocument(options.path, content).then(() => options.onSaved())
    }, DEBOUNCE_MS)
  }

  const dispose = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return { onChange, dispose }
}
