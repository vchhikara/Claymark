import type { Element, Root, RootContent } from 'hast'

// See src/pipeline/plugins/url-policy.ts for why this hand-rolled walker
// replaces `unist-util-visit` — same measured finding (T-P6-10 stress matrix,
// S-01), same guarantee of unchanged externally observable behavior.
function walkElements(node: Root | RootContent, cb: (el: Element) => void): void {
  if (!('children' in node)) return
  for (const child of node.children) {
    if (child.type === 'element') cb(child as Element)
    walkElements(child, cb)
  }
}

export interface LinkHardeningOptions {
  baseUrl?: string
}

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

export function linkHardening(options: LinkHardeningOptions = {}) {
  const baseOrigin = options.baseUrl ? new URL(options.baseUrl).origin : undefined
  return (tree: Root) => {
    walkElements(tree, (node) => {
      if (node.tagName !== 'a') return
      const props = node.properties ?? (node.properties = {})
      const href = props.href
      if (typeof href !== 'string') return
      if (!SCHEME.test(href.trim())) return
      let resolved: URL
      try {
        resolved = new URL(href)
      } catch {
        return
      }
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return
      if (baseOrigin && resolved.origin === baseOrigin) return
      props.target = '_blank'
      props.rel = ['noopener', 'noreferrer']
    })
  }
}
