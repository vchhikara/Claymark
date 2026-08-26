import rehypePrettyCode from 'rehype-pretty-code'
import type { Options as RehypePrettyCodeOptions } from 'rehype-pretty-code'
import type { Root, Element } from 'hast'
import type { Plugin, PluggableList } from 'unified'
import { visit } from 'unist-util-visit'
import { DEFAULT_THEMES, getShikiHighlighter, SUPPORTED_LANGUAGES } from './shiki-config'

const SUPPORTED_LANGUAGE_SET: ReadonlySet<string> = new Set(SUPPORTED_LANGUAGES)

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
  unknownLanguageFallback,
  [rehypePrettyCode, codeHighlightOptions],
]
