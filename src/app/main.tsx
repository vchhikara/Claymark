import { createRoot } from 'react-dom/client'
import { cloneElement, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'
import { MarkdownRoot } from '../components/MarkdownRoot'
import { Button } from '../components/Button'
import { Alert, AlertDescription, AlertTitle } from '../components/Alert'
import { useStreamingMarkdown } from '../hooks/useStreamingMarkdown'

// A short, hand-written sample (not a bench/corpus/ fixture — those are
// synthetic benchmark filler, not fit for a first impression) that exercises
// headings, a list, a fenced code block, a table, and a link, so the reader
// visibly demonstrates the default component map on first load.
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

Try replacing this text in the box below — see [\`docs/API.md\`](https://github.com/vchhikara/Claymark) for the full surface.
`

// Reference reader app: types out SAMPLE_MD through useStreamingMarkdown so
// the streaming/monotonic-rendering behavior is visible on load, then hands
// control to a plain textarea so a human can paste their own Markdown and
// see it re-render live. This is the entry point for both the PWA
// (`vite build --mode app`) and the Tauri desktop shell — it is the actual
// "read rendered documents" surface promised at SPEC.md §2, not just a demo
// of the theme toggle.
function Reader() {
  const [source, setSource] = useState('')
  const [editing, setEditing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const { elements } = useStreamingMarkdown(source)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopStreamingDemo = (): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Loads a dropped/selected .md/.markdown/.txt file's text into the editor,
  // stopping the sample-streaming timer the same way manual typing does.
  const loadFile = (file: File): void => {
    const reader = new FileReader()
    reader.onload = () => {
      setLoadError(null)
      stopStreamingDemo()
      setSource(typeof reader.result === 'string' ? reader.result : '')
    }
    // Previously unhandled: a read failure (permission error, file removed
    // mid-drag, unreadable encoding) left the UI silently doing nothing.
    reader.onerror = () => {
      setLoadError(`Couldn't read "${file.name}" — ${reader.error?.message ?? 'unknown error'}.`)
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const onScroll = (): void => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let i = 0
    // Reveal the sample a few characters at a time — mirrors the growth
    // pattern tests/useStreamingMarkdown.spec.tsx exercises against the hook
    // directly, but driven from a real UI so streaming is something a human
    // can actually watch happen rather than just a passing assertion.
    timerRef.current = setInterval(() => {
      i = Math.min(i + 3, SAMPLE_MD.length)
      setSource(SAMPLE_MD.slice(0, i))
      if (i >= SAMPLE_MD.length && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 15)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <ThemeProvider>
      {
        // T-UI-08: ThemeProvider already wraps its children in a
        // `.claymark-root` div (max-width/padding/typography — see
        // src/theme/claymark.css and ThemeProvider.tsx) — this used to
        // reapply the exact same max-width+padding on a second wrapper div
        // nested directly inside it. On a narrow (phone-width) viewport
        // that stacked padding was clearly visible as over-wide side
        // margins squeezing all content toward the centre. Layout below is
        // unwrapped so ThemeProvider's own container is the only one.
      }
      <>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid hsl(var(--border-subtle))',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'hsl(var(--text-muted))',
            }}
          >
            Claymark
          </p>
          <ThemeToggle compact />
        </header>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <Button
            type="button"
            variant="outline"
            className="claymark-button--compact"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Hide editor' : 'Write'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="claymark-button--compact"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            style={{ display: 'none' }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0]
              if (file) loadFile(file)
              event.target.value = '' // allow re-selecting the same file
            }}
          />
        </div>

        {loadError && (
          <Alert variant="destructive" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertTitle>Couldn't load file</AlertTitle>
            <AlertDescription>
              <p>{loadError}</p>
            </AlertDescription>
          </Alert>
        )}

        {editing && (
          <textarea
            aria-label="Markdown source"
            className="cm-source-textarea"
            value={source}
            onChange={(event) => {
              stopStreamingDemo()
              setSource(event.target.value)
            }}
            onDragOver={(event: DragEvent<HTMLTextAreaElement>) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event: DragEvent<HTMLTextAreaElement>) => {
              event.preventDefault()
              setDragOver(false)
              const file = event.dataTransfer.files?.[0]
              if (file) loadFile(file)
            }}
            placeholder="Type, paste, or drop a .md file here…"
            style={{
              width: '100%',
              minHeight: '10rem',
              marginBottom: 'var(--space-6)',
              font: 'var(--text-code)/1.5 var(--font-mono)',
              boxSizing: 'border-box',
              background: dragOver ? 'hsl(var(--surface))' : 'hsl(var(--surface-raised))',
              color: 'hsl(var(--text-primary))',
              border: `1px solid hsl(var(--border-${dragOver ? 'default' : 'subtle'}))`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              resize: 'vertical',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
          />
        )}

        <MarkdownRoot>
          {
            // FR-3.3 monotonicity means a block's position is stable once
            // emitted, so an index key is safe here — only the trailing
            // (still-open) block's element is ever replaced in place.
            elements.map((element, index) => cloneElement(element, { key: index }))
          }
        </MarkdownRoot>
      </>

      {showScrollTop && (
        <button
          type="button"
          aria-label="Scroll to top"
          className="claymark-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
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
