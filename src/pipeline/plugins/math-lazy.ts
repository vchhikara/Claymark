import type { Root, Element } from 'hast'
import type { Plugin, PluggableList } from 'unified'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

// DEF-003 / docs/ARCHITECTURE.md §6: KaTeX (~120 KB gz) must not be in the
// initial chunk, mirroring code-lazy.ts's boundary for Shiki. `./math` (and
// rehype-katex, katex itself) is reached exclusively through the dynamic
// `import()` below — nothing above this comment imports `./math`.
async function loadMathHighlight(): Promise<PluggableList> {
  const { mathHighlight } = await import('./math')
  return mathHighlight
}

function isMathLanguageClass(name: unknown): boolean {
  return typeof name === 'string' && name === 'language-math'
}

// processor.ts's `math` (remark-math) + `remarkRehype` already turn `$…$`/
// `$$…$$` into `<code class="language-math math-inline">` / `<pre><code
// class="language-math math-display">` elements — remark-math's own
// documented hast conversion, no custom handlers needed (see its readme's
// "HTML" section). Marks each one pending so useStreamingMarkdown knows to
// call `hydrateMathHighlighting`. Deliberately never touched by codeSkeleton
// (code-lazy.ts excludes `language-math` from its own detection) so Shiki's
// unknownLanguageFallback (code.ts) never strips the `language-math` class
// this file depends on to find these nodes later.
export const mathSkeleton: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'code') return
    const className = node.properties?.className
    if (!Array.isArray(className) || !className.some(isMathLanguageClass)) return
    node.properties = { ...node.properties, 'data-math-pending': '' }
  })
}

// Runs the real highlighter (dynamically imported) against a tree already
// containing `mathSkeleton` placeholders. rehype-katex replaces each
// `code.language-math` element outright with its own `<span class="katex">`
// (inline) or `<span class="katex-display">…</span>` (block) output, so the
// `data-math-pending` marker disappears along with the node it was on —
// nothing left to explicitly clean up, exactly like hydrateCodeHighlighting.
export async function hydrateMathHighlighting(tree: Root): Promise<Root> {
  const plugins = await loadMathHighlight()
  const processor = unified().use({ plugins })
  const result = await processor.run(tree)
  return result as Root
}
