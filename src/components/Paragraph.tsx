import type { ReactElement, ReactNode } from 'react'

export interface ParagraphProps {
  children: ReactNode
}

export function Paragraph({ children }: ParagraphProps): ReactElement {
  return <p className="claymark-p">{children}</p>
}

// DEF-001 (knip dead-export audit): the exported `Text`/`TextProps` pair
// that used to live here (a bare `<span>` wrapper) was never referenced by
// DEFAULT_COMPONENTS or anything else in src/ or tests/. Removed.
