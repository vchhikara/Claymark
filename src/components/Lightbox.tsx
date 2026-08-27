import { useEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface LightboxProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// T-P7-04: modal overlay for the enlarged image view.
// - `role="dialog"` + `aria-modal="true"` mark it as a modal to AT.
// - Focus moves into the dialog on open and is trapped there (Tab/Shift+Tab
//   wrap within its focusable elements) until it closes.
// - Escape closes the dialog and restores focus to whatever triggered it.
export function Lightbox({ open, onClose, title, children }: LightboxProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    const focusables = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
    ;(focusables[0] ?? dialog)?.focus()

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const current = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
      if (current.length === 0) {
        event.preventDefault()
        return
      }
      const first = current[0]!
      const last = current[current.length - 1]!
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="claymark-lightbox-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="claymark-lightbox"
        role="dialog"
        aria-modal="true"
        // T-P8-03: `title` is optional (an image without a caption has
        // none) — an `aria-label` of `undefined` leaves the dialog with no
        // accessible name at all, which every AT and axe-core's
        // aria-dialog-name-equivalent checks flag. Fall back to a generic
        // but always-present name.
        aria-label={title ?? 'Image preview'}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  )
}
