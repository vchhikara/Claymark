// T-P6-11: standalone render script, invoked once per pipeline-tree (current
// or baseline-worktree) via a child process whose cwd is that tree — so
// relative imports below resolve to whichever tree's own src/pipeline it is
// run from. Renders every corpus document to a serialized HTML snapshot.
//
// Deterministic-scope note: renders through the core processor (+ math
// plugin for math-tagged docs), matching how G2/G6's other Node-only
// scenarios already snapshot (bench/stress.ts). Shiki syntax highlighting
// and Mermaid SVG rendering are React-side/async/DOM-dependent (confirmed
// elsewhere in this project — see plan/04-STATE-LEDGER.md CP-011 — as
// requiring a real browser for deterministic snapshotting) and are out of
// this Node-only harness's scope; diagram/code-fence *structure* (that the
// fence and its content survive verbatim) is what is actually snapshotted
// for those categories, not the rendered highlight/diagram artwork.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { processor } from '../../src/pipeline/processor'
import { math, mathHighlight } from '../../src/pipeline/plugins/math'
import { sanitizeSchema } from '../../src/pipeline/sanitize-schema'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'

interface ManifestEntry {
  id: string
  category: string
  path: string
}

const [, , manifestPath, corpusRootAbs, outDir] = process.argv
if (!manifestPath || !corpusRootAbs || !outDir) {
  console.error('usage: render-snapshot.mts <manifest.json> <corpusRootAbs> <outDir>')
  process.exit(2)
}

const manifest: { entries: ManifestEntry[] } = JSON.parse(readFileSync(manifestPath, 'utf8'))
mkdirSync(outDir, { recursive: true })

const mathProcessor = unified()
  .use(remarkParse)
  .use(math)
  .use(remarkRehype)
  .use(mathHighlight)
  .use(rehypeSanitize, sanitizeSchema)

for (const entry of manifest.entries) {
  const docPath = join(corpusRootAbs, entry.path.replace(/^bench\/corpus\/docs\//, ''))
  const text = readFileSync(docPath, 'utf8')

  let html: string
  let threw = false
  try {
    if (entry.category === 'math-papers') {
      const tree = mathProcessor.runSync(mathProcessor.parse(text)) as Root
      html = toHtml(tree)
    } else {
      const tree = processor.runSync(processor.parse(text) as Root) as Root
      html = toHtml(tree)
    }
  } catch (err) {
    threw = true
    html = `__THREW__:${err instanceof Error ? err.message : String(err)}`
  }

  const outPath = join(outDir, `${entry.id}.html`)
  writeFileSync(outPath, html)
  void threw
}

console.log(`Rendered ${manifest.entries.length} snapshots to ${outDir}`)
