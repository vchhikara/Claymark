// Sanity checks on dist/ after vite build, plus two build steps vite can't
// do itself: the sandboxed mermaid script and the content-script bundle
// (both need to be a single classic/IIFE file, not an ES-module chunk graph).
import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// `new URL(...).pathname` stays percent-encoded for paths containing spaces
// (this repo's own path does) — fileURLToPath decodes it correctly.
const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '../dist/')
const src = join(here, '../src/')

const must = ['manifest.json', 'app.html', 'popup.html', 'background.js', 'icons/icon-128.png', 'sandbox/mermaid.js', 'content/reader.js', 'content/reader.css', 'fonts/inter-latin-400-normal.woff2']

await build({
  entryPoints: [join(src, 'sandbox/mermaid-sandbox.ts')],
  bundle: true, format: 'iife', minify: true, target: 'chrome120',
  outfile: join(dist, 'sandbox/mermaid.js'), logLevel: 'error',
})

await build({
  entryPoints: [join(src, 'content/reader.ts')],
  bundle: true, format: 'iife', minify: true, target: 'chrome120',
  outfile: join(dist, 'content/reader.js'), logLevel: 'error',
})

// Reader CSS: the content script's shadow root can't reach the app's
// Vite-bundled stylesheet (it's chunked/hashed for app.html), so this
// concatenates the same source files standalone. `:root` is rewritten to
// `:host` — a shadow tree's `:root` selector still matches the *page's*
// document root, not the shadow host, so the token/theme variables need to
// live on `:host` to cascade into the shadow content instead.
mkdirSync(join(dist, 'content'), { recursive: true })
const readerCss = ['tokens.css', 'claymark.css', 'engine-ext.css', 'fonts.css']
  .map((f) => readFileSync(join(src, 'styles', f), 'utf8').replace(/:root\b/g, ':host'))
  .join('\n')
const readerExtra = `
.cm-reader-page { font-family: var(--font-body); color: hsl(var(--text-primary)); background: hsl(var(--surface)); min-height: 100vh; }
.cm-reader-bar { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-5); border-bottom: 1px solid hsl(var(--border-default)); font-family: var(--font-ui); font-size: var(--text-small); position: sticky; top: 0; background: hsl(var(--surface)); z-index: 1; }
.cm-reader-brand { font-weight: 600; }
.cm-reader-outline { color: hsl(var(--text-muted)); flex: 1; }
.cm-reader-toggle { border: 1px solid hsl(var(--border-default)); background: none; color: inherit; font: inherit; padding: 0.2rem 0.75rem; cursor: pointer; border-radius: var(--radius-sm); }
.cm-reader-toggle:hover { border-color: var(--accent-brand); }
.cm-reader-body { max-width: calc(var(--measure) + 4rem); margin-inline: auto; padding: var(--space-5); }
.cm-reader-raw { max-width: calc(var(--measure) + 4rem); margin-inline: auto; padding: var(--space-5); white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-code); }
`
writeFileSync(join(dist, 'content/reader.css'), readerCss + readerExtra)

let bad = 0
for (const f of must) if (!existsSync(join(dist, f))) { console.error('MISSING', f); bad++ }
const bg = readFileSync(join(dist, 'background.js'), 'utf8')
if (/^import /m.test(bg)) { console.error('background.js imports shared chunks'); bad++ }
for (const page of ['app.html', 'popup.html']) {
  const html = readFileSync(join(dist, page), 'utf8')
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html) || /\sstyle=/.test(html)) { console.error(`inline script/style in ${page}`); bad++ }
}
let total = 0
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : (total += statSync(p).size) })
walk(dist)
console.log(`dist OK: ${(total / 1024 / 1024).toFixed(2)} MB`)
if (bad) process.exit(1)
