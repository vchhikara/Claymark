import type { ReactElement, ReactNode } from 'react'

export interface InlineCodeProps {
  children: ReactNode
}

// File-extension suffixes that read as a CSS/measurement unit rather than
// a file extension, so a token like "0.85em" isn't mistaken for a filename.
const UNIT_SUFFIX = /(?:em|rem|px|%|deg|vh|vw|ms|fr)$/i

// A bare "word.ext" (optionally with a trailing ":line", as in Claude's own
// file:line references) — e.g. "claymark.css", "tokens.css:70".
const FILENAME = /^[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,4}(:\d+)?$/

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node !== null && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

// Distinguishes a file path/filename reference (rendered plain, no pill)
// from a literal value — a number, CSS value, or hex color — which keeps
// the pill treatment. Paths (containing "/") and bare filenames are
// references; everything else, including unit-suffixed values like
// "0.85em" that would otherwise look like a filename, is a value.
function isReference(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.includes('/')) return true
  return FILENAME.test(trimmed) && !UNIT_SUFFIX.test(trimmed)
}

export function InlineCode({ children }: InlineCodeProps): ReactElement {
  const className = isReference(extractText(children)) ? 'claymark-code-ref' : 'claymark-code-inline'
  return <code className={className}>{children}</code>
}
