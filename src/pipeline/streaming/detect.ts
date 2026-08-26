// T-P6-01 / docs/ARCHITECTURE.md §4 "Partial detection": before the final
// (unstable) segment is parsed, classify whether it ends mid-construct so the
// caller can choose a partial rendering that won't need visual retraction
// once the construct completes (FR-3.2).
//
// This is deliberately a fast, line-oriented heuristic — not a Markdown
// parser. It only needs to answer "is the tail structurally incomplete",
// not "what does this mean"; the real parse still happens downstream.

export type PartialConstructKind =
  | 'none'
  | 'open-fence'
  | 'partial-table'
  | 'open-emphasis'
  | 'open-link'

export interface PartialConstructResult {
  kind: PartialConstructKind
}

const FENCE_RE = /^(\s{0,3})(`{3,}|~{3,})/

// Is the buffer, taken as a whole, still inside an open fenced code block?
// CommonMark closing-fence rule: same char, length >= opening length.
function hasOpenFence(text: string): boolean {
  const lines = text.split('\n')
  let openChar: string | null = null
  let openLen = 0
  for (const line of lines) {
    const match = FENCE_RE.exec(line)
    if (!match) continue
    const marker = match[2]
    if (!marker) continue
    const char = marker.charAt(0)
    if (openChar === null) {
      openChar = char
      openLen = marker.length
    } else if (char === openChar && marker.length >= openLen) {
      openChar = null
      openLen = 0
    }
    // A fence of the other character, or a shorter same-character run,
    // inside an already-open fence is just content — ignored.
  }
  return openChar !== null
}

const DELIMITER_ROW_RE = /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/
const hasUnescapedPipe = (line: string): boolean => /(?<!\\)\|/.test(line)
const endsAtCellBoundary = (line: string): boolean => /(?<!\\)\|\s*$/.test(line) || line.trim() === ''

// A GFM table needs a header row immediately followed by a delimiter row
// (`---|---`) before any body row counts — a line without a pipe, or a
// second line that isn't a delimiter row, means it was never a table at all
// (GFM falls back to a plain paragraph), not a partial one. The tail is
// "partial" only while still inside a genuine table-shaped run: a lone
// header row (delimiter row not arrived yet), a delimiter row cut off
// mid-write, or a body row cut off mid-cell.
function isPartialTable(text: string): boolean {
  const endsWithNewline = text.endsWith('\n')
  const lines = text.replace(/\n$/, '').split('\n')
  const last = lines[lines.length - 1] ?? ''
  if (!hasUnescapedPipe(last)) return false

  // Walk backwards from the last line to find the start of this contiguous
  // pipe-bearing run.
  let start = lines.length - 1
  while (start > 0 && hasUnescapedPipe(lines[start - 1] ?? '')) start--
  const rowCount = lines.length - start // rows in the run, including `last`

  if (rowCount === 1) {
    // Only a header row so far — the delimiter row may still be coming.
    return true
  }

  const delimiterLine = lines[start + 1] ?? ''
  if (rowCount === 2) {
    // `last` IS the delimiter-row candidate.
    if (!endsWithNewline && !DELIMITER_ROW_RE.test(last)) return true
    return false
  }

  // rowCount >= 3: delimiter row already settled — this must have matched,
  // or GFM would never have treated the run as a table in the first place.
  if (!DELIMITER_ROW_RE.test(delimiterLine)) return false

  // In body rows now: partial only if cut off mid-cell.
  return !endsWithNewline && !endsAtCellBoundary(last)
}

// Unmatched emphasis/strong delimiter runs (`*`, `_`, `**`, `__`) in the
// final line, ignoring escaped markers and content inside inline code spans.
function hasOpenEmphasis(text: string): boolean {
  const lastLine = text.split('\n').pop() ?? ''
  const stripped = lastLine.replace(/`[^`]*`/g, '') // drop inline code spans
  for (const marker of ['\\*\\*', '__', '\\*', '_']) {
    const re = new RegExp(`(?<!\\\\)${marker}`, 'g')
    const count = (stripped.match(re) ?? []).length
    if (count % 2 === 1) return true
  }
  return false
}

// A `[text](url` or bare `[text]` with no following `(` yet in the tail.
function hasOpenLink(text: string): boolean {
  const lastLine = text.split('\n').pop() ?? ''
  // Unterminated `(` after a completed `[...]`: "[text](partial-url" with no `)`.
  const openParenAfterBracket = /\[[^\]]*\]\([^)]*$/.test(lastLine)
  if (openParenAfterBracket) return true
  // An open `[` with no matching `]` yet.
  const bracketDepth =
    (stripEscaped(lastLine).match(/\[/g) ?? []).length -
    (stripEscaped(lastLine).match(/\]/g) ?? []).length
  return bracketDepth > 0
}

function stripEscaped(text: string): string {
  return text.replace(/\\[[\]]/g, '')
}

export function detectPartialConstruct(text: string): PartialConstructResult {
  if (hasOpenFence(text)) return { kind: 'open-fence' }
  if (isPartialTable(text)) return { kind: 'partial-table' }
  if (hasOpenLink(text)) return { kind: 'open-link' }
  if (hasOpenEmphasis(text)) return { kind: 'open-emphasis' }
  return { kind: 'none' }
}
