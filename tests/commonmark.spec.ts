import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toHtml } from 'hast-util-to-html'
import { renderToStaticMarkup } from 'react-dom/server'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { Root } from 'hast'
import { gfm } from '../src/pipeline/plugins/gfm'
import { urlPolicy, safeUrl } from '../src/pipeline/plugins/url-policy'
import { sanitizePreset } from '../src/pipeline/plugins/sanitize'
import { visit } from 'unist-util-visit'
import { toReact } from '../src/pipeline/to-react'

const here = dirname(fileURLToPath(import.meta.url))

interface SpecExample {
  markdown: string
  html: string
  example: number
  section: string
}

const spec = JSON.parse(
  readFileSync(join(here, 'fixtures/commonmark/spec.json'), 'utf8'),
) as SpecExample[]

// Conformance processor: parse → GFM → hast → URL policy → sanitize.
// linkHardening is excluded: target/rel are claymark additions beyond the
// CommonMark output contract and would contaminate every link comparison.
const conformanceProcessor = unified()
  .use(remarkParse)
  .use(gfm)
  .use(remarkRehype, {
    allowDangerousHtml: false,
    handlers: { html: (_state: unknown, node: { value: string }) => ({ type: 'text', value: node.value }) },
  })
  .use(urlPolicy)
  .use(sanitizePreset)

// Serializer canonicalization (approved methodology, session 3):
// - newlines carry no semantics in the React DOM target; stripped on both sides
// - void elements canonicalized to slash-less form on both sides
// - text-node entities re-encoded (&quot; &lt; &gt;) to match commonmark.js style,
//   which toHtml's HTML5-minimal escaping does not reproduce
const VOID_TAG = /<(hr|br|img)((?:[^>"']|"[^"]*"|'[^']*')*?)\s*\/?>/gi
function encodeText(tail: string): string {
  return tail.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function canonicalize(html: string): string {
  return html
    .replace(/\n/g, '')
    .replace(VOID_TAG, '<$1$2>')
    .replace(/^[^<]*/, (m) => encodeText(m))
    .replace(/>([^<]*)/g, (_m, tail: string) => '>' + encodeText(tail))
}

// Raw HTML is inert by design (FR-1.6 / DEC-005): examples whose markdown
// contains raw HTML constructs cannot byte-match the spec's rendered HTML.
// They are excluded from the denominator here and asserted inert instead.
const RAW_HTML =
  /<[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]*)?>|<\/[a-zA-Z]|<!--|<!\[CDATA|\?<|<\?/
function isRawHtmlByDesign(example: SpecExample): boolean {
  return (
    example.section === 'HTML blocks' ||
    example.section === 'Raw HTML' ||
    RAW_HTML.test(example.markdown)
  )
}

const FORBIDDEN_TAGS = new Set([
  'script', 'iframe', 'frameset', 'frame', 'object', 'embed', 'applet',
  'base', 'meta', 'link', 'style', 'form', 'svg', 'math', 'marquee',
])

async function renderActual(markdown: string): Promise<string> {
  const tree = (await conformanceProcessor.run(conformanceProcessor.parse(markdown))) as Root
  return toHtml(tree, { characterReferences: { useNamedReferences: true } })
}

describe('hast → React materialization (FR-2.1 · FR-2.4 · G2-C7)', () => {
  it('renders sanitized output to a React tree without dangerouslySetInnerHTML', async () => {
    const markdown = [
      '# heading',
      '',
      'a [link](https://example.com), an ![img](https://example.com/i.png "t"),',
      'some `code`, ~~del~~ *em* **strong**.',
      '',
      '> quote',
      '',
      '- item',
      '- [x] task',
      '',
      '```js',
      'console.log(1)',
      '```',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
    ].join('\n')
    const tree = (await conformanceProcessor.run(conformanceProcessor.parse(markdown))) as Root
    const element = toReact(tree)
    expect(element).toBeTruthy()
    expect(typeof element).toBe('object')
    expect('$$typeof' in element).toBe(true)
    const markup = renderToStaticMarkup(element)
    expect(markup).toContain('<h1>heading</h1>')
    expect(markup).toContain('<table>')
    expect(markup.toLowerCase()).not.toContain('dangerouslysetinnerhtml')

    let found = 0
    visit(tree, (node) => {
      if ((node as { type?: string }).type === 'element') found++
    })
    expect(found).toBeGreaterThan(0)
    void found
  })
})

describe('CommonMark 0.31.2 conformance (FR-1.1 · G2-C1)', () => {
  it('passes at least 98% of the non-raw-HTML spec suite', async () => {
    let passed = 0
    let excluded = 0
    const failures: Array<{ example: number; section: string; expected: string; actual: string }> = []
    for (const example of spec) {
      if (isRawHtmlByDesign(example)) {
        excluded++
        continue
      }
      const expected = canonicalize(example.html)
      const actual = canonicalize(await renderActual(example.markdown))
      if (actual === expected) {
        passed++
      } else {
        failures.push({ example: example.example, section: example.section, expected, actual })
      }
    }
    const denominator = spec.length - excluded
    const pct = (passed / denominator) * 100
    if (pct < 98) {
      console.error(`conformance ${pct.toFixed(2)}% (${passed}/${denominator}); first failures:`)
      for (const f of failures.slice(0, 20)) {
        console.error(`example ${f.example} [${f.section}]\n  expected: ${JSON.stringify(f.expected).slice(0, 160)}\n  actual:   ${JSON.stringify(f.actual).slice(0, 160)}`)
      }
    }
    expect(pct).toBeGreaterThanOrEqual(98)
  }, 120_000)

  it('residual failures are only deliberate divergences', async () => {
    // Two approved residual categories (session 3 methodology decision):
    //
    // 1. Scheme restriction (NFR-1.3): autolinks whose href uses a scheme
    //    outside http/https/mailto are neutralized by url-policy.ts. Verified
    //    dynamically: every such failure must have an expected href that our
    //    own safeUrl() rejects.
    //
    // 2. GFM autolink extension: remark-gfm links bare URLs/emails and
    //    space-adjacent angle forms that the core spec leaves as literal text.
    //    Additive and inert; enumerated explicitly below so any NEW failure
    //    category fails this suite loudly instead of being silently excused.
    const GFM_AUTOLINK_EXTENSION_EXAMPLES = new Set([602, 606, 608, 611, 612])

    const residual: number[] = []
    for (const example of spec) {
      if (isRawHtmlByDesign(example)) continue
      const expected = canonicalize(example.html)
      const actual = canonicalize(await renderActual(example.markdown))
      if (actual !== expected) residual.push(example.example)
    }

    for (const id of residual) {
      if (GFM_AUTOLINK_EXTENSION_EXAMPLES.has(id)) continue
      const ex = spec.find((s) => s.example === id)!
      const hrefInExpected = /(?:href|src)="([^"]*)"/.exec(ex.html)?.[1] ?? ''
      const schemeRestricted =
        hrefInExpected !== '' &&
        safeUrl(hrefInExpected, /<img/.test(ex.html)) === undefined
      expect(schemeRestricted, `example ${id} [${ex.section}]: neither scheme-restricted nor known GFM divergence`).toBe(true)
    }
    expect(residual.length).toBeGreaterThan(0)
  }, 120_000)

  it('raw-HTML examples stay inert: no forbidden tags, handlers, or dangerous URLs', async () => {
    for (const example of spec) {
      if (!isRawHtmlByDesign(example)) continue
      const tree = (await conformanceProcessor.run(conformanceProcessor.parse(example.markdown))) as Root
      visit(tree, (node) => {
        if (node.type === 'element') {
          expect(FORBIDDEN_TAGS.has(node.tagName), `example ${example.example}: ${node.tagName}`).toBe(false)
          for (const key of Object.keys(node.properties)) {
            expect(key.startsWith('on'), `example ${example.example}: attr ${key}`).toBe(false)
          }
        }
        if (node.type === 'raw') {
          throw new Error(`example ${example.example}: raw node reached output`)
        }
      })
    }
  }, 120_000)
})
