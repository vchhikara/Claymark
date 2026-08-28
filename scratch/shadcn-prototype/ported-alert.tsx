import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `alert` (get_component "alert", 2026-08-28).
// No Radix primitive — pure markup + role="alert". cva()'s two variants
// (default/destructive) replaced with data-variant + pb-alert-* rules.

export type AlertVariant = 'default' | 'destructive'

export interface PortedAlertProps extends ComponentProps<'div'> {
  variant?: AlertVariant
}

export function PortedAlert({ variant = 'default', className, ...props }: PortedAlertProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={['pb-alert', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function PortedAlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={['pb-alert-title', className].filter(Boolean).join(' ')} {...props} />
}

export function PortedAlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={['pb-alert-description', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
