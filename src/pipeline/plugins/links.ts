import { visit } from 'unist-util-visit'
import type { Element, Root } from 'hast'

export interface LinkHardeningOptions {
  baseUrl?: string
}

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

export function linkHardening(options: LinkHardeningOptions = {}) {
  const baseOrigin = options.baseUrl ? new URL(options.baseUrl).origin : undefined
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
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
