/**
 * FR-1.5 Mermaid. Rendering happens in a sandboxed iframe
 * (sandbox/mermaid.html, LEDGER X-022); the SVG string that comes back is shown
 * only through <img src="blob:"> where it can't run script (LEDGER X-018).
 */
type Result = { svg: string; width?: number; height?: number }
let frame: HTMLIFrameElement | null = null
let ready: Promise<void> | null = null
let nextId = 0
const waiting = new Map<number, { resolve: (r: Result) => void; reject: (e: Error) => void }>()

function ensureFrame(): Promise<void> {
  if (ready) return ready
  ready = new Promise((resolve) => {
    frame = document.createElement('iframe')
    frame.className = 'cm-mermaid-frame'
    frame.title = 'Diagram renderer'
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.src = '/sandbox/mermaid.html'
    window.addEventListener('message', (e) => {
      if (!frame || e.source !== frame.contentWindow) return
      const m = e.data ?? {}
      if (m.ready) return resolve()
      const w = waiting.get(m.id)
      if (!w) return
      waiting.delete(m.id)
      if (m.error) w.reject(new Error(m.error))
      else if (typeof m.svg === 'string') w.resolve({ svg: m.svg, width: m.width, height: m.height })
      else w.reject(new Error('Bad response from diagram renderer'))
    })
    document.body.appendChild(frame)
  })
  return ready
}

export async function renderMermaid(code: string, dark: boolean): Promise<Result> {
  await ensureFrame()
  const id = ++nextId
  return new Promise<Result>((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    frame!.contentWindow!.postMessage({ id, code, dark }, '*')
    setTimeout(() => {
      if (waiting.delete(id)) reject(new Error('Diagram took too long to render'))
    }, 15000)
  })
}
