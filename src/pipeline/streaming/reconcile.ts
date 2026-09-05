import type { Root } from 'hast'
import { processor } from '../processor'
import { segmentBuffer } from './segment'
import type { Segment } from './segment'

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

  // Incremental resegmentation state (discovered necessary under stress —
  // see T-P6-10): re-running segmentBuffer over the *entire* accumulated
  // buffer on every single append is itself O(document length) per call,
  // independent of the parse-tree cache above, which defeats the
  // architecture's stated "per-token cost O(size of last block)" goal for
  // any long-running stream. On a pure append (fullText extends the
  // previous call's text) every segment before the previous last one is
  // already known-frozen, so only the tail starting at the previous last
  // segment's start needs to be rescanned.
  private prevFullText = ''
  private prevSegments: Segment[] = []
  private prevBlocks: ReconciledBlock[] = []

  reconcile(fullText: string): ReconcileResult {
    const canIncrementalize =
      this.prevSegments.length > 0 &&
      fullText.length >= this.prevFullText.length &&
      fullText.startsWith(this.prevFullText)

    if (!canIncrementalize) {
      return this.reconcileFull(fullText)
    }

    // Frozen prefix: every block but the previous last one is reused
    // untouched — no cache lookup, no re-hashing, no re-segmentation. Only
    // the tail (from the previous last segment's start onward) is rescanned
    // and reconciled, so per-token cost tracks the size of the still-open
    // block, not the whole document.
    const frozenBlocks = this.prevBlocks.slice(0, -1)
    const frozenSegments = this.prevSegments.slice(0, -1)
    const lastPrev = this.prevSegments[this.prevSegments.length - 1]!
    const tailText = fullText.slice(lastPrev.start)
    const tailSegments = segmentBuffer(tailText).map((s) => ({
      text: s.text,
      start: s.start + lastPrev.start,
      end: s.end + lastPrev.start,
    }))

    const { blocks: tailBlocks, reparsedCount } = this.reconcileSegments(tailSegments, {
      evict: false, // frozen segments aren't part of `tailSegments` — evicting
      // against that set alone would wrongly drop their still-valid cache entries
    })

    // The previous last (still-open) segment's cache entry is now
    // superseded — under append-only streaming its exact text can never
    // recur, so retaining it would leak one Map entry per token for the
    // entire lifetime of a long-running stream. Only evict it if it isn't
    // also one of the new tail segments (e.g. the open block just got
    // closed off by a blank line and reappears verbatim as a frozen entry).
    const newTailTexts = new Set(tailSegments.map((s) => s.text))
    if (!newTailTexts.has(lastPrev.text)) {
      this.cache.delete(lastPrev.text)
    }

    const blocks = [...frozenBlocks, ...tailBlocks]
    this.prevFullText = fullText
    this.prevSegments = [...frozenSegments, ...tailSegments]
    this.prevBlocks = blocks

    return { blocks, reparsedCount }
  }

  private reconcileFull(fullText: string): ReconcileResult {
    const segments = segmentBuffer(fullText)
    const { blocks, reparsedCount } = this.reconcileSegments(segments)

    this.prevFullText = fullText
    this.prevSegments = segments
    this.prevBlocks = blocks

    return { blocks, reparsedCount }
  }

  private reconcileSegments(
    segments: Segment[],
    options: { evict: boolean } = { evict: true },
  ): ReconcileResult {
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

    // Evict cache entries for segments no longer present in this call's
    // segmentation — only correct (and only run) for a full reconcile,
    // where `segments` covers the entire document. The incremental path
    // passes evict:false, since `segments` there is just the small tail
    // set and evicting against it would wrongly drop the frozen prefix's
    // still-valid cache entries.
    if (options.evict) {
      for (const key of this.cache.keys()) {
        if (!seen.has(key)) this.cache.delete(key)
      }
    }

    return { blocks, reparsedCount }
  }
}
