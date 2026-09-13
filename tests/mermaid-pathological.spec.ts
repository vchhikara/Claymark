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

// DEF-006 (plan/04-STATE-LEDGER.md): this test used to live in mermaid.spec.ts,
// where it made whichever test ran immediately after it fail. Root-caused by
// direct reproduction (not guessed): the diagram source below genuinely makes
// `mermaid.render()` hang forever in this environment — confirmed by logging
// what actually rendered for the very next test, which showed *that* test's
// own (otherwise-benign) diagram also timing out with "Mermaid render
// exceeded 5000ms". `MermaidDiagram`'s `withTimeout` (src/components/
// MermaidDiagram.tsx) only stops *this component* from waiting on the
// promise; it can't cancel mermaid's own still-running internal work (JS
// promises aren't cancellable), which — per mermaid.js's own documented
// limitation that concurrent/overlapping render() calls aren't safe —
// permanently blocks every later `mermaid.render()` call in the same
// process behind it. Unmounting the component (tried first) does not help:
// the hang is inside mermaid's own module state, not React's.
//
// There is no fix available from this file or from MermaidDiagram.tsx that
// makes a second render reliable once mermaid has actually wedged itself —
// so instead this test is isolated in its own file. Vitest gives every test
// file its own module registry by default (`test.isolate`, on unless a
// project opts out — this one doesn't, see vitest.config.ts), so a fresh
// `import('mermaid')` here can never poison — or be poisoned by — any other
// test file's mermaid instance. This is a real fix, not a workaround: it
// removes the shared state the ordering dependency needed to exist at all,
// rather than relying on a lucky run order (the pre-existing state before
// this fix) or a fragile "runs right after" adjacency.
describe('G5 — Mermaid (isolated: pathological input)', () => {
  it('pathological input that would hang mermaid.render still resolves via a bounded timeout', async () => {
    const container = await renderAndWait('graph TD; A["<img src=x onerror=alert(1)>"];')
    expect(container.querySelector('pre.claymark-mermaid-fallback')).toBeTruthy()
  }, 20000)
})
