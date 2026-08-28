import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `skeleton` (get_component "skeleton", 2026-08-28).
// Trivial port: one div, one class (`animate-pulse rounded-md bg-accent` ->
// `pb-skeleton`). No Radix primitive, no state.

export function PortedSkeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={['pb-skeleton', className].filter(Boolean).join(' ')} {...props} />
}
