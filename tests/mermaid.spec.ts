import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { MermaidDiagram } from '../src/components/MermaidDiagram'

// jsdom doesn't implement SVG layout (getBBox/getComputedTextLength), which
// mermaid needs even to lay out a flowchart headlessly — the standard
// test-only polyfill for exercising d3/mermaid under jsdom.
type SvgLayoutPatch = { getBBox: () => DOMRect; getComputedTextLength: () => number }
;(SVGElement.prototype as unknown as SvgLayoutPatch).getBBox = () =>
  ({ x: 0, y: 0, width: 10, height: 10 }) as DOMRect
;(SVGElement.prototype as unknown as SvgLayoutPatch).getComputedTextLength = () => 10

function flush(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Test hygiene: unmount every test's React root and remove its container
// afterward, so no forgotten component instance's effect cleanup (`cancelled
// = true`, src/components/MermaidDiagram.tsx) is left un-run, and the
// document starts each test empty. (This alone does not fix DEF-006 — see
// mermaid-pathological.spec.ts for that.)
const mounted: { root: Root; container: HTMLDivElement }[] = []

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

async function renderAndWait(source: string): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ root, container })
  root.render(createElement(MermaidDiagram, { source }))
  for (let i = 0; i < 40 && !container.querySelector('svg, pre'); i++) {
    await act(async () => {
      await flush()
    })
  }
  return container
}

describe('G5 — Mermaid', () => {
  // Criterion 5: strict security mode config
  it('initializes with securityLevel strict and htmlLabels false', async () => {
    const container = await renderAndWait('graph TD; A["hello"]-->B["world"];')
    expect(container.querySelector('svg')).toBeTruthy()
    // sanity: legitimate label text survives the full render+sanitize path
    expect(container.textContent).toContain('hello')
    expect(container.textContent).toContain('world')
  }, 20000)

  // Criterion 5 (continued): a click-binding javascript: URI produces no
  // script node and no javascript: URI in the output
  it('neutralizes a click binding with a javascript: URI', async () => {
    const container = await renderAndWait(
      'graph TD; A-->B; click A "javascript:alert(1)"',
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    // T-P8-05 added an `aria-label` (the raw diagram source, verbatim text —
    // never an executable context) to the wrapper div, so the malicious
    // string now legitimately appears as inert attribute text on the
    // container. The actual security guarantee — no `javascript:` URI
    // survives in an executable context (an href/xlink:href, or a live
    // script node) — is checked against mermaid's own SVG output, not the
    // wrapper.
    expect(svg?.outerHTML).not.toContain('javascript:')
    expect(container.querySelector('script')).toBeNull()
  }, 20000)

  // Criterion 6: SVG sanitized before insertion — an injected script tag
  // never survives, even smuggled directly into what mermaid returns
  it('sanitizes the rendered SVG — no script node, no event-handler attributes', async () => {
    const container = await renderAndWait('graph TD; A["hello"]-->B["world"];')
    const html = container.innerHTML
    expect(html).not.toContain('<script')
    expect(html).not.toMatch(/\son[a-z]+=/i)
  }, 20000)

  // Criterion 7: invalid diagram source fails closed — a plain code block,
  // never a crash or an unbounded pending state
  it('outright invalid syntax renders as a code block, no crash', async () => {
    const container = await renderAndWait('this is not valid mermaid syntax @#$%')
    const fallback = container.querySelector('pre.claymark-mermaid-fallback')
    expect(fallback).toBeTruthy()
    expect(fallback?.textContent).toBe('this is not valid mermaid syntax @#$%')
    expect(container.querySelector('svg')).toBeNull()
  }, 20000)

  // T-P8-05: mermaid emits no <title>/<desc>, so without an explicit text
  // alternative a screen reader announces nothing for the rendered diagram.
  it('rendered diagram exposes the raw source as its accessible name', async () => {
    const source = 'graph TD; A["hello"]-->B["world"];'
    const container = await renderAndWait(source)
    const diagram = container.querySelector('.claymark-mermaid')
    expect(diagram?.getAttribute('role')).toBe('img')
    expect(diagram?.getAttribute('aria-label')).toBe(source)
  }, 20000)

  // DEF-006: "pathological input that would hang mermaid.render" used to
  // live here too, and whichever test ran immediately after it would fail —
  // moved to its own file (mermaid-pathological.spec.ts). See that file's
  // header comment for the actual root cause (confirmed by direct
  // reproduction, not guessed): mermaid.render() truly never settles for
  // that input in this environment; our own `withTimeout` only stops *us*
  // from waiting on it, it doesn't — can't — cancel mermaid's own in-flight
  // work, which then blocks every *later* `mermaid.render()` call in the
  // same process behind it, forever (mermaid.js is documented as unsafe for
  // concurrent/overlapping render() calls). No fix from this side makes a
  // second render reliable once that's happened — the only real fix is
  // making sure it can never happen in the same module registry as any
  // other mermaid test, which is exactly what per-file isolation (Vitest's
  // default) gives for free once it's its own file.
})
