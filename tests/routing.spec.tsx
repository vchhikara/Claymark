// Phase 3.1 (android-to-desktop-checklist.md §1/§4): lightweight view-state
// routing — 6 fixed destinations, no router library (matches this repo's
// "no framework beyond what's needed" pattern). Back/Escape from a
// sub-screen returns to reader.
import { describe, expect, it } from 'vitest'
import { createInitialRoute, routeReducer } from '../src/app/routing'

describe('routing state machine', () => {
  it('starts at welcome', () => {
    expect(createInitialRoute()).toBe('welcome')
  })

  it('navigates to any of the 6 destinations', () => {
    for (const dest of ['welcome', 'reader', 'settings', 'help', 'about', 'privacy'] as const) {
      expect(routeReducer('reader', { type: 'NAVIGATE', to: dest })).toBe(dest)
    }
  })

  it('BACK from any sub-screen returns to reader', () => {
    for (const sub of ['settings', 'help', 'about', 'privacy'] as const) {
      expect(routeReducer(sub, { type: 'BACK' })).toBe('reader')
    }
  })

  it('BACK from welcome or reader is a no-op (nothing to go back to)', () => {
    expect(routeReducer('welcome', { type: 'BACK' })).toBe('welcome')
    expect(routeReducer('reader', { type: 'BACK' })).toBe('reader')
  })
})
