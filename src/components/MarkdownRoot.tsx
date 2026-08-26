import type { ReactElement, ReactNode } from 'react'

export interface MarkdownRootProps {
  children: ReactNode
  theme?: 'light' | 'dark'
}

export function MarkdownRoot({ children, theme }: MarkdownRootProps): ReactElement {
  return (
    <div className="claymark-root" data-theme={theme}>
      {children}
    </div>
  )
}
