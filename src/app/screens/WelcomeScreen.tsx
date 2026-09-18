import type { ReactElement } from 'react'
import { BrandMark } from '../BrandMark'
import { useRoute } from '../routing'

// Phase 3.2 (android-to-desktop-checklist.md §1): cold-launch-only Welcome
// screen. Never shown for share/open-with launches (checklist §1) — callers
// construct the app at 'reader' directly for those, this component only
// renders when routing legitimately starts here.
export interface WelcomeScreenProps {
  onOpenFile: () => void
  onOpenDrawer: () => void
  sampleMarkdown: string
  onLoadSample: (markdown: string) => void
}

export function WelcomeScreen({
  onOpenFile,
  onOpenDrawer,
  sampleMarkdown,
  onLoadSample,
}: WelcomeScreenProps): ReactElement {
  const { navigate } = useRoute()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--space-6)',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <button
        type="button"
        aria-label="Menu"
        data-testid="welcome-hamburger"
        onClick={onOpenDrawer}
        style={{
          position: 'absolute',
          top: 'var(--space-5)',
          left: 'var(--space-5)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.25rem',
          color: 'hsl(var(--text-primary))',
        }}
      >
        ☰
      </button>

      <BrandMark size={64} />

      <p
        style={{
          maxWidth: '280px',
          textAlign: 'center',
          color: 'hsl(var(--text-muted))',
          fontFamily: 'var(--font-ui)',
          margin: 'var(--space-4) 0 var(--space-6)',
        }}
      >
        A Markdown renderer built for streamed, untrusted LLM output.
      </p>

      <button
        type="button"
        data-testid="welcome-open-file"
        onClick={onOpenFile}
        style={{
          width: '70%',
          padding: 'var(--space-3) var(--space-5)',
          background: 'var(--accent-brand)',
          color: 'hsl(var(--surface))',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Open file
      </button>

      <button
        type="button"
        data-testid="welcome-view-sample"
        onClick={() => {
          onLoadSample(sampleMarkdown)
          navigate('reader')
        }}
        style={{
          marginTop: 'var(--space-4)',
          background: 'none',
          border: 'none',
          color: 'var(--link)',
          textDecoration: 'underline',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
        }}
      >
        View sample
      </button>
    </div>
  )
}
