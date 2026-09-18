import type { ComponentProps } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import './dialog.css'

// Promoted from scratch/shadcn-prototype/ported-dialog.tsx (Phase 4.1) —
// Radix primitives kept as-is (focus trap, ESC-close, portal, ARIA); only
// the styling layer is Claymark's own tokens. The portal target is a real
// platform-level modal regardless of in-page layout width (checklist §5's
// abandon-draft-dialog safety requirement).

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className="pb-dialog-overlay" {...props} />
}

export function DialogContent({
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content data-slot="dialog-content" className="pb-dialog-content" {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" className="pb-dialog-close" aria-label="Close">
            <span aria-hidden="true">×</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader(props: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className="pb-dialog-header" {...props} />
}

export function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className="pb-dialog-title" {...props} />
}

export function DialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className="pb-dialog-description" {...props} />
}
