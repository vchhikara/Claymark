import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

// Ported from shadcn/ui's `tooltip` (get_component "tooltip", 2026-08-28).
// Real Radix primitives kept (Provider/Root/Trigger/Portal/Content/Arrow —
// hover delay, ESC-dismiss, positioning). Tailwind's animate-in/data-[side]
// slide classes dropped (no entrance animation in this prototype — Claymark
// has no other animated UI to match). bg-foreground/text-background (an
// inverted-surface look) mapped to --text-primary/--surface, which is the
// closest existing "inverted" pairing in tokens.css.

export function PortedTooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

export function PortedTooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

export function PortedTooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

export function PortedTooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={['pb-tooltip', className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="pb-tooltip-arrow" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
