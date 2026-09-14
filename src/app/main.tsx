import { createRoot } from 'react-dom/client'
import { cloneElement, useEffect, useRef, useState } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'
import { MarkdownRoot } from '../components/MarkdownRoot'
import { Button } from '../components/Button'
import { useStreamingMarkdown } from '../hooks/useStreamingMarkdown'
import { useDocumentSession } from '../hooks/useDocumentSession'

// A short, hand-written sample (not a bench/corpus/ fixture — those are
// synthetic benchmark filler, not fit for a first impression) that exercises
// headings, a list, a fenced code block, a table, and a link, so the reader
// visibly demonstrates the default component map on first load. Shown ONLY
// in the no-document state (never overlaid on a real opened file) — per the
// Tauri/PWA audit §47, a demo must never masquerade as the user's content.
const SAMPLE_MD = `# claymark

A Markdown renderer built for **streamed, untrusted LLM output**.

## What it renders

- CommonMark + GFM (tables, task lists, strikethrough)
- Syntax-highlighted code
- Math and Mermaid diagrams

\`\`\`typescript
import { processor, toReact } from 'claymark'

const tree = processor.parse(source)
const hast = await processor.run(tree)
\`\`\`

| Feature | Status |
| --- | --- |
| Streaming | ✅ |
| Sanitization | ✅ |
| Theming | ✅ |

Tap **Open file** above to open your own Markdown file.
`

const PERSIST_LABEL: Record<string, string> = {
  save: 'Save',
  'save-as': 'Save as',
  'download-copy': 'Download copy',
}

// Reference reader app: the primary job is VIEWING a Markdown file fast —
// see progress.md's "Product priority" — with an Edit mode present but
// deliberately secondary (a single header action, a plain textarea, never
// stacked with the preview). This is the entry point for both the PWA
// (`vite build --mode app`) and the Tauri desktop/Android shells.
function Reader() {
  const session = useDocumentSession()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const demo = useStreamingMarkdown(session.mode === 'no-document' ? SAMPLE_MD : '')
  const openDoc = useStreamingMarkdown(session.mode !== 'no-document' && session.mode !== 'editing' ? session.text : '')
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const onScroll = (): void => {
      setShowScrollTop(window.scrollY > 400)
      // Reading-progress bar (src/theme/claymark.css's .claymark-progress-*):
      // fraction of the document already scrolled past, 0 when the page
      // doesn't scroll at all (scrollHeight === innerHeight). A View-mode
      // element (see progress.md) — unaffected by Edit-mode work.
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setReadProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0)
    }
    onScroll() // set the initial value — a reload can land mid-scroll (hash link, restored position)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Ctrl/Cmd+O open, Ctrl/Cmd+S save — audit §33. Only intercepted when
  // Claymark actually handles the shortcut (a document is loaded for Save);
  // never overrides copy/paste/select-all.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key === 'o') {
        event.preventDefault()
        void session.openFile()
      } else if (event.key === 's' && session.mode === 'editing') {
        event.preventDefault()
        void session.save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [session])

  const isEditing = session.mode === 'editing' || session.mode === 'saving' || session.mode === 'save-failed'
  const hasDocument = session.mode !== 'no-document'
  const elements = session.mode === 'no-document' ? demo.elements : openDoc.elements

  return (
    <ThemeProvider>
      <div className="claymark-progress-track" aria-hidden="true">
        <div className="claymark-progress-fill" style={{ height: `${readProgress * 100}%` }} />
      </div>

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10, // matches --z-header (tokens.css) — React's CSSProperties
          // types zIndex as number, so this can't reference the custom
          // property directly the way the rest of this file does.
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          rowGap: 'var(--space-2)',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
          paddingBlock: 'var(--space-3) var(--space-4)',
          background: 'hsl(var(--surface))',
          borderBottom: '1px solid hsl(var(--border-subtle))',
        }}
      >
        {isEditing ? (
          <>
            <Button type="button" variant="outline" className="claymark-button--compact" onClick={session.backToPreview}>
              ← Back to preview
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                {session.ref?.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }} aria-live="polite">
                {session.saveStatus === 'dirty' && 'Unsaved changes'}
                {session.saveStatus === 'saving' && 'Saving…'}
                {session.saveStatus === 'saved' && 'Saved'}
                {session.saveStatus === 'failed' && 'Save failed'}
                {session.saveStatus === 'clean' && 'No changes'}
              </p>
            </div>
            {
              // Audit's three distinct P0 save actions (progress.md "Product
              // priority"): Save, Save as, and Download copy. The primary
              // button's label already adapts via PERSIST_LABEL for both the
              // write-back-impossible case (persistAction === 'download-copy'
              // means Save *is* the honest download-copy action) and the
              // no-persisted-write-grant case (persistAction === 'save-as' —
              // real-device finding: a document opened via Android's
              // MediaDocumentsProvider route has no writable location, so
              // isKnownNonWritableUri() in tauri.ts makes this reachable).
              // Only offer the dedicated Save-as button as a *second*, real
              // alternative when the primary button is doing something
              // different (an in-place Save) — otherwise both buttons read
              // "Save as" and trigger the identical action.
              session.persistAction === 'save' && (
                <Button
                  type="button"
                  variant="outline"
                  className="claymark-button--compact"
                  disabled={session.mode === 'saving'}
                  onClick={() => void session.saveAs()}
                >
                  Save as…
                </Button>
              )
            }
            <Button
              type="button"
              variant="outline"
              className="claymark-button--compact"
              disabled={session.mode === 'saving'}
              onClick={() =>
                void (session.persistAction === 'download-copy' ? session.downloadCopy() : session.save())
              }
            >
              {PERSIST_LABEL[session.persistAction ?? 'save']}
            </Button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: hasDocument ? 600 : 400,
                  letterSpacing: hasDocument ? 'normal' : '0.08em',
                  textTransform: hasDocument ? 'none' : 'uppercase',
                  color: hasDocument ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasDocument ? session.ref?.name : 'Claymark'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="outline"
                className="claymark-button--compact"
                aria-label="Open file"
                onClick={() => void session.openFile()}
              >
                Open file
              </Button>
              {hasDocument && (
                <Button
                  type="button"
                  variant="outline"
                  className="claymark-button--compact"
                  aria-label="Edit document"
                  onClick={session.startEdit}
                >
                  Edit
                </Button>
              )}
              <ThemeToggle compact />
            </div>
          </>
        )}
      </header>

      {session.recoveredDraft && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--radius-md)',
            background: 'hsl(var(--surface-raised))',
            fontSize: '0.8125rem',
          }}
        >
          <span>Recovered unsaved changes from a previous session.</span>
          <Button type="button" variant="outline" className="claymark-button--compact" onClick={session.discardRecoveredDraft}>
            Discard
          </Button>
        </div>
      )}

      {session.saveStatus === 'failed' && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            border: '1px solid hsl(var(--danger, 0 70% 50%))',
            borderRadius: 'var(--radius-md)',
            background: 'hsl(var(--surface-raised))',
            fontSize: '0.8125rem',
          }}
        >
          <span>Couldn&rsquo;t save {session.ref?.name}. {session.saveError}</span>
          <Button
            type="button"
            variant="outline"
            className="claymark-button--compact"
            onClick={() => void (session.persistAction === 'download-copy' ? session.downloadCopy() : session.save())}
          >
            Retry
          </Button>
        </div>
      )}

      {isEditing ? (
        <textarea
          ref={editorRef}
          aria-label="Markdown source"
          className="cm-source-textarea"
          value={session.text}
          onChange={(event) => session.updateText(event.target.value)}
          disabled={session.mode === 'saving'}
          style={{
            display: 'block',
            width: '100%',
            // Full-screen editor, no stacked preview, no resize handle
            // (audit §30) — fills the content area below the header.
            minHeight: 'calc(100vh - 8rem)',
            resize: 'none',
            font: 'var(--text-code)/1.5 var(--font-mono)',
            boxSizing: 'border-box',
            background: 'hsl(var(--surface-raised))',
            color: 'hsl(var(--text-primary))',
            border: '1px solid hsl(var(--border-subtle))',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
          }}
        />
      ) : (
        <MarkdownRoot>
          {
            // FR-3.3 monotonicity means a block's position is stable once
            // emitted, so an index key is safe here — only the trailing
            // (still-open) block's element is ever replaced in place.
            elements.map((element, index) => cloneElement(element, { key: index }))
          }
        </MarkdownRoot>
      )}

      {showScrollTop && !isEditing && (
        <button
          type="button"
          aria-label="Scroll to top"
          className="claymark-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}

      {session.pendingAbandon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unsaved changes"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'hsl(0 0% 0% / 0.4)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'hsl(var(--surface))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              maxWidth: '22rem',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <p style={{ margin: 0 }}>Save changes to {session.ref?.name}?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="outline" className="claymark-button--compact" onClick={() => void session.resolveAbandon('cancel')}>
                Cancel
              </Button>
              <Button type="button" variant="outline" className="claymark-button--compact" onClick={() => void session.resolveAbandon('discard')}>
                Discard
              </Button>
              <Button type="button" variant="outline" className="claymark-button--compact" onClick={() => void session.resolveAbandon('save')}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </ThemeProvider>
  )
}

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<Reader />)
}

// T-P9-02: register the offline service worker (built only for the
// `app`-mode demo build — see vite.config.ts's second rollup input).
// Registration is safe to attempt in dev too: the fetch fails harmlessly
// (404 on /sw.js under the library's dev server) and is swallowed below.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // no-op: absent under `vite dev`/lib-mode builds where sw.js isn't emitted
    })
  })
}
