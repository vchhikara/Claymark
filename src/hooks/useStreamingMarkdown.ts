import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { Components } from 'hast-util-to-jsx-runtime'
import type { Element, Root } from 'hast'
import { visit } from 'unist-util-visit'
import { ReconcileState } from '../pipeline/streaming/reconcile'
import type { ReconciledBlock } from '../pipeline/streaming/reconcile'
import { toReact } from '../pipeline/to-react'
import { hydrateCodeHighlighting } from '../pipeline/plugins/code-lazy'
import { hydrateMathHighlighting } from '../pipeline/plugins/math-lazy'
import { DEFAULT_COMPONENTS } from '../components/map'

const components = DEFAULT_COMPONENTS as unknown as Components

export interface UseStreamingMarkdownResult {
  // One React element per block, in document order. FR-3.3 monotonicity:
  // a block's element reference never changes once its underlying text has
  // stopped growing, and blocks already emitted never disappear or reorder
  // as more source arrives — only the trailing (still-open) block's element
  // is ever replaced.
  elements: ReactElement[]
}

// The processor (src/pipeline/processor.ts) runs `codeSkeleton` on every
// parsed block, so a fenced code block's `pre` is marked `data-code-pending`
// until `hydrateCodeHighlighting` (src/pipeline/plugins/code-lazy.ts) swaps
// it for real Shiki output. This just checks whether that marker is still
// present, so the hook knows which blocks still need hydrating.
function hasPendingCode(tree: Root): boolean {
  let found = false
  visit(tree, 'element', (node: Element) => {
    if (node.properties && 'data-code-pending' in node.properties) found = true
  })
  return found
}

// DEF-003: same idea, for `mathSkeleton`'s `data-math-pending` marker
// (src/pipeline/plugins/math-lazy.ts). Checked separately from
// hasPendingCode — deliberately never merged into one "hasPendingEnrichment"
// check, so a math-only tree never invokes hydrateCodeHighlighting (whose
// unknownLanguageFallback would strip the `language-math` class rehype-katex
// needs) and vice versa.
function hasPendingMath(tree: Root): boolean {
  let found = false
  visit(tree, 'element', (node: Element) => {
    if (node.properties && 'data-math-pending' in node.properties) found = true
  })
  return found
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

  // Trees already hydrated (or hydrating) — a WeakSet keyed by tree object
  // identity, so a still-open block that gets reparsed into a fresh tree
  // object on every append is naturally re-checked, while a frozen block's
  // stable tree is only ever hydrated once.
  const hydratingRef = useRef(new WeakSet<Root>())

  // Bumped once a background hydration finishes, purely to force the
  // useMemo below to re-run against the (in-place-mutated) tree it already
  // has — hydrateCodeHighlighting mutates the same Root object it's given
  // (see code-lazy.ts / rehype-pretty-code), so no new tree reference ever
  // arrives; this tick is what actually triggers the re-render.
  const [hydrationTick, setHydrationTick] = useState(0)

  const { elements, blocks } = useMemo(() => {
    const { blocks } = stateRef.current!.reconcile(source)
    const cache = elementCacheRef.current
    const seen = new Set<unknown>()

    const result = blocks.map((block) => {
      seen.add(block.tree)
      const cached = cache.get(block.tree)
      if (cached) return cached
      const element = toReact(block.tree, { components })
      cache.set(block.tree, element)
      return element
    })

    for (const key of cache.keys()) {
      if (!seen.has(key)) cache.delete(key)
    }

    return { elements: result, blocks }
    // hydrationTick is intentionally a dependency purely to force
    // recomputation after a background hydration mutates a cached tree in
    // place — the reconcile/cache logic itself only cares about `source`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, hydrationTick])

  // Fires (client-side, after paint) for every block whose tree still has a
  // pending code skeleton and isn't already being hydrated. Each hydration
  // mutates its tree in place, evicts that block's now-stale cached React
  // element so the next render re-converts it via toReact, and bumps
  // hydrationTick to trigger that render.
  useEffect(() => {
    let cancelled = false
    for (const block of blocks as ReconciledBlock[]) {
      const { tree } = block
      if (hydratingRef.current.has(tree)) continue
      const pendingCode = hasPendingCode(tree)
      const pendingMath = hasPendingMath(tree)
      if (!pendingCode && !pendingMath) continue
      hydratingRef.current.add(tree)
      const hydrations: Promise<Root>[] = []
      if (pendingCode) hydrations.push(hydrateCodeHighlighting(tree))
      if (pendingMath) hydrations.push(hydrateMathHighlighting(tree))
      void Promise.all(hydrations).then(() => {
        if (cancelled) return
        elementCacheRef.current.delete(tree)
        setHydrationTick((tick) => tick + 1)
      })
    }
    return () => {
      cancelled = true
    }
  }, [blocks])

  return { elements }
}
