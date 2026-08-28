import type { Root, Element, Text } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

// D13: only these fence languages have a matching Prettier parser + plugin
// bundle. Anything not listed here (bash, c, cpp, csharp, diff, dockerfile,
// go, ini, java, kotlin, lua, makefile, nginx, php, python, r, ruby, rust,
// scala, sql, swift, toml, xml — see shiki-config.ts SUPPORTED_LANGUAGES)
// passes through unformatted; no dependency is added to force coverage
// Prettier itself doesn't have.
const LANGUAGE_PARSERS: Readonly<Record<string, { parser: string; plugins: string[] }>> = {
  javascript: { parser: 'babel', plugins: ['babel', 'estree'] },
  jsx: { parser: 'babel', plugins: ['babel', 'estree'] },
  typescript: { parser: 'typescript', plugins: ['typescript', 'estree'] },
  tsx: { parser: 'typescript', plugins: ['typescript', 'estree'] },
  json: { parser: 'json', plugins: ['babel', 'estree'] },
  css: { parser: 'css', plugins: ['postcss'] },
  scss: { parser: 'scss', plugins: ['postcss'] },
  html: { parser: 'html', plugins: ['html'] },
  markdown: { parser: 'markdown', plugins: ['markdown'] },
  yaml: { parser: 'yaml', plugins: ['yaml'] },
  graphql: { parser: 'graphql', plugins: ['graphql'] },
}

// prettier/standalone's own `Options.plugins` type (`(string | Plugin<any>)[]`)
// is what `format()` expects; each dynamically-imported plugin module's
// `default` export satisfies `Plugin<any>` at runtime, but TS can't see that
// through a dynamic `import()` union of module types, hence the local alias.
type PrettierPlugin = import('prettier').Plugin
type PrettierPluginModule = { default: PrettierPlugin }

// D11: dynamic per-plugin import so only the parser(s) a fence actually
// declares are ever fetched — never the full Prettier bundle — matching the
// project's existing lazy-load discipline for Shiki (see code-lazy.ts) and
// Mermaid (T-P5-05).
async function loadPlugins(names: string[]): Promise<PrettierPlugin[]> {
  const modules = await Promise.all(
    names.map((name) => {
      switch (name) {
        case 'babel':
          return import('prettier/plugins/babel')
        case 'estree':
          return import('prettier/plugins/estree')
        case 'typescript':
          return import('prettier/plugins/typescript')
        case 'postcss':
          return import('prettier/plugins/postcss')
        case 'html':
          return import('prettier/plugins/html')
        case 'markdown':
          return import('prettier/plugins/markdown')
        case 'yaml':
          return import('prettier/plugins/yaml')
        case 'graphql':
          return import('prettier/plugins/graphql')
        default:
          throw new Error(`No prettier plugin loader registered for "${name}"`)
      }
    }),
  )
  return (modules as PrettierPluginModule[]).map((m) => m.default)
}

function getLanguage(codeElement: Element): string | null {
  const className = codeElement.properties?.className
  if (!Array.isArray(className)) return null
  const langClass = className.find(
    (name): name is string => typeof name === 'string' && name.startsWith('language-'),
  )
  return langClass ? langClass.slice('language-'.length) : null
}

// D10/D12: rehype plugin, run *before* codeHighlight (code.ts) in the lazy
// hydration chain (see code-lazy.ts's loadCodeHighlight) — reformats each
// fenced block's raw source via prettier/standalone before rehype-pretty-code
// tokenizes it, so highlighting is always computed against canonical
// formatting. Fails open: any parse/format error (expected for incomplete
// syntax, or a language Prettier doesn't cover) leaves the original text
// untouched rather than throwing or blocking rendering.
export const prettifyCode: Plugin<[], Root> = () => async (tree) => {
  const jobs: Array<Promise<void>> = []

  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'pre') return
    const codeElement = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    )
    if (!codeElement) return

    const lang = getLanguage(codeElement)
    if (!lang) return
    const config = LANGUAGE_PARSERS[lang]
    if (!config) return // D13: no parser for this language — pass through unformatted

    const textNode = codeElement.children.find(
      (child): child is Text => child.type === 'text',
    )
    if (!textNode || textNode.value.trim() === '') return

    jobs.push(
      (async () => {
        try {
          const [{ format }, plugins] = await Promise.all([
            import('prettier/standalone'),
            loadPlugins(config.plugins),
          ])
          const formatted = await format(textNode.value, {
            parser: config.parser,
            plugins,
          })
          // Prettier always appends a trailing newline; the fence's original
          // text node never carries one (mdast-util-to-hast strips it), so
          // drop it to keep skeleton line-count math (code-lazy.ts) and the
          // rendered block's content consistent with every other language.
          textNode.value = formatted.replace(/\n$/, '')
        } catch {
          // D12: invalid/incomplete syntax (expected mid-stream, FR-3.3) or
          // any other formatting failure — keep the original source verbatim.
        }
      })(),
    )
  })

  await Promise.all(jobs)
}
