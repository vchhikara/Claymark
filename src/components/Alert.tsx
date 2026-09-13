import type { ComponentProps } from 'react'

// Adapted from scratch/shadcn-prototype/ported-alert.tsx (validated, see
// FINDINGS.md). No Radix primitive — pure markup + role="alert".

// DEF-001 (knip dead-export audit): not part of the public API, never
// imported outside this file — de-exported.
type AlertVariant = 'default' | 'destructive'

export interface AlertProps extends ComponentProps<'div'> {
  variant?: AlertVariant
}

export function Alert({ variant = 'default', className, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={['claymark-alert', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={['claymark-alert-title', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={['claymark-alert-description', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
