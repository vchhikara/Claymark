import type { Root } from 'hast'
import { processor } from '../processor'
import { segmentBuffer } from './segment'

// T-P6-03 / docs/ARCHITECTURE.md §4 "Stable-prefix reconciliation": all
// segments but the last are structurally stable — appending text cannot
// change them (FR-3.3 monotonicity depends on this: stable segments are
// never reparsed, so already-rendered content cannot change). Only the final
// segment is reparsed on append, making per-token cost O(size of last
// block), not O(document).

export interface ReconciledBlock {
  text: string
  tree: Root
}

export interface ReconcileResult {
  blocks: ReconciledBlock[]
  // How many segments were actually reparsed this call — the acceptance
  // criterion is that appending one token reparses at most one block.
  reparsedCount: number
}

export class ReconcileState {
  // Keyed by segment text: a stable segment's text never changes, so an
  // exact-text cache hit is exactly "this block is unchanged" — no separate
  // diffing or hashing needed.
  private cache = new Map<string, Root>()

  reconcile(fullText: string): ReconcileResult {
    const segments = segmentBuffer(fullText)
    const blocks: ReconciledBlock[] = []
    let reparsedCount = 0
    const seen = new Set<string>()

    for (const segment of segments) {
      seen.add(segment.text)
      const cached = this.cache.get(segment.text)
      if (cached) {
        blocks.push({ text: segment.text, tree: cached })
        continue
      }
      const tree = processor.runSync(processor.parse(segment.text)) as Root
      this.cache.set(segment.text, tree)
      reparsedCount += 1
      blocks.push({ text: segment.text, tree })
    }

    // Evict cache entries for segments no longer present (the buffer was
    // reset, not just appended to) — keeps the cache from growing unbounded
    // across unrelated documents in the same session.
    for (const key of this.cache.keys()) {
      if (!seen.has(key)) this.cache.delete(key)
    }

    return { blocks, reparsedCount }
  }
}
