// T-P8-08: re-runs the full security suite from T-P2-12 (tests/security.spec.ts's
// XSS corpus + malicious-URL + rel-hardening + no-script-node checks) against
// the as-built pipeline and emits a machine-readable result file — the same
// checks vitest already enforces on every run, restated here as a standalone,
// CI-independent artifact per the roadmap's G8 gate (`bench/results/security-final.json`).
//
// This is not a second implementation of the security logic — it exercises
// the same public pipeline entry points (`processor`, `safeUrl`) the test
// suite does, so a real regression here means the test suite would also
// fail; this file's value is the durable, timestamped, git-trackable output.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Root, Element } from 'hast'
import { visit } from 'unist-util-visit'
import { processor } from '../src/pipeline/processor'
import { safeUrl } from '../src/pipeline/plugins/url-policy'

const here = dirname(fileURLToPath(import.meta.url))

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'em', 'strong', 'del', 'hr', 'br', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input',
])

export interface SecurityCheckResult {
  category: string
  total: number
  passed: number
  pass: boolean
}

async function render(markdown: string): Promise<Root> {
  return (await processor.run(processor.parse(markdown))) as Root
}

function isInert(tree: Root): boolean {
  let ok = true
  visit(tree, (node) => {
    if (node.type === 'raw') {
      ok = false
      return
    }
    if (node.type !== 'element') return
    const el = node as Element
    if (!ALLOWED_TAGS.has(el.tagName)) {
      ok = false
      return
    }
    for (const key of Object.keys(el.properties)) {
      if (key.startsWith('on') || key === 'style' || key === 'srcset') {
        ok = false
        return
      }
    }
    for (const attr of ['href', 'src'] as const) {
      const value = el.properties[attr]
      if (typeof value === 'string' && safeUrl(value, attr === 'src') === undefined) {
        ok = false
      }
    }
  })
  return ok
}

async function checkXssCorpus(): Promise<SecurityCheckResult> {
  const dir = join(here, '../tests/fixtures/xss')
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  let passed = 0
  for (const file of files) {
    const markdown = readFileSync(join(dir, file), 'utf8')
    if (isInert(await render(markdown))) passed++
  }
  return { category: 'XSS corpus (NFR-1.2 · G2-C2)', total: files.length, passed, pass: passed === files.length }
}

async function checkMaliciousUrls(): Promise<SecurityCheckResult> {
  const fixtures: Array<{ tag: 'a' | 'img'; url: string }> = [
    { tag: 'a', url: 'javascript:alert(1)' },
    { tag: 'a', url: 'JaVaScRiPt:alert(1)' },
    { tag: 'a', url: 'java\tscript:alert(1)' },
    { tag: 'a', url: 'java\nscript:alert(1)' },
    { tag: 'a', url: 'vbscript:msgbox(1)' },
    { tag: 'a', url: 'VBSCRIPT:x' },
    { tag: 'a', url: 'data:text/html,<script>alert(1)</script>' },
    { tag: 'a', url: 'data:text/html;base64,PHNjcmlwdD4=' },
    { tag: 'img', url: 'data:image/svg+xml,<svg onload=alert(1)>' },
    { tag: 'img', url: 'data:image/jpg,fake' },
    { tag: 'a', url: 'javascript:alert(1)' },
    { tag: 'a', url: 'javascript&colon;alert(1)' },
    { tag: 'img', url: 'vbscript:alert(1)' },
    { tag: 'a', url: 'jAvAsCrIpT&#58;alert(1)' },
  ]
  let passed = 0
  for (const { tag, url } of fixtures) {
    const markdown = tag === 'img' ? `![](<${url}>)` : `[x](<${url}>)`
    const tree = await render(markdown)
    let leaked: string | undefined
    visit(tree, 'element', (node) => {
      if (node.tagName !== tag) return
      const value = node.properties[tag === 'img' ? 'src' : 'href']
      if (typeof value === 'string') leaked = value
    })
    if (!leaked) passed++
  }
  return { category: 'Malicious-URL fixtures (G2-C5)', total: fixtures.length, passed, pass: passed === fixtures.length }
}

async function checkRelHardening(): Promise<SecurityCheckResult> {
  const tree = await render('[ext](https://example.com)')
  let hardened = false
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'a') return
    const rel = node.properties.rel
    hardened = Array.isArray(rel) && rel.includes('noopener') && rel.includes('noreferrer')
  })
  return { category: 'External link rel hardening (NFR-1.4 · G2-C6)', total: 1, passed: hardened ? 1 : 0, pass: hardened }
}

async function checkNoScriptNodes(): Promise<SecurityCheckResult> {
  const samples = [
    '<script>alert(1)</script>',
    '[x](javascript:alert(1))',
    '<img src=x onerror=alert(1)>',
    '```js\nalert(1)\n```',
  ]
  let passed = 0
  for (const markdown of samples) {
    const tree = await render(markdown)
    let hasScript = false
    visit(tree, 'element', (node) => {
      if (node.tagName === 'script') hasScript = true
    })
    if (!hasScript) passed++
  }
  return { category: 'No <script> nodes in any output path (G2-C3)', total: samples.length, passed, pass: passed === samples.length }
}

export async function runSecurityFinal(): Promise<SecurityCheckResult[]> {
  return [
    await checkXssCorpus(),
    await checkMaliciousUrls(),
    await checkRelHardening(),
    await checkNoScriptNodes(),
  ]
}

export function writeSecurityResults(results: SecurityCheckResult[], outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true })
  const overallPass = results.every((r) => r.pass)
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), overallPass, results }, null, 2) + '\n',
  )
}

// Allow direct execution: `npx tsx bench/security-final.ts`
if (import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1] ?? '').href) {
  const results = await runSecurityFinal()
  writeSecurityResults(results, join(here, 'results/security-final.json'))
  const overallPass = results.every((r) => r.pass)
  for (const r of results) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.category}: ${r.passed}/${r.total}`)
  }
  console.log(overallPass ? '\nAll security checks passed.' : '\nSECURITY REGRESSION DETECTED.')
  if (!overallPass) process.exitCode = 1
}
