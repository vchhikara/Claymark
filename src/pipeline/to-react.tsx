import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Components, Jsx } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import type { ReactElement } from 'react'
import type { Root } from 'hast'

export interface ToReactOptions {
  components?: Components
}

export function toReact(tree: Root, options: ToReactOptions = {}): ReactElement {
  return toJsxRuntime(tree, {
    Fragment,
    jsx: jsx as unknown as Jsx,
    jsxs: jsxs as unknown as Jsx,
    components: options.components,
  }) as ReactElement
}
