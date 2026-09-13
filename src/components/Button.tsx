import { forwardRef } from 'react'
import type { ComponentProps } from 'react'

// Adapted from scratch/shadcn-prototype/ported-button.tsx (validated D1/D5,
// see FINDINGS.md) — same API shape (`variant`/`size` via data-attributes),
// styled entirely from src/theme/claymark.css's `.claymark-button` rules
// (tokens.css custom properties), no Tailwind/cva/cn().

// DEF-001 (knip dead-export audit): neither is part of the public API,
// never imported outside this file — de-exported.
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

// forwardRef is required, not stylistic: any future Radix `asChild`/`Slot`
// consumer (e.g. a Dialog trigger) needs a ref to the real DOM <button> to
// restore focus correctly — see FINDINGS.md's documented forwardRef finding.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={['claymark-button', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
})
