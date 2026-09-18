import { useEffect } from 'react'

// Phase 4.6 (android-to-desktop-checklist.md §5): Ctrl+F/Ctrl+S/Ctrl+E must
// fire even when a text field has focus — a root-level capture-phase
// listener, not relying on bubbling past a focused input that could
// stopPropagation.
export interface GlobalShortcutHandlers {
  onFind: () => void
  onSave: () => void
  onToggleEdit: () => void
}

export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        handlers.onFind()
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        handlers.onSave()
      } else if (event.key.toLowerCase() === 'e') {
        event.preventDefault()
        handlers.onToggleEdit()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [handlers])
}
