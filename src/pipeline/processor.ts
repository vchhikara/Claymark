import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import type { HTML } from 'mdast'
import type { Text } from 'hast'
import { gfm } from './plugins/gfm'
import { math } from './plugins/math'
import { urlPolicy } from './plugins/url-policy'
import { linkHardening } from './plugins/links'
import { sanitizePreset } from './plugins/sanitize'
import { codeSkeleton } from './plugins/code-lazy'
import { mathSkeleton } from './plugins/math-lazy'

// Raw HTML passthrough is disabled entirely (DEC-005): it is the largest single
// class of attack surface and the spec requires raw HTML to be inert. Rather than
// dropping it silently, mdast `html` nodes are converted to text nodes so untrusted
// markup is displayed escaped as source text, never rendered (FR-1.6).
function htmlToText(_: unknown, node: HTML): Text {
  return { type: 'text', value: node.value }
}

export const processor = unified()
  .use(remarkParse)
  .use(gfm)
  // DEF-003: `$…$`/`$$…$$` → mdast `inlineMath`/`math` nodes (remarkMath
  // itself is cheap — a micromark syntax extension, not KaTeX — so it's fine
  // to run unconditionally here, unlike the actual KaTeX renderer below).
  .use(math)
  .use(remarkRehype, {
    allowDangerousHtml: false,
    handlers: { html: htmlToText },
  })
  .use(urlPolicy)
  .use(linkHardening)
  .use(sanitizePreset)
  // codeSkeleton must run *after* sanitizePreset (docs/ARCHITECTURE.md §6):
  // the sanitize schema (src/pipeline/sanitize-schema.ts) allowlists no
  // attributes at all on `pre`, so a `data-code-pending`/`style` it adds
  // would be stripped if applied before sanitization runs. Its output is
  // programmatic (not derived from untrusted markdown text), so it's safe
  // to add on the trusted side of the sanitize boundary.
  .use(codeSkeleton)
  // Same reasoning, same post-sanitize placement (DEF-003): the sanitize
  // schema's `code` attribute allowlist is `className` matching
  // `/^language-/` only, no `data-*` — a `data-math-pending` marker added
  // before sanitizePreset would be stripped.
  .use(mathSkeleton)
