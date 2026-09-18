import { forwardRef } from 'react'
import type { ComponentProps } from 'react'
import './button.css'

// Promoted from scratch/shadcn-prototype/ported-button.tsx (Phase 3.3) —
// validated API/focus-restoration behavior, now the real component.

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', className, ...props },
  ref
) {
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
})
