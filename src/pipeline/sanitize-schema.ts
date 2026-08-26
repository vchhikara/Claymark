import type { defaultSchema } from 'rehype-sanitize'

// T-P5-03: exactly the MathML elements KaTeX (katex@0.16.10) emits — grepped
// from `setAttribute`/`new MathNode(...)` call sites in
// node_modules/katex/src/{buildMathML,domTree}.js plus the standard MathML3
// element set it draws from. Re-derive this list from source if the katex
// dependency version changes.
const KATEX_MATHML_TAGS = [
  'math',
  'semantics',
  'annotation',
  'mrow',
  'mi',
  'mn',
  'mo',
  'mtext',
  'ms',
  'mspace',
  'mpadded',
  'mphantom',
  'mfrac',
  'mroot',
  'msqrt',
  'mstyle',
  'msub',
  'msup',
  'msubsup',
  'munder',
  'mover',
  'munderover',
  'mtable',
  'mtr',
  'mtd',
  'menclose',
  'mglyph',
] as const

// The full class taxonomy KaTeX's own stylesheet defines (extracted from
// node_modules/katex/dist/katex.css — 140 classes) plus the "atom type"
// classes (`mord`, `mbin`, `mrel`, …) KaTeX assigns in JS rather than CSS —
// those were only found by rendering a broad corpus of LaTeX constructs
// (fractions, roots, matrices, accents, colors, fonts, arrows, cancel,
// phantom, style switches) and inspecting the emitted class list, since they
// have no dedicated stylesheet selector to grep for — plus `katex-error`,
// which rehype-katex adds itself (not part of katex.css) for the fail-closed
// error span. Deliberately an exact literal list, not a prefix/regex match:
// several KaTeX classes (`base`, `strut`, `mord`, `sqrt`, `root`, `com`,
// `fix`, …) don't share a common prefix, so only an enumerated set stays
// precise. Re-derive from source if the katex dependency version changes.
const KATEX_CLASSES = [
  'accent', 'accent-body', 'accent-full', 'amsrm', 'angl', 'anglpad',
  'mbin', 'mclose', 'minner', 'mop', 'mopen', 'mord', 'mrel', 'mtight', 'text',
  'arraycolsep', 'base', 'boldsymbol', 'boxpad', 'brace-center', 'brace-left',
  'brace-right', 'cancel-lap', 'cancel-pad', 'cd-arrow-pad', 'cd-label-left',
  'cd-label-right', 'cd-vert-arrow', 'clap', 'col-align-c', 'col-align-l',
  'col-align-r', 'com', 'delim-size1', 'delim-size4', 'delimcenter',
  'delimsizing', 'eqn-num', 'fbox', 'fcolorbox', 'fix', 'fleqn',
  'fontsize-ensurer', 'frac-line', 'halfarrow-left', 'halfarrow-right',
  'hbox', 'hdashline', 'hide-tail', 'hline', 'inner', 'katex',
  'katex-display', 'katex-error', 'katex-html', 'katex-mathml',
  'katex-version', 'large-op', 'leqno', 'llap', 'mainrm', 'mathbb',
  'mathbf', 'mathboldfrak', 'mathboldsf', 'mathcal', 'mathfrak', 'mathit',
  'mathitsf', 'mathnormal', 'mathrm', 'mathscr', 'mathsf', 'mathtt',
  'mfrac', 'mml-eqn-num', 'mover', 'mspace', 'msupsub', 'mtable',
  'mtr-glue', 'mult', 'munder', 'newline', 'nulldelimiter', 'op-limits',
  'op-symbol', 'overlay', 'overline', 'overline-line', 'pstrut',
  'reset-size1', 'reset-size2', 'reset-size3', 'reset-size4', 'reset-size5',
  'reset-size6', 'reset-size7', 'reset-size8', 'reset-size9', 'reset-size10',
  'reset-size11', 'rlap', 'root', 'rule', 'size1', 'size2', 'size3',
  'size4', 'size5', 'size6', 'size7', 'size8', 'size9', 'size10', 'size11',
  'sizing', 'small-op', 'sout', 'sqrt', 'stretchy', 'strut', 'svg-align',
  'tag', 'textbb', 'textbf', 'textboldfrak', 'textboldsf', 'textfrak',
  'textit', 'textitsf', 'textrm', 'textscr', 'textsf', 'texttt', 'thinbox',
  'ttf', 'underline', 'underline-line', 'vbox', 'vertical-separator',
  'vlist', 'vlist-r', 'vlist-s', 'vlist-t', 'vlist-t2', 'woff', 'woff2',
  'x-arrow', 'x-arrow-pad',
] as const

// Attributes KaTeX's MathML builder sets, deliberately excluding `href` (used
// by `\href`/`\url`): those commands are gated by KaTeX's own `trust` option,
// which defaults to `false` (see src/pipeline/plugins/math.ts) and is never
// enabled here, so KaTeX itself never emits `href` — but the schema omits it
// too, as defense in depth rather than relying solely on that upstream default.
const KATEX_MATHML_ATTRS = [
  'accent', 'accentunder', 'columnalign', 'columnlines', 'columnspacing',
  'depth', 'display', 'displaystyle', 'encoding', 'fence', 'height',
  'largeop', 'linebreak', 'linethickness', 'lspace', 'mathbackground',
  'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'notation',
  'rowlines', 'rowspacing', 'rspace', 'scriptlevel', 'separator',
  'stretchy', 'valign', 'voffset', 'width', 'xmlns',
] as const

export const sanitizeSchema: typeof defaultSchema = {
  clobberPrefix: 'user-content-',
  tagNames: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'em',
    'strong',
    'del',
    'hr',
    'br',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'input',
    'span',
    'svg',
    'path',
    'line',
    ...KATEX_MATHML_TAGS,
  ],
  attributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    input: ['checked', 'disabled', 'type'],
    code: [['className', /^language-/]],
    ol: ['start'],
    span: [['className', ...KATEX_CLASSES], 'style', 'ariaHidden'],
    svg: ['xmlns', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'style'],
    path: ['d'],
    line: ['x1', 'y1', 'x2', 'y2', 'strokeWidth'],
    '*': [...KATEX_MATHML_ATTRS],
  },
  // rehype-sanitize shallow-merges this schema over its GitHub-flavoured
  // defaultSchema, whose case-sensitive protocol check misclassifies
  // colon-bearing relative URLs and uppercase schemes. An empty map overrides
  // it: URL scheme safety is enforced exclusively by plugins/url-policy.ts,
  // which runs before this stage in the processor chain (ARCHITECTURE §2).
  protocols: {},
}
