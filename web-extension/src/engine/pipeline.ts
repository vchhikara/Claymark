/**
 * claymark render pipeline (extension rebuild — see LEDGER X-001/X-002).
 *
 * Order matters:
 *   1. parse (CommonMark + GFM + math)
 *   2. raw HTML → literal text            (FR-1.6: inert, shown as text)
 *   3. mdast → hast, no raw HTML          (FR-2.1)
 *   4. rehype-sanitize (strict allow-list) (NFR-1.1) — runs on *untrusted* tree only
 *   5. url-policy (reused verbatim)        (NFR-1.3)
 *   6. trusted transforms: heading ids, external-link rel, KaTeX
 * Trusted transforms run after sanitize so their own output isn't stripped,
 * and nothing from the document can reach the DOM without passing step 4.
 */
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { visit } from 'unist-util-visit'
import { VFile } from 'vfile'
import type { Root as MdRoot, Parent as MdParent } from 'mdast'
import type { Root, Element, ElementContent } from 'hast'
import { urlPolicy } from './url-policy'

export interface OutlineEntry {
  depth: number
  text: string
  id: string
}

/* ---- 2. raw HTML becomes visible text ---------------------------------- */
const FLOW_PARENTS = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition'])

function remarkInertHtml() {
  return (tree: MdRoot) => {
    visit(tree, 'html', (node: any, index, parent: MdParent | undefined) => {
      if (!parent || index === undefined) return
      const text = { type: 'text', value: node.value }
      if (FLOW_PARENTS.has(parent.type)) {
        ;(parent.children as any[])[index] = { type: 'paragraph', children: [text], position: node.position }
      } else {
        ;(parent.children as any[])[index] = { ...text, position: node.position }
      }
    })
  }
}

/* ---- 4. sanitize schema ------------------------------------------------- */
const schema = structuredClone(defaultSchema)
schema.attributes = schema.attributes ?? {}
schema.attributes.code = [
  ...(schema.attributes.code ?? []).filter((a) => !(Array.isArray(a) && a[0] === 'className')),
  ['className', /^language-./, 'math-inline', 'math-display'],
]
// Code fence meta (e.g. {1,3} showLineNumbers) is kept as a data attribute.
schema.attributes.pre = [...(schema.attributes.pre ?? []), 'dataMeta']
schema.protocols = schema.protocols ?? {}
// data: is let through here and narrowed to png/jpeg/gif/webp by url-policy.
schema.protocols.src = ['http', 'https', 'data']

/* Carry the fence meta string across remark-rehype so FR-4.4 can use it. */
function remarkFenceMeta() {
  return (tree: MdRoot) => {
    visit(tree, 'code', (node: any) => {
      if (node.meta) {
        node.data = node.data ?? {}
        node.data.hProperties = { ...(node.data.hProperties ?? {}), dataMeta: node.meta }
      }
    })
  }
}
// remark-rehype puts hProperties on the <code>; move dataMeta up to the <pre>.
function rehypeLiftMeta() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return
      const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
      if (code?.properties?.dataMeta) {
        node.properties = { ...node.properties, dataMeta: code.properties.dataMeta }
        delete code.properties.dataMeta
      }
    })
  }
}

/* ---- 6. trusted transforms --------------------------------------------- */
function textOf(node: ElementContent | Root): string {
  if (node.type === 'text') return node.value
  if ('children' in node) return (node.children as ElementContent[]).map(textOf).join('')
  return ''
}

function rehypeHeadings() {
  return (tree: Root, file: any) => {
    const outline: OutlineEntry[] = []
    visit(tree, 'element', (node: Element) => {
      const m = /^h([1-6])$/.exec(node.tagName)
      if (!m) return
      const id = `cm-h-${outline.length}`
      node.properties = { ...node.properties, id }
      outline.push({ depth: Number(m[1]), text: textOf(node).trim(), id })
    })
    file.data.outline = outline
  }
}

function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href === 'string' && /^(https?:|mailto:)/i.test(href)) {
        node.properties.rel = ['noopener', 'noreferrer'] // NFR-1.4
        node.properties.target = '_blank'
      }
    })
  }
}

function base() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkInertHtml)
    .use(remarkFenceMeta)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeLiftMeta)
    .use(rehypeSanitize, schema)
    .use(urlPolicy)
    .use(rehypeHeadings)
    .use(rehypeExternalLinks)
}

/** Core processor — no KaTeX (keeps the initial bundle small, NFR-2; LEDGER X-024). */
export const processor = base()
let mathProcessor: ReturnType<typeof base> | null = null
let mathLoading: Promise<void> | null = null

export const needsMath = (source: string) => source.includes('$')
export const mathReady = () => mathProcessor !== null

/** Lazy-load KaTeX and build the full processor. Idempotent. */
export function loadMath(): Promise<void> {
  mathLoading ??= import('rehype-katex').then((m) => {
    mathProcessor = base().use(m.default, { throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' } as any) as any
  })
  return mathLoading
}

export interface RenderResult {
  hast: Root
  outline: OutlineEntry[]
}

/** Pure: identical input → structurally identical tree (FR-2.4). Never throws (FR-2.3). */
export function toHast(source: string): RenderResult {
  try {
    const file = new VFile(source)
    const p = needsMath(source) && mathProcessor ? mathProcessor : processor
    const mdast = p.parse(source)
    const hast = p.runSync(mdast, file) as Root
    return { hast, outline: (file.data.outline as OutlineEntry[]) ?? [] }
  } catch (err) {
    // Last-resort degrade: show source as text.
    return {
      hast: {
        type: 'root',
        children: [{ type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'text', value: source }] }],
      },
      outline: [],
    }
  }
}
