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
      {/* T-P8-04: a horizontally-overflowing region with no interactive
          descendant (a static <pre>/<code>) is otherwise unreachable by
          keyboard — Tab skips straight over it, so arrow/PageUp/PageDown
          scrolling is mouse/touch-only. tabIndex=0 + role="region" makes it
          a focusable, keyboard-scrollable landmark. */}
      <div className="claymark-codeblock-scroll" tabIndex={0} role="region" aria-label={`${language} code`}>
        {children}
      </div>
    </div>
  )
}
