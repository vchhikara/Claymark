import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './toast.css'

// Promoted from scratch/shadcn-prototype/ported-toast.tsx (Phase 4.5).
// shadcn's `sonner` component wraps the standalone `sonner` package + Next-
// specific `next-themes` — no Radix primitive to preserve, so this is a
// small hand-built context + portal + auto-dismiss timer with a
// sonner-like `toast()` API, styled from tokens.css.
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

export function Toaster({ children }: { children: ReactNode }) {
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
        document.body
      )}
    </ToastContext.Provider>
  )
}

function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a Toaster')
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
