import type { ComponentProps } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'

// Ported from shadcn/ui's `dialog` (get_component "dialog", 2026-08-27).
// Radix's actual Root/Trigger/Portal/Overlay/Content/Close primitives are
// kept as-is — that's the part worth reusing: focus trap, ESC-to-close,
// portal rendering, aria-modal/aria-labelledby wiring, click-outside-closes.
// Only the styling layer changes: shadcn's Tailwind classes
// ("fixed inset-0 z-50 bg-black/50 …") are replaced with claymark-token-based
// classes in prototype.css, deliberately modeled on the existing hand-rolled
// `.claymark-lightbox-backdrop` / `.claymark-lightbox` (claymark.css) so this
// stays consistent with how Claymark already does an overlay + panel.

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
            {/* Plain glyph, not lucide-react — avoids adding an icon-library dep for the prototype */}
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
