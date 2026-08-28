import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `badge` (get_component "badge", 2026-08-28).
// No Radix primitive involved — cva()'s variant map replaced with
// data-variant + pb-badge-* rules in prototype.css. Dropped the `asChild`
// prop: shadcn's Badge can render as a Slot-wrapped <a>, but nothing in this
// prototype needs a link-styled-as-badge case, so it's plain <span> only.

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface PortedBadgeProps extends ComponentProps<'span'> {
  variant?: BadgeVariant
}

export function PortedBadge({ variant = 'default', className, ...props }: PortedBadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={['pb-badge', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
