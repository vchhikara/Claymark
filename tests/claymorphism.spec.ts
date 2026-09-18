// Phase 1.6 (android-to-desktop-checklist.md §6) — claymorphism system.
// Tests the CSS *source text* directly (jsdom doesn't compute gradient/
// box-shadow values reliably), following this repo's established pattern
// of testing token/CSS source of truth rather than rendered pixels
// (tests/contrast.spec.ts does the same for color tokens).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/theme/claymark.css'), 'utf-8')
const tokens = readFileSync(resolve(__dirname, '../src/theme/tokens.css'), 'utf-8')

describe('claymorphism system exists with the specified elevation/inset tokens', () => {
  it('defines rest/pressed elevation and default ClayInsets', () => {
    expect(tokens).toMatch(/--clay-elevation-rest:\s*6px/)
    expect(tokens).toMatch(/--clay-elevation-pressed:\s*1px/)
    expect(tokens).toMatch(/--clay-inset-h:\s*1\.5px/)
    expect(tokens).toMatch(/--clay-inset-v:\s*1\.5px/)
  })

  it('defines distinct light/dark alpha sets for shadow and rim-light', () => {
    const lightBlock = tokens.slice(0, tokens.indexOf("[data-theme='dark']"))
    const darkBlock = tokens.slice(tokens.indexOf("[data-theme='dark']"))
    expect(lightBlock).toMatch(/--clay-shadow-alpha:\s*0\.16/)
    expect(darkBlock).toMatch(/--clay-shadow-alpha:\s*0\.55/)
    expect(lightBlock).toMatch(/--clay-rim-light-alpha:\s*0\.85/)
    expect(darkBlock).toMatch(/--clay-rim-light-alpha:\s*0\.06/)
    expect(lightBlock).toMatch(/--clay-pot-alpha:\s*0\.1\b/)
    expect(darkBlock).toMatch(/--clay-pot-alpha:\s*0\.3\b/)
  })

  it('defines the three clay treatments: raised, pot, inset', () => {
    expect(css).toMatch(/\.pb-clay-raised\s*{/)
    expect(css).toMatch(/\.pb-clay-raised--pressed/)
    expect(css).toMatch(/\.pb-clay-pot\s*{/)
    expect(css).toMatch(/\.pb-clay-inset\s*{/)
  })
})

describe('scope guard: claymorphism never touches the reading surface', () => {
  const proseSelectors = [
    '.claymark-blockquote',
    '.claymark-h1',
    '.claymark-h2',
    '.claymark-h3',
    '.claymark-pre',
    '.claymark-p',
    '.claymark-li',
    '.claymark-table',
    '.claymark-td',
    '.claymark-th',
  ]

  it.each(proseSelectors)('%s rule block contains no .pb-clay-* class', (selector) => {
    // Find the rule block for this exact selector and confirm it doesn't
    // itself carry a clay class in its own selector list, and that its
    // declaration block (up to the next top-level "}") never references a
    // clay custom property directly (which would mean clay styling leaked
    // into prose rather than staying confined to chrome components).
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const ruleStart = new RegExp(`${escaped}\\s*{`).exec(css)
    expect(ruleStart, `expected to find a rule for ${selector}`).not.toBeNull()
    if (!ruleStart) return
    const blockStart = ruleStart.index + ruleStart[0].length
    const blockEnd = css.indexOf('}', blockStart)
    const block = css.slice(blockStart, blockEnd)
    expect(block).not.toMatch(/--clay-/)
    expect(block).not.toMatch(/pb-clay/)
  })
})
