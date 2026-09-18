import { forwardRef } from 'react'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `button` (scratch/shadcn-prototype/ported-button.tsx
// in the main repo — see that folder's FINDINGS.md for the porting recipe).
// Variant/size selection kept as data-attributes; styling lives in
// pb.css against the shared tokens.css custom properties, no Tailwind/cva.

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface PortedButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// forwardRef is required: Radix's asChild/Slot pattern (DialogTrigger/
// DialogClose) needs a ref to the real DOM button to return focus to it
// after a dialog closes.
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
