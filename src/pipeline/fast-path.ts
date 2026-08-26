import type { Root } from 'hast'

// T-P6-08 / docs/SPEC.md §7 performance budget: a short chat-style message
// with no Markdown syntax at all doesn't need remark/rehype/sanitize —
// running the full pipeline just to wrap plain text in a <p> is pure
// overhead. This module deliberately imports nothing from `./processor`:
// eligibility and rendering are self-contained, so a caller that takes the
// fast path never touches the unified pipeline.

// Any character here can start a CommonMark/GFM construct (emphasis, code
// spans, headings, links/images, blockquotes, tables, strikethrough,
// hard-line-break superscript-style escapes, raw HTML, entities). Its mere
// presence doesn't guarantee the text parses as anything other than a plain
// paragraph, but ineligibility here only costs a full-pipeline parse — never
// a rendering mistake — so this stays conservative on purpose.
const SYNTAX_TRIGGER_RE = /[*_`#[\]()>|~^\\<&]/
const LIST_MARKER_RE = /^\s*(?:[-+]\s|\d+[.)]\s)/

export function isFastPathEligible(text: string): boolean {
  if (text.length === 0) return false
  if (text.includes('\n\n')) return false // more than one block
  if (SYNTAX_TRIGGER_RE.test(text)) return false
  if (LIST_MARKER_RE.test(text)) return false
  return true
}

export function fastPathRender(text: string): Root {
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'text', value: text }],
      },
    ],
  }
}
