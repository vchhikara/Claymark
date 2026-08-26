import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Components, Jsx } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import type { Root, RootContent } from 'hast'

// T-P6-07 / docs/ARCHITECTURE.md §5 "Subtree memoization": block-level
// components memoized by node identity, so a caller re-rendering a document
// after a small edit does not pay for re-converting every unchanged block —
// only the block(s) whose hast node object actually changed get a fresh
// React element. Keyed by node reference (a WeakMap), not text or a hash: an
// unchanged block keeps the exact same node object, so reference equality is
// both correct and free.
export class SubtreeCache {
  private cache = new WeakMap<object, ReactElement>()

  get(node: object): ReactElement | undefined {
    return this.cache.get(node)
  }

  set(node: object, element: ReactElement): void {
    this.cache.set(node, element)
  }
}

export interface ToReactOptions {
  components?: Components
  // When provided, top-level children of `tree` are converted and cached
  // individually by node identity, instead of converting the whole tree in
  // one pass. Omit for a plain one-shot conversion (e.g. a single isolated
  // block, where there is nothing to memoize against).
  subtreeCache?: SubtreeCache
}

function convertNode(node: RootContent, options: ToReactOptions): ReactElement {
  const wrapper: Root = { type: 'root', children: [node] }
  return toJsxRuntime(wrapper, {
    Fragment,
    jsx: jsx as unknown as Jsx,
    jsxs: jsxs as unknown as Jsx,
    components: options.components,
  }) as ReactElement
}

export function toReact(tree: Root, options: ToReactOptions = {}): ReactElement {
  const cache = options.subtreeCache
  if (!cache) {
    return toJsxRuntime(tree, {
      Fragment,
      jsx: jsx as unknown as Jsx,
      jsxs: jsxs as unknown as Jsx,
      components: options.components,
    }) as ReactElement
  }

  const children = tree.children.map((child, index) => {
    const cached = cache.get(child)
    if (cached) return cached
    // Key assigned once at creation time (not on every lookup) so a cache
    // hit returns the exact same element object on every subsequent call —
    // wrapping it in anything new here would defeat the point of caching.
    const element = cloneElement(convertNode(child, options), { key: index })
    cache.set(child, element)
    return element
  })

  return jsx(Fragment, { children }) as ReactElement
}
