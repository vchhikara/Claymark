import * as SeparatorPrimitive from '@radix-ui/react-separator'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `separator`. Real Radix primitive kept.
// Distinct from a markdown <hr> in rendered content — this is UI chrome.

export function PortedSeparator({ className, orientation = 'horizontal', decorative = true, ...props }: ComponentProps<typeof SeparatorPrimitive.Root>) {
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
