import { useEffect, useRef, useState, type RefObject } from 'react'
import { PortedButton } from './pb/button'
import { ArrowUp, ArrowDown, X } from 'lucide-react'

const hasHighlights = typeof CSS !== 'undefined' && 'highlights' in CSS

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Ranges for `query` inside rendered text (one text node at a time). */
function findRanges(root: HTMLElement, query: string): Range[] {
  const out: Range[] = []
  if (!query) return out
  const q = query.toLowerCase()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement
      if (!p || p.closest('.katex-mathml, button, .claymark-codeblock-header')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.nodeValue ?? '').toLowerCase()
    let i = text.indexOf(q)
    while (i !== -1) {
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + q.length)
      out.push(r)
      i = text.indexOf(q, i + q.length)
    }
  }
  return out
}

function sourceMatches(src: string, query: string): number[] {
  if (!query) return []
  const re = new RegExp(escapeRe(query), 'gi')
  const idx: number[] = []
  for (let m = re.exec(src); m; m = re.exec(src)) idx.push(m.index)
  return idx
}

export function SearchBar(props: {
  editing: boolean
  articleRef: RefObject<HTMLElement>
  textareaRef: RefObject<HTMLTextAreaElement>
  source: string
  onReplace: (next: string, caret?: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [current, setCurrent] = useState(-1)
  const [domCount, setDomCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rangesRef = useRef<Range[]>([])

  useEffect(() => inputRef.current?.focus(), [])

  // Rendered-document highlights (both modes).
  useEffect(() => {
    const run = () => {
      const root = props.articleRef.current
      if (!root) return
      const ranges = findRanges(root, query)
      rangesRef.current = ranges
      setDomCount(ranges.length)
      if (hasHighlights) {
        ;(CSS as any).highlights.set('cm-search', new (window as any).Highlight(...ranges))
      }
    }
    run()
    const t = setTimeout(run, 350) // after async code/diagram renders
    return () => clearTimeout(t)
  }, [query, props.source, props.editing])

  useEffect(() => {
    return () => {
      if (hasHighlights) {
        ;(CSS as any).highlights.delete('cm-search')
        ;(CSS as any).highlights.delete('cm-search-current')
      }
    }
  }, [])

  useEffect(() => setCurrent(-1), [query])

  const srcIdx = props.editing ? sourceMatches(props.source, query) : []
  const count = props.editing ? srcIdx.length : domCount

  const go = (dir: 1 | -1) => {
    if (!count) return
    const next = (current + dir + count) % count
    setCurrent(next)
    if (props.editing) {
      const ta = props.textareaRef.current
      if (!ta) return
      const at = srcIdx[next]!
      ta.focus()
      ta.setSelectionRange(at, at + query.length)
      // Scroll the textarea roughly to the match line.
      const line = props.source.slice(0, at).split('\n').length - 1
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18
      ta.scrollTop = Math.max(0, line * lh - ta.clientHeight / 2)
      inputRef.current?.focus()
    } else {
      const r = rangesRef.current[next]
      if (!r) return
      if (hasHighlights) (CSS as any).highlights.set('cm-search-current', new (window as any).Highlight(r))
      const rect = r.getBoundingClientRect()
      window.scrollBy({ top: rect.top - window.innerHeight / 3, behavior: 'smooth' })
    }
  }

  const replaceOne = () => {
    if (!props.editing || !srcIdx.length) return
    const i = srcIdx[Math.max(0, current)]!
    const next = props.source.slice(0, i) + replace + props.source.slice(i + query.length)
    props.onReplace(next, i + replace.length)
  }
  const replaceAll = () => {
    if (!props.editing || !query) return
    props.onReplace(props.source.replace(new RegExp(escapeRe(query), 'gi'), () => replace))
  }

  return (
    <div className="cm-search pb-clay-raised" role="search">
      <label className="sr-only" htmlFor="cm-search-q">Search</label>
      <input
        id="cm-search-q"
        ref={inputRef}
        className="cm-search-input"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? -1 : 1) }
          if (e.key === 'Escape') { e.preventDefault(); props.onClose() }
        }}
      />
      <div className="cm-search-meta">
        <span aria-live="polite">
          {count === 0 ? '0 matches' : current >= 0 ? `${current + 1} of ${count}` : `${count} match${count === 1 ? '' : 'es'}`}
        </span>
        <PortedButton variant="ghost" size="icon" onClick={() => go(-1)} disabled={!count} aria-label="Previous match" title="Previous match"><ArrowUp size={14} aria-hidden="true" /></PortedButton>
        <PortedButton variant="ghost" size="icon" onClick={() => go(1)} disabled={!count} aria-label="Next match" title="Next match"><ArrowDown size={14} aria-hidden="true" /></PortedButton>
        <PortedButton variant="ghost" size="icon" onClick={props.onClose} aria-label="Close search" title="Close search"><X size={14} aria-hidden="true" /></PortedButton>
      </div>
      {props.editing && (
        <>
          <label className="sr-only" htmlFor="cm-search-r">Replace</label>
          <input
            id="cm-search-r"
            className="cm-search-input"
            placeholder="Replace…"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); replaceOne() }
              if (e.key === 'Escape') { e.preventDefault(); props.onClose() }
            }}
          />
          <div className="cm-search-meta">
            <PortedButton variant="outline" size="sm" onClick={replaceOne} disabled={!count}>Replace</PortedButton>
            <PortedButton variant="outline" size="sm" onClick={replaceAll} disabled={!count}>Replace all</PortedButton>
          </div>
        </>
      )}
    </div>
  )
}
