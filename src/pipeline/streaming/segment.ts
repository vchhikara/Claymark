// T-P6-02 / docs/ARCHITECTURE.md §4 "Segmentation": split the buffer at
// block boundaries — blank lines outside fences — so stable-prefix
// reconciliation (T-P6-03) can treat every segment but the last as
// immutable. A segment must never split inside a fenced code block, since
// that would change what the fence means.

const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})/

export interface Segment {
  text: string
  // Character offsets of this segment within the `text` passed to
  // segmentBuffer (not necessarily the full document — see
  // reconcile.ts, which calls this on a tail slice and rebases these).
  start: number
  end: number
}

// Tracks fence open/close state across a run of lines using the same
// same-character/length-or-greater closing rule as detect.ts.
function fenceTransition(line: string, openChar: string | null, openLen: number): [string | null, number] {
  const match = FENCE_RE.exec(line)
  if (!match) return [openChar, openLen]
  const marker = match[2]
  if (!marker) return [openChar, openLen]
  const char = marker.charAt(0)
  if (openChar === null) return [char, marker.length]
  if (char === openChar && marker.length >= openLen) return [null, 0]
  return [openChar, openLen]
}

// Splits `text` into block-level segments at blank lines, never inside an
// open fence — a blank line encountered while a fence is open is just fence
// content, not a boundary.
export function segmentBuffer(text: string): Segment[] {
  const lines = text.split('\n')
  const segments: Segment[] = []
  let current: string[] = []
  let currentStart = 0
  let openChar: string | null = null
  let openLen = 0
  let offset = 0

  for (const line of lines) {
    ;[openChar, openLen] = fenceTransition(line, openChar, openLen)
    const isBlank = line.trim() === ''

    if (isBlank && openChar === null) {
      if (current.length > 0) {
        const joined = current.join('\n')
        segments.push({ text: joined, start: currentStart, end: currentStart + joined.length })
        current = []
      }
      offset += line.length + 1
      currentStart = offset
      continue // blank lines are pure separators, never leading content
    }
    if (current.length === 0) currentStart = offset
    current.push(line)
    offset += line.length + 1
  }
  if (current.length > 0) {
    const joined = current.join('\n')
    segments.push({ text: joined, start: currentStart, end: currentStart + joined.length })
  }
  return segments
}
