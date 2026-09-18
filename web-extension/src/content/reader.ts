/**
 * Content-script "reader mode" (checklist §0/§2 Trap 1).
 *
 * Runs only on pages matched in manifest.json (`*.md`/`*.markdown` URLs and
 * the raw-file hosts), and only actually activates when the page really is
 * raw Markdown: `document.contentType` is `text/plain`/`text/markdown` (how
 * a browser serves a `.md` file with no HTML wrapper). Anything else —
 * including an HTML page that merely has `.md` in its URL — is left alone.
 *
 * Threat model (Trap 1): this script runs inside a host page's live DOM,
 * which MV3 treats as fully untrusted. Rendered output goes into a
 * `attachShadow({ mode: 'closed' })` tree so the host page's own CSS/JS
 * cannot reach in and style-spoof or read the rendered content, and our
 * styles cannot leak back out onto the host page.
 */
import { toHast } from '../engine/pipeline'
import { toHtml } from 'hast-util-to-html'

declare const chrome: any

const MARKER = '__claymarkReaderInjected'
if (!(window as any)[MARKER] && looksLikeRawMarkdown()) {
  ;(window as any)[MARKER] = true
  void mount()
}

function looksLikeRawMarkdown(): boolean {
  const type = document.contentType
  if (type !== 'text/plain' && type !== 'text/markdown') return false
  // A `text/plain` hit still needs to look like the raw-file view (a single
  // top-level <pre>, which is how Chromium/Firefox render a plain-text
  // response) rather than some unrelated plain-text document; the manifest's
  // URL match (*.md, raw.githubusercontent.com, gist.githubusercontent.com)
  // already narrows this a lot, this is the remaining in-page check.
  const pre = document.body?.firstElementChild
  return type === 'text/markdown' || (pre?.tagName === 'PRE' && document.body.children.length === 1)
}

function extractSource(): string {
  const pre = document.body.querySelector('pre')
  return (pre ?? document.body).textContent ?? ''
}

async function mount(): Promise<void> {
  const source = extractSource()
  if (!source.trim()) return

  const { hast, outline } = toHast(source)
  const html = toHtml({ type: 'root', children: hast.children }, { allowDangerousHtml: false })

  const host = document.createElement('div')
  host.id = 'claymark-reader-host'
  const shadow = host.attachShadow({ mode: 'closed' })

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL('content/reader.css')
  shadow.appendChild(link)

  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches

  const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const wrap = document.createElement('div')
  wrap.className = 'cm-reader-page'
  wrap.dataset.theme = prefersDark ? 'dark' : 'light'
  wrap.innerHTML = `
    <header class="cm-reader-bar">
      <span class="cm-reader-brand">Claymark reader</span>
      <span class="cm-reader-outline">${outline.length} heading${outline.length === 1 ? '' : 's'}</span>
      <button type="button" class="cm-reader-toggle" id="cm-reader-raw-toggle">View raw</button>
    </header>
    <article class="claymark-root cm-reader-body" data-theme="${prefersDark ? 'dark' : 'light'}">${html}</article>
    <pre class="cm-reader-raw" hidden>${escaped}</pre>
  `
  shadow.appendChild(wrap)
  document.body.replaceChildren(host)
  document.body.classList.add('cm-reader-active')

  const toggle = shadow.getElementById('cm-reader-raw-toggle') as HTMLButtonElement | null
  const body = wrap.querySelector('.cm-reader-body') as HTMLElement
  const raw = wrap.querySelector('.cm-reader-raw') as HTMLElement
  toggle?.addEventListener('click', () => {
    const showingRaw = raw.hidden
    raw.hidden = !showingRaw
    body.hidden = showingRaw
    if (toggle) toggle.textContent = showingRaw ? 'View rendered' : 'View raw'
  })
}
