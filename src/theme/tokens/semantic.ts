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
  link: 'clay-600',
  'quote-rule': 'neutral-500',
  'accent-brand': 'clay-500',
}
