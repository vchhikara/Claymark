import { FONT_STACKS } from '../fonts'

export const typography = {
  fonts: {
    body: FONT_STACKS.body.stack,
    ui: FONT_STACKS.ui.stack,
    mono: FONT_STACKS.mono.stack,
  },
  body: {
    fontSize: '18px',
    lineHeight: 1.4,
  },
  code: {
    fontSize: '15px',
  },
  codeBlock: {
    fontSize: '12px',
  },
}

export interface HeadingStep {
  fontSize: string
  fontWeight: number
  lineHeight: number
}

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export const headings: Record<HeadingLevel, HeadingStep> = {
  h1: { fontSize: '2.0rem', fontWeight: 600, lineHeight: 1.2 },
  h2: { fontSize: '1.6rem', fontWeight: 600, lineHeight: 1.25 },
  h3: { fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1.0rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4 },
}
