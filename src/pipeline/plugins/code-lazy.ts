import type { Root, Element, Text } from 'hast'
import type { Plugin, PluggableList } from 'unified'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

// T-P4-08 / docs/ARCHITECTURE.md §6: Shiki (~250 KB gz) must not be in the
// initial chunk. This module is the only import boundary for it — `./code`
// (and everything it pulls in: rehype-pretty-code, shiki-config, shiki
// itself) is reached exclusively through the dynamic `import()` below, so a
// bundler never puts it in a chunk that also contains this file's static
// exports. Nothing above this comment imports `./code`.
async function loadCodeHighlight(): Promise<PluggableList> {
  const { codeHighlight } = await import('./code')
  const { prettifyCode } = await import('./prettify-code')
  // D10: prettify runs before codeHighlight so rehype-pretty-code always
  // tokenizes the canonically-formatted source, not the author's original.
  return [prettifyCode, ...codeHighlight]
}

function countLines(text: string): number {
  const trimmed = text.replace(/\n$/, '')
  return trimmed.length === 0 ? 1 : trimmed.split('\n').length
}

// docs/ARCHITECTURE.md §6: "Unstyled `pre` at final height" — the skeleton
// reserves the exact vertical space the highlighted block will occupy, so
// swapping it in later causes zero cumulative layout shift (NFR-2, CLS = 0).
// `1.5` is the standard code line-height multiplier; there is no dedicated
// `--code-line-height` token yet (see src/theme/tokens.css), so it is kept
// local to this computation rather than invented as a new token.
function skeletonHeight(lineCount: number): string {
  return `calc(var(--text-code) * 1.5 * ${lineCount})`
}

// Replaces each fenced code block with a plain, unstyled placeholder that
// reserves final height, without touching Shiki. Marks each placeholder with
// `data-code-pending` so `hydrateCodeHighlighting` can find and replace it.
export const codeSkeleton: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'pre') return
    const codeElement = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    )
    if (!codeElement) return
    const className = codeElement.properties?.className
    const hasLangClass =
      Array.isArray(className) &&
      className.some(
        // DEF-003: `language-math` (remark-math's block-math class, see
        // math-lazy.ts) is deliberately excluded — it belongs to
        // mathSkeleton/hydrateMathHighlighting, never to Shiki. Marking it
        // pending here would make Shiki's `unknownLanguageFallback`
        // (code.ts) strip the `language-math` class before rehype-katex
        // ever gets a chance to find it.
        (name) => typeof name === 'string' && name.startsWith('language-') && name !== 'language-math',
      )
    if (!hasLangClass) return

    const textNode = codeElement.children.find(
      (child): child is Text => child.type === 'text',
    )
    const lineCount = countLines(textNode?.value ?? '')

    node.properties = {
      ...node.properties,
      'data-code-pending': '',
      style: `min-height:${skeletonHeight(lineCount)}`,
    }
  })
}

// Runs the real highlighter (dynamically imported) against a tree already
// containing `codeSkeleton` placeholders — the caller decides when this
// happens (e.g. client-side, after first paint), keeping Shiki out of
// whatever bundle only ever calls `codeSkeleton`.
export async function hydrateCodeHighlighting(tree: Root): Promise<Root> {
  const plugins = await loadCodeHighlight()
  const processor = unified().use({ plugins })
  const result = await processor.run(tree)
  return result as Root
}
