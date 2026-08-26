import type { ReactElement, ReactNode } from 'react'

export interface BlockquoteProps {
  children: ReactNode
}

export function Blockquote({ children }: BlockquoteProps): ReactElement {
  return <blockquote className="claymark-blockquote">{children}</blockquote>
}
