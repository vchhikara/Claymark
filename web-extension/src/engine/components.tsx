/**
 * FR-2.2: every Markdown node maps to an overridable component.
 * No component uses dangerouslySetInnerHTML (FR-2.1).
 */
import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Element, ElementContent } from 'hast'
import { resolveLang } from './lang-registry'
import type { ThemedToken } from 'shiki/core'
const tokenize = (code: string, lang: string) => import('./highlighter').then((m) => m.tokenize(code, lang))
import { renderMermaid } from './mermaid'
import { useThemeInfo } from './theme-context'

type P = { node?: Element; children?: ReactNode; className?: string; [k: string]: any }

function strip({ node, ...rest }: P) {
  return rest
}
function textContent(node: ElementContent | undefined): string {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if ('children' in node) return node.children.map((c) => textContent(c as ElementContent)).join('')
  return ''
}
const cx = (...c: (string | undefined | false)[]) => c.filter(Boolean).join(' ')

/* ---------- headings / prose ---------- */
const heading = (lvl: number) =>
  function H(p: P) {
    const Tag = `h${lvl}` as 'h1'
    return <Tag {...strip(p)} className={cx(`claymark-h${lvl}`, p.className)} />
  }

function Paragraph(p: P) {
  // A paragraph that contains only an image is rendered as a figure by <Img>;
  // a <figure> can't live inside <p>, so unwrap it.
  const kids = (p.node?.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()))
  if (kids.length === 1 && kids[0]!.type === 'element' && kids[0]!.tagName === 'img') return <>{p.children}</>
  return <p {...strip(p)} className="claymark-p" />
}

function Anchor(p: P) {
  const { href } = p
  if (!href) return <span className="claymark-link" data-blocked-url="true">{p.children}</span>
  return <a {...strip(p)} className={cx('claymark-link', p.className)} />
}

/* ---------- inline code: value pill vs file reference ---------- */
const REF = /[\\/]|^[\w.-]*[A-Za-z_-][\w-]*\.[A-Za-z][A-Za-z0-9]{0,6}$/
function isReference(text: string) {
  return !/\s/.test(text) && REF.test(text) && !/^\.?[\d.]+$/.test(text)
}

function Code(p: P) {
  const cls = String(p.className ?? '')
  if (cls.includes('language-math')) return <code className="claymark-math-pending">{p.children}</code>
  if (cls.includes('katex')) return <code {...strip(p)} />
  const text = textContent(p.node)
  return <code className={isReference(text) ? 'claymark-code-ref' : 'claymark-code-inline'}>{p.children}</code>
}

/* ---------- fenced code ---------- */
function parseMeta(meta: string | undefined) {
  const lines = new Set<number>()
  const m = /\{([\d,\s-]+)\}/.exec(meta ?? '')
  if (m) {
    for (const part of m[1]!.split(',')) {
      const [a, b] = part.trim().split('-').map(Number)
      if (!a) continue
      for (let i = a; i <= (b || a); i++) lines.add(i)
    }
  }
  return { highlight: lines, numbers: /\bshowLineNumbers\b|\blineNumbers\b/.test(meta ?? '') }
}

function styleFrom(s: string | undefined): React.CSSProperties | undefined {
  if (!s) return undefined
  const out: Record<string, string> = {}
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const k = decl.slice(0, i).trim()
    const v = decl.slice(i + 1).trim()
    out[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v
  }
  return out as React.CSSProperties
}

export function CodeBlock({ code, lang, meta }: { code: string; lang?: string; meta?: string }) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let live = true
    if (lang && resolveLang(lang)) tokenize(code, lang).then((t) => live && setTokens(t)).catch(() => {})
    else setTokens(null)
    return () => {
      live = false
    }
  }, [code, lang])

  const { highlight, numbers } = parseMeta(meta)
  const lines = tokens ?? code.split('\n').map((l) => [{ content: l, htmlStyle: undefined as any }])
  // CommonMark keeps the final newline out of the code text; drop a trailing empty line if present.
  if (lines.length > 1 && lines[lines.length - 1]!.every((t: any) => t.content === '')) lines.pop()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code) // FR-4.3: byte-identical source
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard denied — no-op */
    }
  }

  return (
    <figure className="claymark-codeblock claymark-code-figure">
      <div className="claymark-codeblock-header">
        {lang && lang !== 'text' && <span className="claymark-codeblock-lang">{lang}</span>}
        <button
          type="button"
          className="claymark-copy-button"
          data-state={copied ? 'copied' : 'idle'}
          onClick={copy}
          aria-label="Copy code to clipboard"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="claymark-codeblock-scroll">
        <pre className="claymark-pre" tabIndex={0} data-numbers={numbers || undefined}>
          <code className="claymark-code-block" data-theme={tokens ? 'light dark' : undefined}>
            {lines.map((line: any[], i: number) => (
              <span
                key={i}
                className={cx('claymark-line', highlight.has(i + 1) && 'claymark-line--hl')}
                data-line={numbers ? i + 1 : undefined}
              >
                {line.map((t, j) => (
                  <span key={j} style={styleFrom(t.htmlStyle)}>
                    {t.content}
                  </span>
                ))}
                {i < lines.length - 1 ? '\n' : ''}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  )
}

function Pre(p: P) {
  const code = p.node?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code')
  if (!code) return <pre className="claymark-pre">{p.children}</pre>
  const classes = ([] as string[]).concat((code.properties?.className as string[]) ?? [])
  if (classes.includes('math-display')) return <div className="claymark-math-pending claymark-math-pending--display">{textContent(code)}</div>
  if (classes.some((c) => c === 'katex-display')) return <>{p.children}</>
  const lang = classes.find((c) => c.startsWith('language-'))?.slice(9)
  const text = textContent(code)
  if (lang === 'mermaid') return <Mermaid code={text} />
  return <CodeBlock code={text} lang={lang} meta={p.node?.properties?.dataMeta as string | undefined} />
}

/* ---------- mermaid: rendered to an isolated <img> ---------- */
export function Mermaid({ code }: { code: string }) {
  const { effective } = useThemeInfo()
  const [state, setState] = useState<{ url?: string; error?: string; w?: number; h?: number }>({})
  useEffect(() => {
    let live = true
    let url: string | undefined
    const t = setTimeout(() => {
      renderMermaid(code, effective === 'dark')
        .then((r) => {
          if (!live) return
          url = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' }))
          setState({ url, w: r.width, h: r.height })
        })
        .catch((e) => live && setState({ error: String(e?.message ?? e) }))
    }, 150) // debounce while typing
    return () => {
      live = false
      clearTimeout(t)
      if (url) URL.revokeObjectURL(url)
    }
  }, [code, effective])

  if (state.error)
    return (
      <div className="claymark-mermaid claymark-mermaid--error" role="group" aria-label="Diagram (could not render)">
        <div className="claymark-alert" data-variant="destructive">
          <div className="claymark-alert-title">Diagram could not be rendered</div>
          <div className="claymark-alert-description">{state.error.split('\n')[0]}</div>
        </div>
        <CodeBlock code={code} lang="text" />
      </div>
    )
  if (!state.url) return <div className="claymark-skeleton claymark-mermaid-skeleton" aria-label="Rendering diagram" />
  return (
    <figure className="claymark-figure claymark-mermaid">
      <img
        className="claymark-img"
        src={state.url}
        width={state.w}
        height={state.h}
        alt={`Diagram: ${code.split('\n').slice(0, 3).join(' ').slice(0, 160)}`}
      />
    </figure>
  )
}

/* ---------- tables with scroll-edge indicators (FR-5.2) ---------- */
function Table(p: P) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      el.dataset.overflowLeft = String(el.scrollLeft > 1)
      el.dataset.overflowRight = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])
  return (
    <div className="claymark-table-scroll" ref={ref} tabIndex={0} role="region" aria-label="Table">
      <table className="claymark-table">{p.children}</table>
    </div>
  )
}

/* ---------- images (FR-5.1: caption + lightbox) ---------- */
function Img(p: P) {
  const [open, setOpen] = useState(false)
  const { src, alt, title } = p
  if (!src) return <span className="claymark-img-blocked">[image removed: unsafe URL]</span>
  if (/^https?:/i.test(src)) {
    // LEDGER X-017: remote images would be a network request (NFR-1.6) and a
    // tracking/exfiltration channel for untrusted LLM output.
    return (
      <figure className="claymark-figure claymark-img-remote">
        <div className="claymark-img-placeholder">
          <span aria-hidden="true">🖼</span> Remote image not loaded
          <span className="claymark-img-placeholder-url">{src}</span>
        </div>
        {(title || alt) && <figcaption className="claymark-figcaption">{title || alt}</figcaption>}
      </figure>
    )
  }
  return (
    <figure className="claymark-figure">
      <button type="button" className="claymark-img-button" onClick={() => setOpen(true)} aria-label={`Enlarge image${alt ? ': ' + alt : ''}`}>
        <img className="claymark-img" src={src} alt={alt ?? ''} />
      </button>
      {title && <figcaption className="claymark-figcaption">{title}</figcaption>}
      {open && <Lightbox src={src} alt={alt} title={title} onClose={() => setOpen(false)} />}
    </figure>
  )
}

function Lightbox({ src, alt, title, onClose }: { src: string; alt?: string; title?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onClose])
  return (
    <div className="claymark-lightbox-backdrop" onClick={onClose}>
      <div className="claymark-lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Image'} tabIndex={-1} ref={ref}>
        <img src={src} alt={alt ?? ''} className="claymark-lightbox-img" />
        {title && <div className="claymark-lightbox-caption">{title}</div>}
      </div>
    </div>
  )
}

/* ---------- lists ---------- */
function Ul(p: P) {
  return <ul {...strip(p)} className={cx('claymark-list claymark-ul', p.className)} />
}
function Ol(p: P) {
  return <ol {...strip(p)} className={cx('claymark-list claymark-ol', p.className)} />
}
function Li(p: P) {
  const task = String(p.className ?? '').includes('task-list-item')
  return <li {...strip(p)} className={cx('claymark-li', task && 'claymark-task-item')} />
}
function Input(p: P) {
  if (p.type !== 'checkbox') return null
  return <input type="checkbox" checked={!!p.checked} disabled readOnly className="claymark-task-checkbox" aria-label={p.checked ? 'Done' : 'Not done'} />
}

export const DEFAULT_COMPONENTS = {
  h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
  p: Paragraph,
  a: Anchor,
  code: Code,
  pre: Pre,
  table: Table,
  thead: (p: P) => <thead className="claymark-thead">{p.children}</thead>,
  tbody: (p: P) => <tbody className="claymark-tbody">{p.children}</tbody>,
  tr: (p: P) => <tr className="claymark-tr">{p.children}</tr>,
  th: (p: P) => <th className="claymark-th" data-align={p.align}>{p.children}</th>,
  td: (p: P) => <td className="claymark-td" data-align={p.align}>{p.children}</td>,
  img: Img,
  ul: Ul,
  ol: Ol,
  li: Li,
  input: Input,
  blockquote: (p: P) => <blockquote className="claymark-blockquote">{p.children}</blockquote>,
  hr: () => <hr className="claymark-rule" />,
  del: (p: P) => <del className="claymark-del">{p.children}</del>,
  strong: (p: P) => <strong className="claymark-strong">{p.children}</strong>,
  em: (p: P) => <em className="claymark-em">{p.children}</em>,
}
