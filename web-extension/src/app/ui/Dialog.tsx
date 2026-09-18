import type { ReactNode } from 'react'
import { PortedDialog, PortedDialogContent, PortedDialogHeader, PortedDialogTitle } from './pb/dialog'

/**
 * Same external API as before this port (title/onClose/children/actions/
 * labelledBy) so every call site in App.tsx is unchanged — only the
 * implementation swapped from a hand-rolled focus trap to Radix's Dialog
 * primitive (scratch/shadcn-prototype/ported-dialog.tsx in the main repo),
 * which gives the same guarantees (focus trap, ESC-close, focus return,
 * aria-modal/aria-labelledby) as tested, real Radix behavior instead of a
 * hand-maintained implementation of the same contract.
 */
export function Dialog({ title, onClose, children, actions, labelledBy = 'cm-dialog-title' }: {
  title: string
  onClose: () => void
  children?: ReactNode
  actions?: ReactNode
  labelledBy?: string
}) {
  return (
    <PortedDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <PortedDialogContent
        aria-labelledby={labelledBy}
        onOpenAutoFocus={(e) => {
          const container = (e.currentTarget as HTMLElement)
          const autofocus = container.querySelector<HTMLElement>('[data-autofocus]')
          if (autofocus) {
            e.preventDefault()
            autofocus.focus()
          }
        }}
      >
        <PortedDialogHeader>
          <PortedDialogTitle id={labelledBy}>{title}</PortedDialogTitle>
        </PortedDialogHeader>
        {children}
        {actions && <div className="cm-dialog-actions">{actions}</div>}
      </PortedDialogContent>
    </PortedDialog>
  )
}
