import { isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

// DEF-001 (knip dead-export audit): not part of the public API (only
// src/components/index.ts's re-exports are), and never imported outside
// this file — de-exported.
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

const TAGS: Record<HeadingLevel, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

// DEF-001: not part of the public API, never imported outside this file.
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    return textOf(props.children)
  }
  return ''
}

export interface HeadingProps {
  level: HeadingLevel
  id?: string
  children: ReactNode
}

export function Heading({ level, id, children }: HeadingProps): ReactElement {
  const Tag = TAGS[level]
  return (
    <Tag id={id ?? slugify(textOf(children))} className={`claymark-heading claymark-h${level}`}>
      {children}
    </Tag>
  )
}
