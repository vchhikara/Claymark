import { describe, expect, it } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import { toHtml } from 'hast-util-to-html'
import type { Root } from 'hast'
import { math, mathHighlight } from '../src/pipeline/plugins/math'
import { sanitizeSchema } from '../src/pipeline/sanitize-schema'
import { processor } from '../src/pipeline/processor'
import { hydrateMathHighlighting } from '../src/pipeline/plugins/math-lazy'
import { hydrateCodeHighlighting } from '../src/pipeline/plugins/code-lazy'

async function renderRaw(markdown: string): Promise<Root> {
  return (await unified()
    .use(remarkParse)
    .use(math)
    .use(remarkRehype)
    .use(mathHighlight)
    .run(unified().use(remarkParse).use(math).parse(markdown))) as Root
}

async function renderSanitized(markdown: string): Promise<string> {
  const tree = (await unified()
    .use(remarkParse)
    .use(math)
    .use(remarkRehype)
    .use(mathHighlight)
    .use(rehypeSanitize, sanitizeSchema)
    .run(unified().use(remarkParse).use(math).parse(markdown))) as Root
  return toHtml(tree)
}

describe('G5 — Math', () => {
  // Criterion 1: inline + display math both render correctly, as distinct node types
  it('parses $…$ and $$…$$ to distinct mdast node types', () => {
    const tree = unified()
      .use(remarkParse)
      .use(math)
      .parse('Inline $x^2$ and:\n\n$$\ny = mx + b\n$$\n')
    const types = new Set<string>()
    ;(function walk(n: unknown): void {
      const node = n as { type: string; children?: unknown[] }
      types.add(node.type)
      for (const c of node.children ?? []) walk(c)
    })(tree)
    expect(types.has('inlineMath')).toBe(true)
    expect(types.has('math')).toBe(true)
  })

  it('renders inline and display math to KaTeX output', async () => {
    const tree = await renderRaw('Inline $x^2 + y^2 = z^2$ text.\n\n$$\n\\sum_{i=0}^n i\n$$\n')
    const html = toHtml(tree)
    expect(html).toContain('class="katex"')
    expect(html).toContain('katex-display') // block math gets the display wrapper
  })

  // Criterion 2: malformed TeX fails closed — error text, never throws
  it('malformed TeX renders katex-error text instead of throwing', async () => {
    await expect(renderRaw('$\\frac{$')).resolves.toBeTruthy() // must not reject/throw
    const tree = await renderRaw('$\\frac{$')
    const html = toHtml(tree)
    expect(html).toContain('katex-error')
  })

  // Criterion 3: security not regressed — full corpus survives the extended
  // sanitize schema byte-identically, and the XSS-relevant `\href` vector
  // (gated by KaTeX's own `trust: false` default, reinforced by the schema
  // omitting `href` entirely) never reaches the output.
  it('extended sanitize schema preserves math output across a broad LaTeX corpus', async () => {
    const exprs = [
      '\\frac{1}{2}', '\\sqrt{x}', '\\sqrt[3]{x}', 'x_i^2', 'x^{2}_{i}',
      '\\sum_{i=0}^n i', '\\int_0^1 f(x)\\,dx',
      '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
      '\\begin{cases} a & b \\\\ c & d \\end{cases}',
      '\\hat{x} \\vec{y} \\bar{w}',
      '\\overline{x+y} \\underline{x+y}',
      '\\overbrace{x+y}^{n} \\underbrace{x+y}_{n}',
      '\\left( x \\right) \\left[ y \\right]',
      '\\textcolor{red}{x} \\color{blue}{y}',
      '\\mathbb{R} \\mathcal{L} \\mathfrak{g} \\mathbf{v}',
      '\\text{hello world} \\textbf{bold}',
      '\\boxed{x=1}',
      '\\cancel{x}',
      '\\phantom{x}',
      '\\rightarrow \\Rightarrow \\to',
      '\\binom{n}{k}',
      '\\overset{a}{b} \\underset{c}{d}',
      '\\enclose{circle}{x}',
    ]
    for (const expr of exprs) {
      const md = `$$${expr}$$`
      const before = toHtml(await renderRaw(md))
      const after = await renderSanitized(md)
      expect(after).toBe(before)
    }
  })

  it('never emits an href attribute even when \\href is used', async () => {
    const html = await renderSanitized('$\\href{javascript:alert(1)}{click}$')
    expect(html).not.toContain('href=')
  })

  it('does not regress the existing security suite scope (no raw html, no script)', async () => {
    const html = await renderSanitized('$x$ <script>alert(1)</script>')
    expect(html).not.toContain('<script')
  })

  // DEF-003: the tests above only exercise math.ts's own standalone
  // pipeline. Until this batch, `src/pipeline/processor.ts` (what
  // MarkdownRoot/useStreamingMarkdown actually use) never called `math` or
  // `mathHighlight` at all — `$…$`/`$$…$$` passed straight through as
  // literal text, silently, with no error. These prove the real production
  // pipeline, not just the plugin in isolation.
  describe('wired into the real processor + lazy hydration (DEF-003)', () => {
    it('the synchronous processor marks math pending, not rendered', () => {
      const tree = processor.runSync(processor.parse('Inline $x^2$ math.')) as Root
      const html = toHtml(tree)
      expect(html).toContain('data-math-pending')
      expect(html).not.toContain('katex')
    })

    it('hydrateMathHighlighting renders inline and block math from a processor tree', async () => {
      const inline = processor.runSync(processor.parse('Inline $x^2$ math.')) as Root
      await hydrateMathHighlighting(inline)
      expect(toHtml(inline)).toContain('class="katex"')

      const block = processor.runSync(processor.parse('$$\n\\frac{1}{2}\n$$')) as Root
      await hydrateMathHighlighting(block)
      expect(toHtml(block)).toContain('katex-display')
    })

    it('never lets codeSkeleton mark a math block data-code-pending', () => {
      const tree = processor.runSync(processor.parse('$$\na+b\n$$')) as Root
      expect(toHtml(tree)).not.toContain('data-code-pending')
    })

    it('a math block and a code block in the same document hydrate independently, with no cross-contamination', async () => {
      const tree = processor.runSync(
        processor.parse('$$\na+b\n$$\n\n```js\nconst x = 1\n```'),
      ) as Root
      await Promise.all([hydrateMathHighlighting(tree), hydrateCodeHighlighting(tree)])
      const html = toHtml(tree)
      expect(html).toContain('katex-display') // math rendered
      expect(html).not.toContain('language-math') // rehype-katex consumed it, Shiki never touched it
      expect(html).not.toContain('data-code-pending')
      expect(html).not.toContain('data-math-pending')
    })
  })
})
