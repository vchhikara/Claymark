// T-P6-02 / docs/ARCHITECTURE.md §4 "Segmentation": split the buffer at
// block boundaries — blank lines outside fences — so stable-prefix
// reconciliation (T-P6-03) can treat every segment but the last as
// immutable. A segment must never split inside a fenced code block, since
// that would change what the fence means.

const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})/

export interface Segment {
  text: string
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
  let openChar: string | null = null
  let openLen = 0

  for (const line of lines) {
    ;[openChar, openLen] = fenceTransition(line, openChar, openLen)
    const isBlank = line.trim() === ''

    if (isBlank && openChar === null) {
      if (current.length > 0) {
        segments.push({ text: current.join('\n') })
        current = []
      }
      continue // blank lines are pure separators, never leading content
    }
    current.push(line)
  }
  if (current.length > 0) {
    segments.push({ text: current.join('\n') })
  }
  return segments
}
