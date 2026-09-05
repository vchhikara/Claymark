import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import DOMPurify from 'dompurify'
import { Alert, AlertDescription, AlertTitle } from './Alert'
import { Skeleton } from './Skeleton'

export interface MermaidDiagramProps {
  // Raw diagram source (the fence content) — never pre-parsed HTML.
  source: string
}

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `claymark-mermaid-${idCounter}`
}

// T-P5-08: some invalid/pathological diagram source can make mermaid.render
// hang rather than reject (observed directly against mermaid@10.9.1, outside
// this component, independent of React) — from the user's perspective a hang
// is indistinguishable from a crash (an unbounded pending state). A bounded
// timeout turns that into the same fail-closed fallback as a thrown error.
const RENDER_TIMEOUT_MS = 5000

// A mermaid fence streamed in token-by-token is, for most of its lifetime, a
// syntactically incomplete diagram (CommonMark auto-closes an unterminated
// fence at EOF, so `findMermaidSource` in map.tsx hands this component real
// but truncated source on every intermediate append) — mermaid.render()
// reliably throws a parse error on that partial text, even though the block
// self-heals the instant the closing fence arrives. Surfacing that as an
// immediate error flashes "Diagram failed to render" for the diagram's
// entire streaming duration, reading as permanently broken. Holding a
// failure for this long before showing it gives the next append a chance to
// arrive and cancel it (effect cleanup below) — long enough to cover normal
// inter-token gaps, short enough that a genuinely broken final diagram still
// reports promptly.
const ERROR_DEBOUNCE_MS = 800

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Mermaid render exceeded ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

// T-P5-05: Mermaid (~400 KB gz, docs/ARCHITECTURE.md §6) is reached only
// through this dynamic `import('mermaid')` inside an effect — DOM access and
// the diagram render both happen client-side only, after mount, so this
// component still renders (as its fallback state) under `react-dom/server`
// (DEC-013 SSR contract) and never pulls Mermaid into a server or initial
// client bundle.
export function MermaidDiagram({ source }: MermaidDiagramProps): ReactElement {
  const idRef = useRef(nextId())
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let errorTimer: ReturnType<typeof setTimeout> | undefined
    setSvg(null)
    setError(null)

    async function renderDiagram(): Promise<void> {
      try {
        const { default: mermaid } = await import('mermaid')
        // T-P5-06: fail-closed config — strict security level rejects
        // click/script bindings and raw HTML in labels outright.
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          htmlLabels: false,
        })
        const { svg: rendered } = await withTimeout(
          mermaid.render(idRef.current, source),
          RENDER_TIMEOUT_MS,
        )
        // T-P5-07: mermaid's own `render()` already runs DOMPurify internally
        // for any non-"loose" security level (see mermaid's render$1, which
        // skips its DOMPurify.sanitize call only when isLooseSecurityLevel is
        // true) — but this project never relies on a single upstream
        // sanitizer alone for XSS-critical output (see the same defense-in-
        // depth stance in sanitize-schema.ts for KaTeX's `href`). Sanitizing
        // again here, explicitly, as an SVG document, is this component's own
        // last line of defense before insertion.
        //
        // `ADD_TAGS: ['foreignObject']` works around a DOMPurify quirk: its
        // built-in `svg`/`html` profiles store the tag name lowercased
        // ("foreignobject"), which never matches the camelCase `foreignObject`
        // element mermaid actually emits (SVG tag names are case-sensitive),
        // so without this the entire node-label subtree — legitimate text
        // included — gets silently dropped.
        //
        // T-P8-07 (dependency audit → dompurify 3.1.4 → 3.4.14): newer
        // DOMPurify hardened cross-namespace mixing (the mXSS class several
        // of the audited advisories were about) and now drops HTML-namespace
        // content inside a foreignObject unless the tag is declared an
        // "HTML integration point" — the same mechanism MathML's
        // `annotation-xml` already used by default. `foreignobject` (lower-
        // cased, matching DOMPurify's own internal casing) opts the mermaid
        // label markup back in. Re-verified this still strips every real
        // injection vector on the new version: a raw `<script>`, an
        // `onload`/`onerror` attribute, and a smuggled second
        // `foreignObject><body onload=…>`.
        //
        // `HTML_INTEGRATION_POINTS` is a real, documented DOMPurify option
        // (verified directly against the installed 3.4.14 runtime — see the
        // comment above) that the bundled `.d.ts` for this version simply
        // hasn't caught up to yet; the cast below is scoped to this one
        // option, not a blanket type-safety opt-out.
        const cleaned = DOMPurify.sanitize(rendered, {
          USE_PROFILES: { svg: true, svgFilters: true, html: true },
          ADD_TAGS: ['foreignObject'],
          ...({ HTML_INTEGRATION_POINTS: { foreignobject: true } } as Record<string, unknown>),
        })
        if (!cancelled) setSvg(cleaned)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (!cancelled) {
          errorTimer = setTimeout(() => {
            if (!cancelled) setError(message)
          }, ERROR_DEBOUNCE_MS)
        }
      }
    }

    void renderDiagram()
    return () => {
      cancelled = true
      clearTimeout(errorTimer)
    }
  }, [source])

  if (error) {
    // T-P5-08: invalid diagram source degrades to a visible error, never a
    // crash — the raw source stays available underneath it (never lost, per
    // the original fallback's intent), just no longer silent.
    return (
      <Alert variant="destructive" className="claymark-mermaid-fallback-alert">
        <AlertTitle>Diagram failed to render</AlertTitle>
        <AlertDescription>
          <p>{error}</p>
          <pre className="claymark-mermaid-fallback">
            <code>{source}</code>
          </pre>
        </AlertDescription>
      </Alert>
    )
  }

  if (!svg) {
    // Reserves final layout height is out of scope here (no fixed aspect
    // ratio is knowable before render); a neutral placeholder avoids a blank
    // gap while the lazy import and render are in flight.
    return (
      <Skeleton
        className="claymark-mermaid claymark-mermaid-pending"
        style={{ height: '8rem', width: '100%' }}
        aria-busy="true"
      />
    )
  }

  return (
    <div
      className="claymark-mermaid"
      // T-P8-05: the rendered SVG is a rasterized graph with no inherent
      // text alternative — mermaid does not emit a <title>/<desc>, so
      // without this a screen reader announces nothing at all for the
      // diagram. The raw diagram source (the fence content) is the only
      // description available to this component; it's what a sighted user
      // would fall back to reading anyway if the diagram failed to render
      // (see the `error` branch above), so it's used verbatim here too.
      role="img"
      aria-label={source}
      // eslint-disable-next-line react/no-danger -- svg is produced by this
      // component's own render path and sanitized before being stored (T-P5-07).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
