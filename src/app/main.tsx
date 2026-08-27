import { createRoot } from 'react-dom/client'
import { cloneElement, useEffect, useRef, useState } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ThemeToggle } from '../components/ThemeToggle'
import { MarkdownRoot } from '../components/MarkdownRoot'
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

\`\`\`ts
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
  const { elements } = useStreamingMarkdown(source)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            style={{ font: 'inherit', cursor: 'pointer' }}
          >
            {editing ? 'Hide editor' : 'Paste your own Markdown'}
          </button>
          <ThemeToggle />
        </div>

        {editing && (
          <textarea
            aria-label="Markdown source"
            value={source}
            onChange={(event) => {
              if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
              }
              setSource(event.target.value)
            }}
            style={{
              width: '100%',
              minHeight: '10rem',
              marginBottom: '1.5rem',
              font: 'inherit',
              boxSizing: 'border-box',
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
      </div>
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
