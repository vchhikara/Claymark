import type { ReactElement, ReactNode } from 'react'

export interface ParagraphProps {
  children: ReactNode
}

export function Paragraph({ children }: ParagraphProps): ReactElement {
  return <p className="claymark-p">{children}</p>
}

export interface TextProps {
  children: ReactNode
}

export function Text({ children }: TextProps): ReactElement {
  return <span className="claymark-text">{children}</span>
}
