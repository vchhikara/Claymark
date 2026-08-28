import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `scroll-area` (get_component "scroll-area",
// 2026-08-28). Real Radix primitives kept (Root/Viewport/Scrollbar/Thumb/
// Corner — custom cross-browser scrollbar rendering). Noted in the plan's
// scope as "mostly redundant" with Claymark's existing
// `.claymark-table-scroll` (which uses native overflow + CSS scroll-shadow
// pseudo-elements, not a custom scrollbar) — kept as a distinct component
// here since the two solve different problems: table-scroll gives directional
// shadow hints for native scroll, ScrollArea replaces the OS scrollbar
// entirely. Not proposed as a table-scroll replacement.

export function PortedScrollArea({
  className,
  children,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={['pb-scroll-area', className].filter(Boolean).join(' ')} {...props}>
      <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className="pb-scroll-area-viewport">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <PortedScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export function PortedScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={['pb-scroll-area-scrollbar', `pb-scroll-area-scrollbar--${orientation}`, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="pb-scroll-area-thumb" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}
