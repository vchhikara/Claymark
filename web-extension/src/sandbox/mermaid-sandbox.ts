/**
 * Runs in a sandboxed extension page (manifest "sandbox"): opaque origin, no
 * extension APIs, no network (connect-src 'none'). Mermaid needs inline
 * <style>/style="" while measuring; that is allowed here and nowhere else
 * (LEDGER X-022). Receives {id, code, dark}, returns {id, svg, width, height}
 * or {id, error}.
 */
import mermaid from 'mermaid'

const FONT = 'Arial, Helvetica, "Liberation Sans", sans-serif'
let seq = 0
let queue: Promise<unknown> = Promise.resolve()

async function render(code: string, dark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    fontFamily: FONT,
    themeVariables: { fontFamily: FONT },
  })
  if (!(await mermaid.parse(code, { suppressErrors: true }))) {
    try {
      await mermaid.parse(code)
    } catch (e: any) {
      throw new Error(e?.message ?? 'Invalid diagram')
    }
    throw new Error('Invalid diagram')
  }
  const id = `m${++seq}`
  try {
    const { svg } = await mermaid.render(id, code)
    const vb = /viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/.exec(svg)
    const fixed = svg.includes('xmlns="http://www.w3.org/2000/svg"') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    return { svg: fixed, width: vb ? Math.round(+vb[1]!) : undefined, height: vb ? Math.round(+vb[2]!) : undefined }
  } finally {
    document.getElementById(id)?.remove()
    document.getElementById('d' + id)?.remove()
  }
}

window.addEventListener('message', (e) => {
  if (e.source !== window.parent) return
  const { id, code, dark } = e.data ?? {}
  if (typeof id !== 'number' || typeof code !== 'string') return
  const job = queue.then(() => render(code, !!dark))
  queue = job.catch(() => {})
  job.then(
    (r) => window.parent.postMessage({ id, ...r }, '*'),
    (err) => window.parent.postMessage({ id, error: String(err?.message ?? err) }, '*'),
  )
})
window.parent.postMessage({ ready: true }, '*')
