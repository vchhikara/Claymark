import type { ReactElement, ReactNode } from 'react'
import { CopyButton } from './CopyButton'

export interface CodeBlockProps {
  language: string
  // FR-4.4/T-P4-05: raw fence source text, passed straight through to
  // CopyButton — never the highlighted HTML rendered as `children`.
  text?: string
  children: ReactNode
}

// FR-4.5: horizontal overflow scrolls within the block, never the page — the
// highlighted `pre`/`code` (already produced by the code.ts pipeline plugin)
// is passed through as children, wrapped only in header chrome and a scroll
// container.
export function CodeBlock({ language, text, children }: CodeBlockProps): ReactElement {
  return (
    <div className="claymark-codeblock">
      <div className="claymark-codeblock-header">
        <span className="claymark-codeblock-lang">{language}</span>
        <CopyButton text={text ?? ''} />
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
