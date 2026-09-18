import type { ReactElement, ReactNode } from 'react'
import { useRoute } from '../routing'

// Phase 3.2 (android-to-desktop-checklist.md §1): shared shell for
// Settings/Help/About/Privacy — back-arrow + title header, 1px hairline
// divider, scrolling body. Written once, reused by all four sub-screens.
export interface ScreenShellProps {
  title: string
  children: ReactNode
}

export function ScreenShell({ title, children }: ScreenShellProps): ReactElement {
  const { back } = useRoute()
  return (
    <div className="pb-screen-shell" style={{ maxWidth: 'var(--measure)', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid hsl(var(--border-subtle))',
        }}
      >
        <button
          type="button"
          aria-label="Back"
          data-testid="screen-back"
          onClick={back}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize: '1rem',
            color: 'hsl(var(--text-primary))',
          }}
        >
          ←
        </button>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            fontSize: '1.125rem',
          }}
        >
          {title}
        </h1>
      </header>
      <div style={{ padding: 'var(--space-5)', overflowY: 'auto' }}>{children}</div>
    </div>
  )
}
