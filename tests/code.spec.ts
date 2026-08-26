import { describe, expect, it, vi, afterEach } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { toHtml } from 'hast-util-to-html'
import type { Root } from 'hast'
import { codeHighlight } from '../src/pipeline/plugins/code'
import { SUPPORTED_LANGUAGES, getShikiHighlighter } from '../src/pipeline/plugins/shiki-config'
import { codeSkeleton, hydrateCodeHighlighting } from '../src/pipeline/plugins/code-lazy'
import { CodeBlock } from '../src/components/CodeBlock'
import { CopyButton } from '../src/components/CopyButton'

async function highlight(markdown: string): Promise<string> {
  const tree = (await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(codeHighlight)
    .run(unified().use(remarkParse).parse(markdown))) as Root
  return toHtml(tree)
}

function fence(lang: string, meta = ''): string {
  return ['```' + lang + (meta ? ' ' + meta : ''), 'const x = 1;', 'const y = 2;', '```'].join('\n')
}

describe('G4 — Code Blocks', () => {
  // Criterion 1: highlight determinism
  it('produces identical token output across 3 runs on the same input', async () => {
    const md = fence('typescript')
    const [a, b, c] = await Promise.all([highlight(md), highlight(md), highlight(md)])
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toContain('--shiki-light')
  })

  // Criterion 2: language coverage — every registry language renders (no throw, gets Shiki spans)
  it('renders every registry language', async () => {
    const highlighter = await getShikiHighlighter()
    const loaded = new Set(highlighter.getLoadedLanguages())
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(loaded.has(lang)).toBe(true)
      const html = await highlight(fence(lang))
      expect(html).toContain('--shiki-light')
      expect(html).not.toContain(`language-${lang}`) // rehype-pretty-code strips the raw class once highlighted
    }
  })

  // Criterion 3: unknown language falls back to plain, unstyled pre — never throws
  it('renders an unrecognized fence tag as plain pre without throwing', async () => {
    const html = await highlight(fence('notalanguage'))
    expect(html).toBe('<pre><code class="">const x = 1;\nconst y = 2;\n</code></pre>')
    expect(html).not.toContain('--shiki')
    expect(html).not.toContain('data-theme')
  })

  // Criterion 6: line highlighting — meta {1,3-5} highlights exactly lines 1,3,4,5
  it('highlights exactly the lines named in fence meta {1,3-5}', async () => {
    const md = [
      '```typescript {1,3-5}',
      'const a = 1;',
      'const b = 2;',
      'const c = 3;',
      'const d = 4;',
      'const e = 5;',
      'const f = 6;',
      '```',
    ].join('\n')
    const html = await highlight(md)
    const lineSpans = [...html.matchAll(/<span data-line(="")?([^>]*)>/g)]
    expect(lineSpans).toHaveLength(6)
    const highlightedIndices = lineSpans
      .map((m, i) => (m[0].includes('data-highlighted-line') ? i + 1 : null))
      .filter((n): n is number => n !== null)
    expect(highlightedIndices).toEqual([1, 3, 4, 5])
  })

  // Criterion 7 / T-P4-08: bundle boundary — the skeleton pass never touches Shiki,
  // and reserves final height; the dynamic-import boundary itself is verified at
  // build time (see plan/04-STATE-LEDGER.md CP-013 for the bundler evidence).
  it('renders a stable-height skeleton with no Shiki output before hydration', async () => {
    const tree = (await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .run(unified().use(remarkParse).parse(fence('python')))) as Root
    await unified().use(codeSkeleton).run(tree)
    const html = toHtml(tree)
    expect(html).toContain('data-code-pending')
    expect(html).toContain('min-height:calc(var(--text-code) * 1.5 * 2)')
    expect(html).not.toContain('--shiki')
  })

  it('hydrateCodeHighlighting produces output identical to the direct pipeline', async () => {
    const md = fence('python')
    const parsed = unified().use(remarkParse).parse(md)
    const skeletonTree = (await unified().use(remarkRehype).run(parsed)) as Root
    const hydrated = await hydrateCodeHighlighting(skeletonTree)

    const directTree = (await unified().use(remarkRehype).run(unified().use(remarkParse).parse(md))) as Root
    await unified().use(codeHighlight).run(directTree)

    expect(toHtml(hydrated)).toBe(toHtml(directTree))
  })

  // T-P4-04: CodeBlock shell displays the fence's language string
  it('CodeBlock header displays the language string', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(CodeBlock, { language: 'rust', children: 'body' }))
    })
    expect(container.querySelector('.claymark-codeblock-lang')?.textContent).toBe('rust')
    container.remove()
  })
})

describe('G4 — Copy button', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  // Criterion 4: copy fidelity — clipboard content is byte-identical to source
  it('writes exact source text via navigator.clipboard, excluding any gutter markup', async () => {
    const source = 'const x = 1;\nconsole.log(x);\n'
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(CopyButton, { text: source }))
    })
    const button = container.querySelector('button')!
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith(source)
    expect(button.textContent).toBe('Copied')
    // @ts-expect-error test cleanup
    delete navigator.clipboard
  })

  // Criterion 5: copy fallback — succeeds when navigator.clipboard is undefined
  it('falls back to execCommand when navigator.clipboard is undefined', async () => {
    // @ts-expect-error simulate an insecure context
    delete navigator.clipboard
    const source = 'const x = 1;\nconsole.log(x);\n'
    let capturedValue = ''
    const execCommand = vi.fn((cmd: string) => {
      if (cmd === 'copy') {
        const active = document.activeElement as HTMLTextAreaElement | null
        capturedValue = active?.value ?? ''
        return true
      }
      return false
    })
    document.execCommand = execCommand as unknown as typeof document.execCommand

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(createElement(CopyButton, { text: source }))
    })
    const button = container.querySelector('button')!
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(capturedValue).toBe(source)
    expect(button.textContent).toBe('Copied')
  })
})
