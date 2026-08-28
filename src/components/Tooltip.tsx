import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'

// Adapted from scratch/shadcn-prototype/ported-tooltip.tsx (validated live
// via Claude Browser MCP, see FINDINGS.md). Real Radix primitives kept
// (Provider/Root/Trigger/Portal/Content/Arrow — hover delay, ESC-dismiss,
// positioning). Styled from `.claymark-tooltip*` in claymark.css, which
// reuses --z-lightbox (the only z-index token in tokens.css).

export function TooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

export function TooltipContent({
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
        className={['claymark-tooltip', className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="claymark-tooltip-arrow" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
