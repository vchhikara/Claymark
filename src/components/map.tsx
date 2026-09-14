import { isValidElement } from 'react'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { Blockquote } from './Blockquote'
import { CodeBlock } from './CodeBlock'
import { Emphasis, Strong } from './Inline'
import { InlineCode } from './InlineCode'
import { Link } from './Link'
import { ListItem } from './List'
import { Paragraph } from './Paragraph'
import { Rule } from './Rule'
import { Heading } from './Heading'
import { TaskListItem } from './TaskList'
import { TableContainer } from './Table'
import { Image } from './Image'
import { MermaidDiagram } from './MermaidDiagram'

type ElementTag =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'a' | 'ul' | 'ol' | 'li'
  | 'blockquote' | 'code' | 'pre' | 'em' | 'strong' | 'del' | 'hr' | 'br'
  | 'img' | 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'input' | 'figure'

type NodeProps = {
  children?: ReactNode
  node?: unknown
} & Record<string, unknown>

function TaskCheckbox({ checked }: { checked?: boolean }): ReactElement {
  return (
    <input
      type="checkbox"
      className="claymark-task-checkbox"
      checked={checked}
      disabled
      readOnly
      aria-checked={checked ? 'true' : 'false'}
    />
  )
}

function Passthrough({ tag, className, children }: { tag: ElementTag; className: string; children?: ReactNode }): ReactElement {
  const Tag = tag as unknown as ComponentType<{ className?: string; children?: ReactNode }>
  return <Tag className={className}>{children}</Tag>
}

function HeadingAdapter({ level, children }: NodeProps & { level: 1 | 2 | 3 | 4 | 5 | 6 }): ReactElement {
  return <Heading level={level}>{children}</Heading>
}

function Del({ children }: NodeProps): ReactElement {
  return <del className="claymark-del">{children}</del>
}

function Br(): ReactElement {
  return <br className="claymark-br" />
}

function ListAdapter({ ordered, start, children }: NodeProps & { ordered?: boolean | undefined; start?: number | undefined }): ReactElement {
  if (ordered) {
    return (
      <ol className="claymark-list claymark-ol" start={typeof start === 'number' ? start : undefined}>
        {children}
      </ol>
    )
  }
  return <ul className="claymark-list claymark-ul">{children}</ul>
}

function InputAdapter(props: NodeProps): ReactElement {
  return <TaskCheckbox checked={Boolean(props.checked)} />
}

function ListItemAdapter({ children }: NodeProps): ReactElement {
  const kids = Array.isArray(children) ? [...children] : children !== undefined && children !== null ? [children] : []
  const first = kids[0]
  if (isValidElement(first)) {
    const firstType = first.type as unknown
    // T-P8-01: the "input" DEFAULT_COMPONENTS entry must be this named
    // function reference — an inline arrow `(props) => <TaskCheckbox .../>`
    // creates a fresh function identity per element, so this identity check
    // would silently never match and every task checkbox would fall through
    // to the unlabeled plain-<li> path below.
    if (firstType === InputAdapter) {
      const props = first.props as { checked?: boolean }
      return (
        <TaskListItem checked={props.checked === true}>
          {kids.slice(1)}
        </TaskListItem>
      )
    }
  }
  return <ListItem>{children}</ListItem>
}

function CodeAdapter({ children, className, ...rest }: NodeProps): ReactElement {
  const cls = typeof className === 'string' ? className : Array.isArray(className) ? className.join(' ') : undefined
  // Pre-hydration (codeSkeleton's raw remark-rehype output) carries a plain
  // `language-*` class. Post-hydration, rehype-pretty-code (code-lazy.ts)
  // discards that entire code element and splices in Shiki's own <pre><code>
  // output instead — which carries no `language-*` class at all, only a
  // `data-language` property — so the substring check alone stops matching
  // the moment hydration finishes. A fenced block with no info string (no
  // language) carries neither signal, so also fall back to raw-text shape:
  // a `code` span can't contain a literal newline, but a fence's contents
  // routinely do — that's the only signal left to tell it apart from an
  // inline code span once hydration/language-less fences rule out the rest.
  // DEF-003: `language-math` (remark-math's inline-math class, see
  // math-lazy.ts) must never take the block-code path below — pre-hydration
  // it should render as a plain `<code>` (native monospace is exactly the
  // documented "Raw TeX source, monospaced" placeholder); post-hydration
  // rehype-katex has already replaced the whole element with its own
  // `<span class="katex">`, so this function no longer even runs for it.
  const isMathCode = cls !== undefined && /(^|\s)language-math(\s|$)/.test(cls)
  if (isMathCode) {
    return <code className={cls} {...rest}>{children}</code>
  }
  const rawText = extractRawText(rest.node as HastLikeElement | undefined)
  const isBlockCode = (cls !== undefined && /language-/.test(cls)) || 'data-language' in rest || rawText.includes('\n')
  if (isBlockCode) {
    return <code className={cls ? `claymark-code-block ${cls}` : 'claymark-code-block'} {...rest}>{children}</code>
  }
  return <InlineCode>{children}</InlineCode>
}

interface HastLikeElement {
  type: string
  tagName?: string
  properties?: { className?: unknown } & Record<string, unknown>
  children?: HastLikeElement[]
  value?: string
}

// The `code` element's own hast children (never the already-converted React
// children) — the fence content as authored, no highlighting spans to strip
// back out. Used for MermaidDiagram, which renders from raw diagram source.
function extractRawText(node: HastLikeElement | undefined): string {
  if (!node?.children) return ''
  return node.children
    .map((child) => (child.type === 'text' ? (child.value ?? '') : extractRawText(child)))
    .join('')
}

function hasLanguageClass(node: HastLikeElement, language: string): boolean {
  const className = node.properties?.className
  const classes = Array.isArray(className) ? className : typeof className === 'string' ? [className] : []
  return classes.includes(`language-${language}`)
}

// T-P5-xx: a ```mermaid fence renders via MermaidDiagram, not as a code
// block — checked against the `pre` node's own hast child (not the `code`
// DEFAULT_COMPONENTS entry) so the diagram replaces the whole `<pre>`
// wrapper instead of nesting a `<div>` inside it (invalid: `pre`'s content
// model is phrasing content only).
function findMermaidSource(node: unknown): string | null {
  const el = node as HastLikeElement | undefined
  const codeChild = el?.children?.find((child) => child.tagName === 'code')
  if (!codeChild || !hasLanguageClass(codeChild, 'mermaid')) return null
  return extractRawText(codeChild)
}

// FR-4.4/T-P4-05: CopyButton needs the exact fence source text, not the
// highlighted HTML the `code`/`pre` adapters render as `children` — walk the
// hast tree (still available as `node` before it becomes React) and
// concatenate its text leaves back into the original source.
function hastToText(node: HastLikeElement | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.value ?? ''
  if (!node.children) return ''
  return node.children.map(hastToText).join('')
}

// rehype-pretty-code represents the language two different ways depending
// on where in its pipeline the tree is read: a `language-xxx` class before
// (and sometimes after) processing, or a `data-language` property once it
// rewrites the code element — CodeAdapter (below) already checks both
// (`'data-language' in rest`) for the isBlockCode heuristic; this used the
// class only, so the header's language label could go blank exactly when
// the class form wasn't the one present (observed on-device, though the
// same divergence is reachable on any platform depending on hydration
// timing — checked here for symmetry with CodeAdapter, not just for that
// one repro).
function getCodeLanguage(preNode: HastLikeElement | undefined): string {
  const codeChild = preNode?.children?.find((child) => child.tagName === 'code')
  const className = codeChild?.properties?.className
  const classes = Array.isArray(className) ? className : typeof className === 'string' ? [className] : []
  const languageClass = classes.find(
    (name): name is string => typeof name === 'string' && name.startsWith('language-'),
  )
  if (languageClass) return languageClass.slice('language-'.length)
  const dataLanguage = codeChild?.properties?.['data-language']
  return typeof dataLanguage === 'string' ? dataLanguage : ''
}

// T-P8-01: CommonMark wraps a standalone `![alt](src)` in a `<p>` (an image
// is inline per the spec). Image.tsx renders a `<figure>` when the markdown
// supplies a title (caption) — a block-level element, which browsers/jsdom
// correctly flag as invalid nesting inside `<p>` (validateDOMNesting
// warning), and which axe-core would eventually treat as broken structure.
// remark-rehype's hast node for the paragraph carries the original
// (unconverted) children, so this checks *that* — not the already-mapped
// React children — for the single-image case and unwraps the `<p>`, same
// pattern react-markdown itself documents for this exact conflict.
function isSoleImageParagraph(node: unknown): boolean {
  const el = node as HastLikeElement | undefined
  if (!el?.children) return false
  const meaningful = el.children.filter(
    (child) => !(child.type === 'text' && (child.value ?? '').trim() === ''),
  )
  return meaningful.length === 1 && meaningful[0]?.tagName === 'img'
}

// DEF-003: block math (`$$…$$`) is structurally a fenced code block
// (`<pre><code class="language-math math-display">`, per remark-math's own
// documented hast conversion — see math-lazy.ts) but shouldn't get
// CodeBlock's copy-button/language chrome. Checked against the `pre` node's
// own hast child, same pattern as findMermaidSource above.
function isMathBlock(node: unknown): boolean {
  const el = node as HastLikeElement | undefined
  const codeChild = el?.children?.find((child) => child.tagName === 'code')
  return codeChild !== undefined && hasLanguageClass(codeChild, 'math')
}

function PreAdapter(props: NodeProps): ReactElement {
  const { children, node } = props
  const mermaidSource = findMermaidSource(node)
  if (mermaidSource !== null) {
    return <MermaidDiagram source={mermaidSource} />
  }
  if (isMathBlock(node)) {
    return <div className="claymark-math-block">{children}</div>
  }
  // codeSkeleton (src/pipeline/plugins/code-lazy.ts) marks a pending code
  // block's `pre` with `data-code-pending` + an inline `min-height` style —
  // both must survive onto the rendered element, or the skeleton's CLS guard
  // and useStreamingMarkdown's pending-block detection silently stop working.
  const pending = 'data-code-pending' in props
  const style = typeof props.style === 'string' ? props.style : undefined
  const preNode = node as HastLikeElement | undefined
  const codeChild = preNode?.children?.find((child) => child.tagName === 'code')
  return (
    <CodeBlock language={getCodeLanguage(preNode)} text={hastToText(codeChild)}>
      <pre
        className="claymark-pre"
        style={style ? ({ minHeight: style.replace(/^min-height:/, '') } as never) : undefined}
        {...(pending ? { 'data-code-pending': '' } : {})}
      >
        {children}
      </pre>
    </CodeBlock>
  )
}

function ParagraphAdapter(props: NodeProps): ReactElement {
  if (isSoleImageParagraph(props.node)) {
    return <>{props.children}</>
  }
  return <Paragraph>{props.children}</Paragraph>
}

export const DEFAULT_COMPONENTS: Record<ElementTag, ComponentType<NodeProps>> = {
  h1: (props) => <HeadingAdapter {...props} level={1} />,
  h2: (props) => <HeadingAdapter {...props} level={2} />,
  h3: (props) => <HeadingAdapter {...props} level={3} />,
  h4: (props) => <HeadingAdapter {...props} level={4} />,
  h5: (props) => <HeadingAdapter {...props} level={5} />,
  h6: (props) => <HeadingAdapter {...props} level={6} />,
  p: (props) => <ParagraphAdapter {...props} />,
  a: (props) => (
    <Link
      href={typeof props.href === 'string' ? props.href : undefined}
      title={typeof props.title === 'string' ? props.title : undefined}
      target={typeof props.target === 'string' ? props.target : undefined}
      rel={props.rel as string | string[] | undefined}
    >
      {props.children}
    </Link>
  ),
  ul: (props) => <ListAdapter {...props} ordered={false} />,
  ol: (props) => <ListAdapter {...props} ordered start={props.start as number | undefined} />,
  li: (props) => <ListItemAdapter {...props} />,
  blockquote: (props) => <Blockquote>{props.children}</Blockquote>,
  code: (props) => <CodeAdapter {...props} />,
  pre: (props) => <PreAdapter {...props} />,
  em: (props) => <Emphasis>{props.children}</Emphasis>,
  strong: (props) => <Strong>{props.children}</Strong>,
  del: (props) => <Del>{props.children}</Del>,
  hr: () => <Rule />,
  br: () => <Br />,
  img: (props) => (
    <Image
      src={props.src as string | undefined}
      alt={props.alt as string | undefined}
      title={props.title as string | undefined}
      width={props.width as number | string | undefined}
      height={props.height as number | string | undefined}
    />
  ),
  table: (props) => (
    <TableContainer>
      <Passthrough tag="table" className="claymark-table">
        {props.children}
      </Passthrough>
    </TableContainer>
  ),
  thead: (props) => <Passthrough tag="thead" className="claymark-thead">{props.children}</Passthrough>,
  tbody: (props) => <Passthrough tag="tbody" className="claymark-tbody">{props.children}</Passthrough>,
  tr: (props) => <Passthrough tag="tr" className="claymark-tr">{props.children}</Passthrough>,
  th: (props) => <Passthrough tag="th" className="claymark-th">{props.children}</Passthrough>,
  td: (props) => <Passthrough tag="td" className="claymark-td">{props.children}</Passthrough>,
  input: InputAdapter,
  // rehype-pretty-code (code-lazy.ts's hydrateCodeHighlighting) rewrites a
  // hydrated fenced code block's own `pre` node into a `figure` carrying
  // `data-rehype-pretty-code-figure`, wrapping its (still-mapped) `pre`/`code`
  // children — without this entry it falls through to a bare native
  // `<figure>`, picking up the browser's default figure margin/indent.
  figure: (props) => <Passthrough tag="figure" className="claymark-code-figure">{props.children}</Passthrough>,
}
