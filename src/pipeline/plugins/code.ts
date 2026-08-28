import rehypePrettyCode from 'rehype-pretty-code'
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code'
import type { Root, Element } from 'hast'
import type { Plugin, PluggableList } from 'unified'
import { visit } from 'unist-util-visit'
import { DEFAULT_THEMES, getShikiHighlighter, SUPPORTED_LANGUAGES } from './shiki-config'

const SUPPORTED_LANGUAGE_SET: ReadonlySet<string> = new Set(SUPPORTED_LANGUAGES)

// Mermaid fences route to MermaidDiagram (src/components/map.tsx's `pre`
// adapter), never to Shiki — "mermaid" is deliberately absent from R-LANG
// (shiki-config.ts) since it isn't a highlighted grammar. Without this pair
// of plugins, `language-mermaid` would hit the same fate as any other
// unregistered language: unknownLanguageFallback strips the class before
// rehype-pretty-code ever runs, and the component-mapping layer downstream
// loses the one signal it needs to route to MermaidDiagram instead of a
// plain code block.
const MERMAID_LANGUAGE_CLASS = 'language-mermaid'
const MERMAID_HIDDEN_MARKER = 'dataClaymarkMermaid'

// Runs before unknownLanguageFallback: hides the class from both it and
// rehype-pretty-code (which would otherwise try to load a "mermaid" grammar
// from the pinned 34-language Shiki bundle and throw) by renaming it to a
// non-`language-*` marker attribute.
const hideMermaidFromHighlighter: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'code') return
    const className = node.properties?.className
    if (!Array.isArray(className) || !className.includes(MERMAID_LANGUAGE_CLASS)) return
    node.properties.className = className.filter((name) => name !== MERMAID_LANGUAGE_CLASS)
    node.properties[MERMAID_HIDDEN_MARKER] = ''
  })
}

// Runs after rehype-pretty-code: restores `language-mermaid` now that the
// highlighter has safely skipped the block (rehype-pretty-code leaves a
// `code` element with no `language-*` class completely untouched, per the
// comment on unknownLanguageFallback below).
const restoreMermaidLanguageClass: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'code' || node.properties?.[MERMAID_HIDDEN_MARKER] === undefined) return
    const className = Array.isArray(node.properties.className) ? node.properties.className : []
    node.properties.className = [...className, MERMAID_LANGUAGE_CLASS]
    delete node.properties[MERMAID_HIDDEN_MARKER]
  })
}

// FR-4.2: unregistered languages must never throw and must render as unstyled
// preformatted text — not Shiki's own "plaintext" fallback, which still wraps
// output in themed spans. rehype-pretty-code skips a code block entirely
// (leaving it untouched) when it finds no `language-*` class, so unknown
// fence tags are stripped here, before rehype-pretty-code ever sees them.
const unknownLanguageFallback: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element, index, parent) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) return
    const codeElement = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    )
    if (!codeElement) return
    const className = codeElement.properties?.className
    if (!Array.isArray(className)) return
    const langClass = className.find(
      (name): name is string => typeof name === 'string' && name.startsWith('language-'),
    )
    if (!langClass) return
    const lang = langClass.slice('language-'.length)
    if (SUPPORTED_LANGUAGE_SET.has(lang)) return
    codeElement.properties.className = className.filter((name) => name !== langClass)
    // codeSkeleton (code-lazy.ts) marks this `pre` data-code-pending + a
    // min-height style expecting rehype-pretty-code to replace it — but an
    // unsupported language never reaches rehype-pretty-code (it only touches
    // `pre`s that still carry a `language-*` class), so without this the
    // marker survives forever: useStreamingMarkdown's hasPendingCode(tree)
    // keeps reporting the block pending and re-invoking hydration on every
    // render, and the CLS-guard min-height never gets released.
    if (node.properties) {
      delete node.properties['data-code-pending']
      delete node.properties.style
    }
  })
}

// FR-4.1: syntax highlighting across the R-LANG registry, with paired
// light/dark themes resolved by the data-theme attribute (docs/THEMING.md §8).
// `getHighlighter` reuses the pinned singleton from shiki-config.ts so the
// bundle config (34 langs, 2 themes) stays the single source of truth.
//
// T-P4-07: line highlighting (fence meta `{1,3-5}`) and line-number metadata
// (fence meta `showLineNumbers`) need no extra wiring here — mdast-util-to-hast
// already carries the fence's meta string onto the hast `code` node's
// `data.meta` (see node_modules mdast-util-to-hast/lib/handlers/code.js), and
// rehype-pretty-code parses both conventions from that meta itself, emitting
// `data-highlighted-line` per matched line and `data-line-numbers` /
// `data-line-numbers-max-digits` on the `code` element. CSS renders the
// counter; no pipeline-side parsing is needed.
const codeHighlightOptions: RehypePrettyCodeOptions = {
  theme: { light: DEFAULT_THEMES.light, dark: DEFAULT_THEMES.dark },
  keepBackground: false,
  getHighlighter: () => getShikiHighlighter(),
}

export const codeHighlight: PluggableList = [
  hideMermaidFromHighlighter,
  unknownLanguageFallback,
  [rehypePrettyCode, codeHighlightOptions],
  restoreMermaidLanguageClass,
]
