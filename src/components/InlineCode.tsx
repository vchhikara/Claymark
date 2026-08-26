import type { ReactElement, ReactNode } from 'react'

export interface InlineCodeProps {
  children: ReactNode
}

export function InlineCode({ children }: InlineCodeProps): ReactElement {
  return <code className="claymark-code-inline">{children}</code>
}
