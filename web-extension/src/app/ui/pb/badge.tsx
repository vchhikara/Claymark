import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `badge`. No Radix primitive — data-variant + pb.css.

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
