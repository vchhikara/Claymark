import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Options as RehypeKatexOptions } from 'rehype-katex'
import type { PluggableList } from 'unified'

// FR: `$…$` parses to mdast `inlineMath`, `$$…$$` to `math` (block) — distinct
// node types remark-math already produces; nothing further to configure here.
export const math = remarkMath

// docs/ARCHITECTURE.md §7 (enrichment tier): malformed TeX must degrade within
// its own node, never throw. rehype-katex@7 always renders internally with
// `throwOnError: true` first, then on a KaTeX `ParseError` retries with
// `strict: 'ignore', throwOnError: false`, and for any other error emits a
// `.katex-error` span instead of throwing — so this never throws to the
// caller regardless of options; `Options` (unlike raw `KatexOptions`)
// deliberately omits `throwOnError` because the caller cannot override it.
const katexOptions: RehypeKatexOptions = {}

export const mathHighlight: PluggableList = [[rehypeKatex, katexOptions]]
