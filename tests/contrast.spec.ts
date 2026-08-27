// T-P8-02: verify WCAG 2.x contrast ratios for every token pair Claymark's
// CSS actually pairs a text color against a background color, in both
// themes — driven from the real semantic-token source of truth
// (src/theme/tokens/{semantic,dark}.ts + neutral.ts/accent.ts), not
// hand-copied numbers, so a future token change is re-verified automatically.
import { describe, expect, it } from 'vitest'
import { neutral } from '../src/theme/tokens/neutral'
import { clay400, clay500, clay600, clay700 } from '../src/theme/tokens/accent'
import { SEMANTIC_LIGHT } from '../src/theme/tokens/semantic'
import { SEMANTIC_DARK } from '../src/theme/tokens/dark'
import type { SemanticToken } from '../src/theme/tokens/semantic'

// `neutral` keys are HSL triples ("H S% L%"); clay tokens are hex. Every
// semantic token resolves to one or the other.
const RAW: Record<string, string> = {
  ...Object.fromEntries(Object.entries(neutral).map(([k, v]) => [`neutral-${k}`, v])),
  'clay-400': clay400,
  'clay-500': clay500,
  'clay-600': clay600,
  'clay-700': clay700,
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`not a hex color: ${hex}`)
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)]
}

function hslToRgb(hsl: string): [number, number, number] {
  const m = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(hsl)
  if (!m) throw new Error(`not an "H S% L%" triple: ${hsl}`)
  const h = Number(m[1]) / 360
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ]
}

function resolveRgb(tokenValue: string): [number, number, number] {
  const raw = RAW[tokenValue]
  if (raw === undefined) throw new Error(`unknown token: ${tokenValue}`)
  return raw.startsWith('#') ? hexToRgb(raw) : hslToRgb(raw)
}

// WCAG 2.x relative luminance / contrast ratio — https://www.w3.org/TR/WCAG21/#contrast-minimum
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const chan = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const [rl, gl, bl] = [chan(r), chan(g), chan(b)]
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

// Every text-color-token / background-color-token pair the CSS actually
// renders (src/theme/claymark.css): body text, blockquote text, figcaption,
// links (default + hover), and inline/block code text (color: text-primary
// inherited, background: surface-code).
const PAIRS: { name: string; fg: SemanticToken; bg: SemanticToken; large?: boolean }[] = [
  { name: 'body text', fg: 'text-primary', bg: 'surface' },
  { name: 'blockquote text', fg: 'text-secondary', bg: 'surface' },
  { name: 'figcaption', fg: 'text-muted', bg: 'surface' },
  { name: 'link (default)', fg: 'link', bg: 'surface' },
  { name: 'link (hover) / accent', fg: 'accent-brand', bg: 'surface' },
  { name: 'inline/block code text', fg: 'text-primary', bg: 'surface-code' },
]

describe.each([
  ['light', SEMANTIC_LIGHT],
  ['dark', SEMANTIC_DARK],
] as const)('G8 — contrast ratios, %s theme (T-P8-02)', (_themeName, semantic) => {
  it.each(PAIRS)('$name meets its WCAG AA threshold', ({ fg, bg, large }) => {
    const ratio = contrastRatio(resolveRgb(semantic[fg]), resolveRgb(semantic[bg]))
    const threshold = large ? 3 : 4.5
    expect(ratio).toBeGreaterThanOrEqual(threshold)
  })
})
