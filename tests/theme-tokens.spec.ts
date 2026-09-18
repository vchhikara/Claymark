// Phase 1 (android-to-desktop-checklist.md §6) — token-source-of-truth checks
// for items the checklist flagged as diverging from the Android reference:
// quote-rule literal hex, --danger definition, and the AMOLED surface
// override. Mirrors tests/contrast.spec.ts's pattern of testing the TS
// token source of truth rather than parsing rendered CSS.
import { describe, expect, it } from 'vitest'
import { SEMANTIC_LIGHT } from '../src/theme/tokens/semantic'
import { SEMANTIC_DARK } from '../src/theme/tokens/dark'
import { neutral } from '../src/theme/tokens/neutral'

describe('quote-rule (checklist §6: literal hex, not a neutral-ramp step)', () => {
  it('light theme quote-rule resolves to the #0550AE-equivalent HSL triple', () => {
    // #0550AE -> hsl(213.4 94.4% 35.1%)
    expect(SEMANTIC_LIGHT['quote-rule']).toBe('213.4 94.4% 35.1%')
  })

  it('dark theme quote-rule resolves to the #6CB6FF-equivalent HSL triple', () => {
    // #6CB6FF -> hsl(209.8 100.0% 71.2%)
    expect(SEMANTIC_DARK['quote-rule']).toBe('209.8 100.0% 71.2%')
  })

  it('quote-rule tokens are no longer aliased to the neutral ramp', () => {
    expect(SEMANTIC_LIGHT['quote-rule']).not.toBe(neutral[500])
    expect(SEMANTIC_DARK['quote-rule']).not.toBe(neutral[700])
  })
})

describe('AMOLED surface override (checklist §6)', () => {
  it('AMOLED is dark theme with only surface forced to pure black', async () => {
    const { AMOLED_OVERRIDE } = await import('../src/theme/tokens/amoled')
    expect(AMOLED_OVERRIDE.surface).toBe('0 0% 0%')
    // surfaceRaised/surfaceCode deliberately NOT re-derived - must be absent
    // from the override so they fall through to SEMANTIC_DARK's values.
    expect(AMOLED_OVERRIDE).not.toHaveProperty('surface-raised')
    expect(AMOLED_OVERRIDE).not.toHaveProperty('surface-code')
  })
})

describe('text-size stepper (checklist §5/§6)', () => {
  it('exposes exactly the four Android step multipliers', async () => {
    const { TEXT_SCALE_STEPS } = await import('../src/theme/tokens/textScale')
    expect(TEXT_SCALE_STEPS).toEqual([0.875, 1.0, 1.15, 1.3])
  })
})
