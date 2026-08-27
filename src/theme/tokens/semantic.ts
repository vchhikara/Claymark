export type SemanticToken =
  | 'surface'
  | 'surface-raised'
  | 'surface-code'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'border-subtle'
  | 'border-default'
  | 'link'
  | 'quote-rule'
  | 'accent-brand'

export const SEMANTIC_LIGHT: Record<SemanticToken, string> = {
  surface: 'neutral-100',
  'surface-raised': 'neutral-200',
  'surface-code': 'neutral-200',
  'text-primary': 'neutral-1000',
  'text-secondary': 'neutral-900',
  'text-muted': 'neutral-800',
  'border-subtle': 'neutral-400',
  'border-default': 'neutral-500',
  // T-P8-02: clay-600/clay-500 both fail 4.5:1 as text against this
  // theme's surface — see clay700's comment in tokens/accent.ts.
  link: 'clay-700',
  'quote-rule': 'neutral-500',
  'accent-brand': 'clay-700',
}
