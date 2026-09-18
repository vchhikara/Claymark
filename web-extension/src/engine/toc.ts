// Phase 4.2 (android-to-desktop-checklist.md §5): TOC/outline derivation.
// No existing `collectHeadings` utility exists in src/pipeline/ (checked
// fast-path.ts and the commonmark processor — headings are handled inline
// during hast conversion with no separate collection pass) — this is a
// standalone ATX-heading walker over the raw source text, not a second
// parallel parser of the full CommonMark grammar.
export interface HeadingEntry {
  level: number
  text: string
  line: number
}

const ATX_HEADING = /^(#{1,6})\s+(.*)$/

export function collectHeadings(source: string): HeadingEntry[] {
  const lines = source.split('\n')
  const headings: HeadingEntry[] = []
  let inFence = false

  lines.forEach((line, index) => {
    if (/^```|^~~~/.test(line.trim())) {
      inFence = !inFence
      return
    }
    if (inFence) return

    const match = ATX_HEADING.exec(line)
    if (match) {
      headings.push({ level: match[1]!.length, text: match[2]!.trim(), line: index })
    }
  })

  return headings
}
