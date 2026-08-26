import { useMemo, useRef } from 'react'
import type { ReactElement } from 'react'
import { ReconcileState } from '../pipeline/streaming/reconcile'
import { toReact } from '../pipeline/to-react'

export interface UseStreamingMarkdownResult {
  // One React element per block, in document order. FR-3.3 monotonicity:
  // a block's element reference never changes once its underlying text has
  // stopped growing, and blocks already emitted never disappear or reorder
  // as more source arrives — only the trailing (still-open) block's element
  // is ever replaced.
  elements: ReactElement[]
}

// T-P6-04 / docs/ARCHITECTURE.md §4: the hook side of stable-prefix
// reconciliation (T-P6-03) — reparse only the mutated tail, and reuse the
// same React element for every block whose parsed tree didn't change, so
// React's own reconciler bails out on unchanged children instead of
// re-rendering the whole document on every appended token.
export function useStreamingMarkdown(source: string): UseStreamingMarkdownResult {
  const stateRef = useRef<ReconcileState | null>(null)
  if (stateRef.current === null) stateRef.current = new ReconcileState()

  // Keyed by tree reference (not text): the reconcile cache already
  // guarantees a stable block keeps the exact same tree object, so reusing
  // the React element for that same tree object is a correct, cheap map.
  const elementCacheRef = useRef(new Map<unknown, ReactElement>())

  const elements = useMemo(() => {
    const { blocks } = stateRef.current!.reconcile(source)
    const cache = elementCacheRef.current
    const seen = new Set<unknown>()

    const result = blocks.map((block) => {
      seen.add(block.tree)
      const cached = cache.get(block.tree)
      if (cached) return cached
      const element = toReact(block.tree)
      cache.set(block.tree, element)
      return element
    })

    for (const key of cache.keys()) {
      if (!seen.has(key)) cache.delete(key)
    }

    return result
  }, [source])

  return { elements }
}
