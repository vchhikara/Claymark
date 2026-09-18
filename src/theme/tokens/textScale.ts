// android-to-desktop-checklist.md §5/§6 — the four discrete reading-surface
// text-size steps (Settings screen's +/- stepper, not a slider). Applies
// only to body/heading font-size (see --text-scale usage in tokens.css) —
// chrome/button/UI text never scales with it.
export const TEXT_SCALE_STEPS = [0.875, 1.0, 1.15, 1.3] as const
export type TextScaleStep = (typeof TEXT_SCALE_STEPS)[number]

export const TEXT_SCALE_LABELS: Record<TextScaleStep, string> = {
  0.875: 'Small',
  1.0: 'Default',
  1.15: 'Large',
  1.3: 'Extra large',
}

export const DEFAULT_TEXT_SCALE: TextScaleStep = 1.0
