import type { ReactElement, ReactNode } from 'react'

export interface CodeBlockProps {
  language: string
  children: ReactNode
}

// FR-4.5: horizontal overflow scrolls within the block, never the page — the
// highlighted `pre`/`code` (already produced by the code.ts pipeline plugin)
// is passed through as children, wrapped only in header chrome and a scroll
// container. Wiring into the component map is a later task.
export function CodeBlock({ language, children }: CodeBlockProps): ReactElement {
  return (
    <div className="claymark-codeblock">
      <div className="claymark-codeblock-header">
        <span className="claymark-codeblock-lang">{language}</span>
      </div>
      <div className="claymark-codeblock-scroll">{children}</div>
    </div>
  )
}
