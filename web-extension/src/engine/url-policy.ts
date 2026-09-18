import type { Element, Root, RootContent } from 'hast'

// `unist-util-visit` was measured (T-P6-10 stress matrix, S-01) to cost
// roughly 170x a plain recursive walk over a large tree (~1.5s vs ~10ms on a
// 5 MB document, ~210k nodes) — its generic ancestor-tracking/type-dispatch
// machinery is significant overhead at that scale. A direct recursive walk
// over 'element' nodes only, with identical visitation order, replaces it
// here with no change to this plugin's externally observable behavior.
function walkElements(node: Root | RootContent, cb: (el: Element) => void): void {
  if (!('children' in node)) return
  for (const child of node.children) {
    if (child.type === 'element') cb(child as Element)
    walkElements(child, cb)
  }
}

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
    walkElements(tree, (node) => {
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
