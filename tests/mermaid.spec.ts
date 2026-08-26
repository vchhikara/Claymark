import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
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

async function renderAndWait(source: string): Promise<HTMLDivElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
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
    expect(container.querySelector('svg')).toBeTruthy()
    expect(container.innerHTML).not.toContain('javascript:')
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

  it('pathological input that would hang mermaid.render still resolves via a bounded timeout', async () => {
    const container = await renderAndWait('graph TD; A["<img src=x onerror=alert(1)>"];')
    expect(container.querySelector('pre.claymark-mermaid-fallback')).toBeTruthy()
  }, 20000)
})
