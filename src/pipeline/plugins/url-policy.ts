import { visit } from 'unist-util-visit'
import type { Element, Root } from 'hast'

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp)[;,]/i

function resolve(value: string): URL | undefined {
  try {
    return new URL(value, 'https://claymark.invalid')
  } catch {
    return undefined
  }
}

export function safeUrl(value: string, allowDataImage: boolean): string | undefined {
  const cleaned = String(value).replace(/[\t\n\r]/g, '').trim()

  // Micromark percent-encodes control characters inside link destinations, so a
  // payload like "java%09script:" arrives with an innocuous-looking scheme
  // position. When the text before the first separator colon carries percent
  // escapes or control characters, decide on its decoded form rather than on
  // what the URL parser sees.
  const probe = String(value).replace(/\s/g, '')
  const colon = probe.indexOf(':')
  const separators = ['/', '?', '#'].map((c) => probe.indexOf(c)).filter((i) => i > -1)
  const firstSeparator = separators.length > 0 ? Math.min(...separators) : Number.POSITIVE_INFINITY
  if (colon > -1 && colon < firstSeparator) {
    let head = probe.slice(0, colon)
    if (/[%\u0000-\u001F\u007F]/.test(head)) {
      try {
        head = decodeURIComponent(head)
      } catch {
        return undefined
      }
      const scheme = head.replace(/[^a-zA-Z0-9+.-]/g, '').toLowerCase()
      if (scheme === 'data') {
        const decodedProbe = `${head}:${probe.slice(colon + 1)}`
        return allowDataImage && SAFE_DATA_IMAGE.test(decodedProbe) ? value : undefined
      }
      return SAFE_PROTOCOLS.has(`${scheme}:`) ? value : undefined
    }
  }

  const resolved = resolve(cleaned)
  if (!resolved) return undefined
  if (resolved.protocol === 'data:') {
    return allowDataImage && SAFE_DATA_IMAGE.test(cleaned) ? value : undefined
  }
  return SAFE_PROTOCOLS.has(resolved.protocol) ? value : undefined
}

export function urlPolicy() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties ?? (node.properties = {})
      if (typeof props.href === 'string' && safeUrl(props.href, false) === undefined) {
        delete props.href
      }
      if (typeof props.src === 'string' && safeUrl(props.src, true) === undefined) {
        delete props.src
      }
    })
  }
}
