import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// DEVIATION FROM THE "HAND-PORT" PATTERN — documented, not silent:
// shadcn's `sonner` isn't a Radix primitive at all. It's a wrapper around the
// standalone `sonner` npm package (its own animation/stacking engine) plus
// `next-themes` (Next.js-specific — meaningless in this Vite app). There is
// no Radix behavior to preserve here, so "keep the primitive, replace the
// styling" doesn't apply. Instead this is a small hand-built toast: a
// context + portal + auto-dismiss timer, styled from tokens.css, with a
// `sonner`-like API (`toast(message)` / `toast.success/error(...)`) so call
// sites read the same. See FINDINGS.md for why this one component category
// couldn't follow the batch's normal port recipe.

export type ToastVariant = 'default' | 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  push: (message: string, variant: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let idCounter = 0

export function PortedToaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = ++idCounter
    setToasts((current) => [...current, { id, message, variant }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pb-toast-viewport" data-slot="toast-viewport">
          {toasts.map((t) => (
            <div key={t.id} role="status" data-slot="toast" data-variant={t.variant} className="pb-toast">
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a PortedToaster')
  }
  return ctx
}

export function useToast() {
  const { push } = useToastContext()
  return {
    toast: (message: string) => push(message, 'default'),
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
  }
}
