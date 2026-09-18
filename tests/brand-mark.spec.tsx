// Phase 1.7 (android-to-desktop-checklist.md §6 "Brand mark / logo").
// No canonical brand SVG exists in this repo yet (LOGO-STRATEGY.md is
// exploratory prompt-engineering for generating one, not a finished asset,
// and #DD8562 doesn't appear anywhere in it) — this implements the
// checklist's literal values verbatim; a future pass should re-verify
// against a real canonical SVG once one exists.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { BrandMark } from '../src/app/BrandMark'

describe('BrandMark (checklist §6)', () => {
  it('renders a gradient tile from #DD8562 to #C8542D and a cream cutout at #FAF9F5', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(BrandMark, { size: 26 }))
    })

    const html = container.innerHTML
    expect(html).toContain('#DD8562')
    expect(html).toContain('#C8542D')
    expect(html).toContain('#FAF9F5')

    act(() => root.unmount())
    container.remove()
  })

  it('renders the live-text wordmark "claymark" with -0.0125em letter-spacing', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(BrandMark, { size: 26, showWordmark: true }))
    })

    const wordmark = container.querySelector('[data-testid="brand-wordmark"]')
    expect(wordmark).not.toBeNull()
    expect(wordmark?.textContent).toBe('claymark')
    expect((wordmark as HTMLElement).style.letterSpacing).toBe('-0.0125em')

    act(() => root.unmount())
    container.remove()
  })
})
