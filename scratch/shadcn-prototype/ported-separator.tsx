import { Separator as SeparatorPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `separator` (get_component "separator", 2026-08-28).
// Real Radix primitive kept (handles the decorative/aria-orientation
// semantics). Tailwind's h-px/w-px + bg-border replaced with pb-separator,
// styled from --border-subtle. Distinct from Claymark's existing Rule.tsx:
// that renders a markdown <hr> in prose; this is a UI-chrome divider (e.g.
// between menubar/toolbar sections) and needs no shared class with it.

export function PortedSeparator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={['pb-separator', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
