export interface FontStack {
  stack: string
  substitute: string
  license: string
}

export const FONT_STACKS: Record<'body' | 'ui' | 'mono', FontStack> = {
  body: {
    stack: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    substitute: 'Source Serif 4',
    license: 'SIL OFL 1.1',
  },
  ui: {
    stack: 'Inter, -apple-system, "Segoe UI", sans-serif',
    substitute: 'Inter',
    license: 'SIL OFL 1.1',
  },
  mono: {
    stack: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
    substitute: 'JetBrains Mono',
    license: 'SIL OFL 1.1',
  },
}
