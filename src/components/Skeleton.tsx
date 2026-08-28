import type { ComponentProps } from 'react'

// Adapted from scratch/shadcn-prototype/ported-skeleton.tsx (validated, see
// FINDINGS.md). One div, one class, one pulse animation.

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" className={['claymark-skeleton', className].filter(Boolean).join(' ')} {...props} />
  )
}
