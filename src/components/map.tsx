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

type ElementTag =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'a' | 'ul' | 'ol' | 'li'
  | 'blockquote' | 'code' | 'pre' | 'em' | 'strong' | 'del' | 'hr' | 'br'
  | 'img' | 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'input'

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

function CodeAdapter({ children, className }: NodeProps): ReactElement {
  const cls = typeof className === 'string' ? className : Array.isArray(className) ? className.join(' ') : undefined
  if (cls !== undefined && /language-/.test(cls)) {
    return <code className={`claymark-code-block ${cls}`}>{children}</code>
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

function getCodeLanguage(preNode: HastLikeElement | undefined): string {
  const codeChild = preNode?.children?.find((child) => child.tagName === 'code')
  const className = codeChild?.properties?.className
  const classes = Array.isArray(className) ? className : typeof className === 'string' ? [className] : []
  const languageClass = classes.find(
    (name): name is string => typeof name === 'string' && name.startsWith('language-'),
  )
  return languageClass ? languageClass.slice('language-'.length) : ''
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
  pre: (props) => {
    const preNode = props.node as HastLikeElement | undefined
    const codeChild = preNode?.children?.find((child) => child.tagName === 'code')
    return (
      <CodeBlock language={getCodeLanguage(preNode)} text={hastToText(codeChild)}>
        <Passthrough tag="pre" className="claymark-pre">
          {props.children}
        </Passthrough>
      </CodeBlock>
    )
  },
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
}
