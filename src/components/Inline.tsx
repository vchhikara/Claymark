import type { ReactElement, ReactNode } from 'react'

export interface StrongProps {
  children: ReactNode
}

export function Strong({ children }: StrongProps): ReactElement {
  return <strong className="claymark-strong">{children}</strong>
}

export interface EmphasisProps {
  children: ReactNode
}

export function Emphasis({ children }: EmphasisProps): ReactElement {
  return <em className="claymark-em">{children}</em>
}
