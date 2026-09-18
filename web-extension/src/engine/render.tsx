/**
 * hast → React (FR-2.1). Each top-level block is its own error boundary
 * (NFR-5) so one bad block can't blank the document.
 */
import { Component, memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Root, RootContent } from 'hast'
import { toHast, needsMath, mathReady, loadMath, type OutlineEntry } from './pipeline'
import { DEFAULT_COMPONENTS } from './components'

class BlockBoundary extends Component<{ children: ReactNode; fallback: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidUpdate(prev: { fallback: string }) {
    if (prev.fallback !== this.props.fallback && this.state.failed) this.setState({ failed: false })
  }
  render() {
    if (this.state.failed) return <pre className="claymark-pre claymark-block-error">{this.props.fallback}</pre>
    return this.props.children
  }
}

function blockText(node: RootContent): string {
  if (node.type === 'text') return node.value
  if ('children' in node) return (node.children as RootContent[]).map(blockText).join('')
  return ''
}

const Block = memo(function Block({ node }: { node: RootContent; sig: string }) {
  const root: Root = { type: 'root', children: [node] }
  return (
    <BlockBoundary fallback={blockText(node)}>
      {toJsxRuntime(root, { Fragment, jsx: jsx as any, jsxs: jsxs as any, components: DEFAULT_COMPONENTS as any, passNode: true, ignoreInvalidStyle: true })}
    </BlockBoundary>
  )
}, (a, b) => a.sig === b.sig)

/* Cheap structural signature so unchanged blocks skip re-render (FR-3.4). */
function signature(node: RootContent): string {
  return JSON.stringify(node, (k, v) => (k === 'position' ? undefined : v))
}

export function useMarkdown(source: string): { blocks: RootContent[]; outline: OutlineEntry[] } {
  const wantMath = needsMath(source)
  const [math, setMath] = useState(mathReady())
  useEffect(() => {
    if (wantMath && !math) loadMath().then(() => setMath(true), () => {})
  }, [wantMath, math])
  return useMemo(() => {
    const { hast, outline } = toHast(source)
    return { blocks: hast.children.filter((c) => !(c.type === 'text' && !c.value.trim())), outline }
  }, [source, math])
}

export function MarkdownRoot({ blocks, className }: { blocks: RootContent[]; className?: string }) {
  return (
    <article className={['claymark-root', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => (
        <Block key={i} node={b} sig={signature(b)} />
      ))}
    </article>
  )
}
