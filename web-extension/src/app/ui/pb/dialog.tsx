import type { ComponentProps } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

// Ported from shadcn/ui's `dialog` (scratch/shadcn-prototype/ported-dialog.tsx
// in the main repo). Radix's Root/Trigger/Portal/Content/Close are kept as-is
// (focus trap, ESC-to-close, portal, aria wiring, outside-click); only the
// styling layer is replaced with pb.css against tokens.css.
//
// The overlay is a plain div, NOT `DialogPrimitive.Overlay`: Radix's Overlay
// wraps children in `react-remove-scroll`, which injects a `<style>` tag to
// compensate for the removed scrollbar — that violates this extension's
// `style-src 'self'` CSP (no unsafe-inline) and gets blocked with a console
// error. A plain div still gets Content's outside-click-to-close for free
// (Content's DismissableLayer listens document-wide), it just doesn't lock
// background scroll while the dialog is open.

export const PortedDialog = DialogPrimitive.Root
export const PortedDialogTrigger = DialogPrimitive.Trigger
export const PortedDialogClose = DialogPrimitive.Close

export function PortedDialogOverlay(props: ComponentProps<'div'>) {
  return <div data-slot="dialog-overlay" className="pb-dialog-overlay" {...props} />
}

export function PortedDialogContent({
  children,
  showCloseButton = true,
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <PortedDialogOverlay />
      <DialogPrimitive.Content data-slot="dialog-content" className={['pb-dialog-content', className].filter(Boolean).join(' ')} {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" className="pb-dialog-close" aria-label="Close">
            <X size={16} aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function PortedDialogHeader(props: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className="pb-dialog-header" {...props} />
}

export function PortedDialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className="pb-dialog-title" {...props} />
}

export function PortedDialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className="pb-dialog-description" {...props} />
}
