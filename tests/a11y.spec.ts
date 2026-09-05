// T-P8-01: axe-core audit of every component against a reference document
// exercising every element type the component map produces. Renders through
// the real pipeline (processor → toReact with DEFAULT_COMPONENTS), mounts
// into a real DOM, and asserts zero axe violations — not a hand-inspection,
// an actual tool run.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import type { Root } from 'hast'
import axe from 'axe-core'
import { processor } from '../src/pipeline/processor'
import { toReact } from '../src/pipeline/to-react'
import { DEFAULT_COMPONENTS } from '../src/components/map'
import { MarkdownRoot } from '../src/components/MarkdownRoot'

// Every construct the component map (src/components/map.tsx) handles:
// headings 1-6, paragraph, emphasis/strong/del, inline code, link (internal
// + external), unordered/ordered/task lists, blockquote, fenced code block,
// table, image with a title (caption), and a rule. Mermaid/math are
// intentionally out of scope here — MermaidDiagram/KaTeX render
// asynchronously via jsdom SVG polyfills already exercised in their own
// spec files (tests/mermaid.spec.ts, tests/math.spec.ts); this reference
// document is the static, synchronous component surface T-P8-01 targets.
const REFERENCE_DOC = `
# Heading one

## Heading two

### Heading three

#### Heading four

##### Heading five

###### Heading six

A paragraph with *emphasis*, **strong**, ~~strikethrough~~, and \`inline code\`.
It also links to [an internal section](#heading-one) and an
[external site](https://example.com/page).

- an unordered item
- another item
  - nested item

1. an ordered item
2. another ordered item

- [ ] an unchecked task
- [x] a checked task

> A blockquote with some text.

\`\`\`js
const x = 1;
\`\`\`

| Column A | Column B |
| --- | --- |
| one | two |
| three | four |

![alt text](https://example.com/image.png "A visible caption")

---

Final paragraph after the rule.
`

async function renderReferenceDoc(): Promise<HTMLDivElement> {
  const tree = processor.runSync(processor.parse(REFERENCE_DOC) as Root) as Root
  const content = toReact(tree, { components: DEFAULT_COMPONENTS as never })
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(MarkdownRoot, { theme: 'light', children: content }))
  })
  return container
}

describe('G8 — Accessibility (T-P8-01)', () => {
  it('reference document produces zero axe-core violations', async () => {
    const container = await renderReferenceDoc()
    const results = await axe.run(container, {
      // Landmark/page-level rules (e.g. "page must have one main landmark")
      // are about the *host* document's shell, not a component library's
      // rendered fragment — Claymark ships components, not pages, so those
      // rules are excluded; every content/structure/ARIA rule stays enabled.
      rules: {
        'region': { enabled: false },
        'landmark-one-main': { enabled: false },
        'page-has-heading-one': { enabled: false },
      },
    })
    if (results.violations.length > 0) {
      const detail = results.violations
        .map((v) => `${v.id} (${v.impact}): ${v.help}\n  nodes: ${v.nodes.map((n) => n.html).join(' | ')}`)
        .join('\n')
      throw new Error(`axe-core violations:\n${detail}`)
    }
    expect(results.violations).toEqual([])
  })
})
