/* Engine smoke + security tests. Run: npm test (bundles with esbuild, runs in node). */
import { toHast, loadMath } from '../src/engine/pipeline'
await loadMath()
import { safeUrl } from '../src/engine/url-policy'
import { toHtml } from 'hast-util-to-html'

let pass = 0
let fail = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + detail}`)
}
const html = (md: string) => toHtml(toHast(md).hast)

// ---- FR-1 Markdown support
check('FR-1.1 heading', /<h1 id="cm-h-0">Title<\/h1>/.test(html('# Title')), html('# Title'))
check('FR-1.2 table', /<table>/.test(html('| a | b |\n|---|---|\n| 1 | 2 |')))
check('FR-1.2 strikethrough', /<del>x<\/del>/.test(html('~~x~~')))
check('FR-1.2 task list', /type="checkbox"/.test(html('- [x] done')))
check('FR-1.2 autolink', /href="https:\/\/example.com"/.test(html('see https://example.com')))
check('FR-1.3 fence lang', /class="language-ts"/.test(html('```ts\nconst a = 1\n```')))
check('FR-4.4 fence meta kept', /data-meta="\{1,2\}"/.test(html('```ts {1,2}\na\nb\n```')), html('```ts {1,2}\na\nb\n```'))
check('FR-1.4 inline math', /class="katex"/.test(html('$a^2$')))
check('FR-1.4 display math', /katex-display/.test(html('$$\n\\int x\n$$')))
check('FR-1.5 mermaid fence', /language-mermaid/.test(html('```mermaid\ngraph TD; A-->B\n```')))

// ---- FR-1.6 / NFR-1 security corpus: raw HTML must appear as TEXT
const xss = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<svg onload=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  'text <b onclick="alert(1)">inline</b> text',
  '<style>body{display:none}</style>',
]
for (const p of xss) {
  const out = html(p)
  const dangerous = /<(script|iframe|svg|style|img|b)\b/i.test(out) || /<[a-z]+[^>]*\son\w+=/i.test(out)
  check(`FR-1.6 inert: ${p.slice(0, 30)}`, !dangerous && out.includes('&#x3C;'), out)
}
const links = [
  '[x](javascript:alert(1))',
  '[x](JaVaScRiPt:alert(1))',
  '[x](java%09script:alert(1))',
  '[x](vbscript:msgbox(1))',
  '[x](data:text/html;base64,PHNjcmlwdD4=)',
  '![x](data:image/svg+xml;base64,PHN2Zz4=)',
  '![x](javascript:alert(1))',
]
for (const p of links) {
  const out = html(p)
  check(`NFR-1.3 blocked: ${p}`, !/(href|src)="(javascript|vbscript|data:text|data:image\/svg|java)/i.test(out), out)
}
check('NFR-1.3 data:png allowed', /src="data:image\/png/.test(html('![x](data:image/png;base64,iVBORw0KGgo=)')))
check('NFR-1.3 https allowed', /href="https:\/\/a.b"/.test(html('[x](https://a.b)')))
check('NFR-1.4 rel', /rel="noopener noreferrer"/.test(html('[x](https://a.b)')))
check('safeUrl mailto', safeUrl('mailto:a@b.c', false) !== undefined)

// ---- FR-3.2 / NFR-5: partial & pathological input never throws
const partials = ['```js\nconst a', '| a | b |\n|--', '**unclosed', '[link](http://', '$$\n\\frac{', '> '.repeat(500) + 'x', '- '.repeat(300) + 'x', '$\\badcommand{$', '[' .repeat(2000)]
for (const p of partials) {
  let ok = true
  try {
    toHast(p)
  } catch {
    ok = false
  }
  check(`FR-3.2 no throw: ${JSON.stringify(p.slice(0, 20))}`, ok)
}
check('KaTeX error degrades visibly', /katex-error|\\badcommand/.test(html('$\\badcommand{x}$')), html('$\\badcommand{x}$'))

// ---- FR-2.4 purity
const doc = '# A\n\ntext **b** `c`\n\n```py\nx=1\n```'
check('FR-2.4 deterministic', html(doc) === html(doc))

// ---- Outline
const o = toHast('# One\n\ntext\n\n## Two\n\nSetext\n------').outline
check('outline incl. setext', o.length === 3 && o[2].text === 'Setext' && o[1].depth === 2, JSON.stringify(o))

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) (globalThis as any).process.exit(1)
