import type { SemanticToken } from './semantic'

export const SEMANTIC_DARK: Record<SemanticToken, string> = {
  surface: 'neutral-1200',
  'surface-raised': 'neutral-1100',
  'surface-code': 'neutral-1100',
  'text-primary': 'neutral-200',
  'text-secondary': 'neutral-400',
  'text-muted': 'neutral-600',
  'border-subtle': 'neutral-800',
  'border-default': 'neutral-700',
  link: 'clay-400',
  // android-to-desktop-checklist.md §6: literal hex #6CB6FF (dark "number"
  // token), not a neutral-ramp step.
  'quote-rule': '209.8 100.0% 71.2%',
  'accent-brand': 'clay-500',
  danger: '0 70% 50%',
}
