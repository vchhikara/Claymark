import { forwardRef } from 'react'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `button` (get_component "button", 2026-08-27).
// Original used cva() + Tailwind utility classes for variant/size — those are
// dropped here. Variant/size selection is kept (same API shape: `variant`,
// `size` props) but expressed as `data-variant`/`data-slot` attributes that
// prototype.css keys off of, styled entirely from Claymark's tokens.css
// custom properties (--surface, --radius-md, --space-*, --accent-brand, …)
// instead of bg-primary/hover:bg-primary/90/etc. No cva, no cn(), no
// Tailwind — proves the API/behavior can be kept while the styling layer is
// fully replaced.

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface PortedButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// forwardRef is required here, not stylistic: Radix's `asChild`/`Slot`
// pattern (used by DialogTrigger/DialogClose in ported-dialog.tsx) needs a
// ref to the real DOM <button> to restore focus to it after the dialog
// closes. A plain function component can't receive that ref — without this,
// focus silently falls back to <body> on Escape-close instead of returning
// to the trigger (found + fixed during D4 validation, see D5 findings).
export const PortedButton = forwardRef<HTMLButtonElement, PortedButtonProps>(
  function PortedButton({ variant = 'default', size = 'default', className, ...props }, ref) {
    return (
      <button
        ref={ref}
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={['pb-button', className].filter(Boolean).join(' ')}
        {...props}
      />
    )
  },
)
