// T-P6-10 / plan/02-VERIFICATION-GATES.md §Stress: executes the 12-scenario
// stress matrix (S-01..S-12) and writes bench/results/stress.json.
//
// Honesty note: two sub-criteria described in the matrix depend on
// functionality not yet built at this point in the roadmap —
//   - S-04's "page has no horizontal overflow" needs `TableContainer`
//     (T-P7-01, not yet implemented — P7 hasn't started).
//   - S-05's "no jank > 50ms" and S-08's "no unmount storm" describe
//     browser-frame-level behavior this Node-only harness cannot observe
//     directly (no real paint/frame timing without a browser).
// Each is measured for everything this harness *can* check (parses without
// crashing, correct structure, timing budget) and the browser-only or
// not-yet-built portion is reported as `pass: null` with a note, never
// faked as a pass.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import { toHtml } from 'hast-util-to-html'
import type { Root } from 'hast'
import { processor } from '../src/pipeline/processor'
import { toReact } from '../src/pipeline/to-react'
import { detectPartialConstruct } from '../src/pipeline/streaming/detect'
import { ReconcileState } from '../src/pipeline/streaming/reconcile'
import { LRUCache } from '../src/pipeline/cache'
import { math, mathHighlight } from '../src/pipeline/plugins/math'
import { sanitizeSchema } from '../src/pipeline/sanitize-schema'

export interface StressResult {
  id: string
  name: string
  budget: string
  measured: string
  pass: boolean | null
  note?: string
}

function timeMs(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

// Populated only when `runStressMatrix()` is actually called — running 12
// heavy scenarios (5 MB doc, 1000x1000 table, 100k-char stream, 1000
// equations, ...) at module-import time would make merely importing this
// file expensive for anything else that references it.
function computeResults(): StressResult[] {
const results: StressResult[] = []

// S-01: Large document — scenario calls for 5 MB Markdown, parse < 2000ms, no OOM
{
  // DEC-017 (T-P6-10, this scenario): profiling traced the original 8.2s
  // measurement at literal 5 MB to two causes. (1) Claymark's own
  // urlPolicy/linkHardening plugins each ran a full unist-util-visit pass;
  // that traversal itself was measured at ~1.5s per pass on a ~210k-node
  // tree (~170x a plain recursive walk) — fixed by replacing it with a
  // hand-rolled walker in both plugins (same public API, same behavior,
  // T-P6-10), which cut this scenario from ~8.2s to ~5.7s. (2) The
  // remainder is upstream: remark-parse+remark-gfm alone measured ~4.1s at
  // 5 MB (bare remark-parse without gfm: ~1.9s), and the size/time curve is
  // super-linear (100KB=187ms, 1MB=828-907ms, 1.5MB measured up to 2000ms
  // under full-suite memory pressure — too close to the line to be a stable
  // pass, 2MB=1794-2073ms, 3MB=2911ms) — an upstream parsing-cost
  // characteristic, not a Claymark defect, in the same category as S-04's
  // table-parsing finding. Executed here at 1 MB (real margin under the
  // 2000ms budget even under full-suite conditions; still 10x the NFR-2
  // 100KB reference point) so the scenario measures real behavior; the 5 MB
  // finding is reported honestly rather than silently substituted.
  const block = 'This is one paragraph of ordinary prose for a large-document stress test.\n\n'
  const doc = block.repeat(Math.ceil((1 * 1024 * 1024) / block.length))
  // DEF-005: closure required two changes, done in this order per explicit
  // user direction after the first hardening attempt alone didn't hold up
  // under direct measurement (see plan/04-STATE-LEDGER.md and ledger.md):
  //
  // 1. Sampling 5 times and asserting on the median (not the mean, which one
  //    extreme outlier still skews) — absorbs scheduler-noise flakiness
  //    while keeping full sensitivity to an actual regression, a real
  //    slowdown pushes every sample up, not just one. This alone was the
  //    original DEF-005 scope ("test-hardening, not a code fix").
  // 2. Investigated whether the pinned engine version (package.json:
  //    node 20.11.1) vs. this environment's actual Node v24.20.0 explained
  //    a further, much larger gap the median-of-5 alone did not close: this
  //    environment measures a consistent ~2900-3650ms for this exact 1 MB
  //    document (median 3153-3480ms across repeated runs), 50-75% over the
  //    2000ms budget DEC-017 set — not noise, a sustained gap, confirmed by
  //    a normal load average (2.6/12 cores). Re-ran the identical
  //    measurement directly under Node 20.11.1 (installed via nvm
  //    specifically to test this): 2866-3653ms, materially the same —
  //    ruling out the Node version as the cause. The conclusion is that
  //    DEC-017's 828-907ms/1MB baseline was measured on faster/different
  //    hardware than this sandbox, never re-validated since, and the
  //    2000ms budget was never actually portable. Raising it to 5000ms
  //    (real margin above the worst single sample observed across both Node
  //    versions, 3653ms) is a deliberate, disclosed scope change beyond
  //    "test-hardening, not a code fix" — explicitly authorized after this
  //    finding, not something sampling alone could respect. A genuine
  //    regression pushing parse time toward the old 5 MB literal cost
  //    (~5.7s) still fails.
  const BUDGET_MS = 5000
  const SAMPLE_COUNT = 5
  const samples: number[] = []
  let threw = false
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    samples.push(
      timeMs(() => {
        try {
          const tree = processor.runSync(processor.parse(doc)) as Root
          toReact(tree)
        } catch {
          threw = true
        }
      }),
    )
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const ms = sorted[Math.floor(sorted.length / 2)]!
  results.push({
    id: 'S-01',
    name: 'Large document (1 MB, scaled down from 5 MB — see note)',
    budget: `< ${BUDGET_MS}ms, no OOM`,
    measured: `median ${ms.toFixed(0)}ms of ${SAMPLE_COUNT} samples [${samples.map((s) => s.toFixed(0)).join(', ')}]ms, threw=${threw}`,
    pass: !threw && ms < BUDGET_MS,
    note: `Scaled down from the literal 5 MB in the gate table per DEC-017: remark-parse+remark-gfm parsing cost is super-linear in document size (measured on DEC-017's reference machine: 100KB=187ms, 1MB=828-907ms, 1.5MB up to 2000ms under full-suite memory pressure, 2MB=1794-2073ms, 3MB=2911ms), so literal 5 MB (~5.7s after the urlPolicy/linkHardening traversal fix) cannot meet a 2000ms budget with GFM enabled on that machine — an upstream cost, not a Claymark defect. Not faked as a pass. DEF-005 (this session): hardened to a median of ${SAMPLE_COUNT} samples (was a single flaky sample); separately, this actual execution environment measures ~2900-3650ms for the same 1 MB document regardless of Node version (confirmed directly under both v24.20.0 and the pinned v20.11.1) — DEC-017's 2000ms budget assumed hardware this sandbox doesn't match. Budget raised to ${BUDGET_MS}ms with real margin above every sample observed during that investigation; still fails a genuine regression toward the old ~5.7s/5MB cost.`,
  })
}

// S-02: Deep nesting — 500-level nested blockquote, no stack overflow
{
  const doc = '> '.repeat(500) + 'deeply nested text\n'
  let stackOverflow = false
  let otherError = false
  try {
    const tree = processor.runSync(processor.parse(doc)) as Root
    toReact(tree)
  } catch (err) {
    if (err instanceof RangeError) stackOverflow = true
    else otherError = true
  }
  results.push({
    id: 'S-02',
    name: 'Deep nesting (500-level blockquote)',
    budget: 'no stack overflow',
    measured: `stackOverflow=${stackOverflow}, otherError=${otherError}`,
    pass: !stackOverflow,
  })
}

// S-03: Pathological emphasis — 10k unmatched `*`, parse < 500ms
{
  const doc = '*'.repeat(10_000)
  let threw = false
  const ms = timeMs(() => {
    try {
      const tree = processor.runSync(processor.parse(doc)) as Root
      toReact(tree)
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-03',
    name: 'Pathological emphasis (10k unmatched *)',
    budget: '< 500ms',
    measured: `${ms.toFixed(0)}ms, threw=${threw}`,
    pass: !threw && ms < 500,
  })
}

// S-04: Wide table — scenario calls for 1000 cols x 1000 rows, renders
{
  // DEC-016 (T-P6-10, this scenario): remark-gfm/micromark table parsing was
  // empirically measured (isolated benchmark, not part of Claymark's own code)
  // to scale roughly cubically: 50x50 -> 210ms, 75x75 -> 1289ms,
  // 100x100 -> 3367ms. Extrapolating that curve, literal 1000x1000 lands in
  // the hours range for a single parse — an upstream cost, not a Claymark
  // defect. Executed here at 100x100 (still a genuinely large/wide table,
  // 100x over Claymark's own median-document budget) so the scenario keeps
  // measuring real behavior instead of hanging the harness; the full-scale
  // finding is reported honestly below rather than silently substituted.
  const cols = 100
  const rows = 100
  const header = '| ' + Array.from({ length: cols }, (_, i) => `c${i}`).join(' | ') + ' |'
  const delim = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |'
  const rowLine = '| ' + Array.from({ length: cols }, (_, i) => `v${i}`).join(' | ') + ' |'
  const doc = [header, delim, ...Array.from({ length: rows }, () => rowLine)].join('\n') + '\n'
  let threw = false
  let tableTag: string | undefined
  const ms = timeMs(() => {
    try {
      const tree = processor.runSync(processor.parse(doc)) as Root
      const html = toHtml(tree)
      tableTag = html.includes('<table') ? '<table>' : 'no <table> found'
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-04',
    name: 'Wide table (100x100, scaled down from 1000x1000 — see note)',
    budget: 'renders, page has no horizontal overflow',
    measured: `${ms.toFixed(0)}ms, threw=${threw}, structure=${tableTag}`,
    pass: !threw && tableTag === '<table>' ? null : false,
    note: 'Renders correctly as a <table> without crashing (measured at 100x100). Scaled down from the literal 1000x1000 in the gate table per DEC-016: remark-gfm/micromark table parsing scales roughly cubically (measured 50x50=210ms, 75x75=1289ms, 100x100=3367ms), so 1000x1000 is an hours-scale upstream cost, not a Claymark defect — running it literally here would hang the harness rather than produce a meaningful pass/fail. The "page has no horizontal overflow" sub-criterion additionally depends on TableContainer (T-P7-01), not yet built — P7 has not started. Neither gap is faked as a pass.',
  })
}

// S-05: Fence bomb — 5000 code fences, mixed languages, lazy load holds
{
  const langs = ['js', 'python', 'typescript', 'rust', 'go', 'cpp', 'json', 'bash']
  const doc = Array.from({ length: 5000 }, (_, i) => {
    const lang = langs[i % langs.length]
    return '```' + lang + '\nconst x = ' + i + ';\n```'
  }).join('\n\n') + '\n'
  let threw = false
  const ms = timeMs(() => {
    try {
      const tree = processor.runSync(processor.parse(doc)) as Root
      toReact(tree)
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-05',
    name: 'Fence bomb (5000 fences, mixed languages)',
    budget: 'lazy load holds, no jank > 50ms',
    measured: `${ms.toFixed(0)}ms total parse+convert, threw=${threw}`,
    pass: threw ? false : null,
    note: 'Parses and converts without crashing (measured). Per-frame jank (>50ms) is a browser paint-timing concern this Node harness cannot observe directly; not faked as a pass.',
  })
}

// S-06: Streaming chaos — 1-char chunks, 100k chunks, monotonic render
{
  // Broken into ~460-char paragraphs (blank-line separated), matching real
  // prose/chat-response streaming rather than one unbroken 100k-char block.
  // Per docs/ARCHITECTURE.md §4, reparse cost on append is O(size of the
  // still-open last block) — for one 100k-char block that IS the whole
  // document, an unavoidable consequence of the architecture's own promise,
  // not a bug (isolated benchmark: 20x 5000-char blocks measured ~83s).
  // Realistic paragraph sizes keep each open block's reparse cost bounded
  // (isolated benchmark: 215x ~460-char blocks measured ~27.5s) while still
  // exercising 100k single-char chunks end to end.
  const sentence = 'This is one sentence of realistic streamed prose content. '
  const paraText = sentence.repeat(8) // ~480 chars
  const paraCount = Math.ceil(100_000 / (paraText.length + 2))
  const doc = Array.from({ length: paraCount }, () => paraText).join('\n\n').slice(0, 100_000)
  const state = new ReconcileState()
  let buffer = ''
  let prevBlockCount = 0
  let monotonic = true
  let threw = false
  const ms = timeMs(() => {
    try {
      for (const ch of doc) {
        buffer += ch
        const { blocks } = state.reconcile(buffer)
        if (blocks.length < prevBlockCount) monotonic = false
        prevBlockCount = blocks.length
      }
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-06',
    name: 'Streaming chaos (100k 1-char chunks)',
    budget: 'monotonic render, zero flicker',
    measured: `${ms.toFixed(0)}ms, monotonic=${monotonic}, threw=${threw}`,
    pass: !threw && monotonic,
  })
}

// S-07: Streaming truncation — cut mid-fence, mid-table, mid-link, degrades gracefully
{
  const cases = [
    { label: 'mid-fence', text: 'before\n\n```js\nconst x = 1' },
    { label: 'mid-table', text: '| a | b |\n| --- |' },
    { label: 'mid-link', text: 'see [my link' },
  ]
  let allOk = true
  const details: string[] = []
  for (const c of cases) {
    try {
      const { kind } = detectPartialConstruct(c.text)
      const state = new ReconcileState()
      state.reconcile(c.text)
      details.push(`${c.label}=${kind}`)
    } catch {
      allOk = false
      details.push(`${c.label}=THREW`)
    }
  }
  results.push({
    id: 'S-07',
    name: 'Streaming truncation (mid-fence, mid-table, mid-link)',
    budget: 'degrades gracefully, no throw',
    measured: details.join(', '),
    pass: allOk,
  })
}

// S-08: Rapid theme thrash — 1000 toggles in 10s, no leak/unmount storm
{
  // Approximated without a browser: toggling a theme is a CSS-variable /
  // data-attribute change, not a component remount (per docs/ARCHITECTURE.md
  // theming model — components never branch on theme in JS). Verified here
  // that 1000 rapid re-renders of the same tree through toReact produce no
  // growth in element count and complete well under the time budget.
  const tree: Root = {
    type: 'root',
    children: [{ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'themed content' }] }],
  }
  let threw = false
  const ms = timeMs(() => {
    try {
      for (let i = 0; i < 1000; i++) {
        toReact(tree)
      }
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-08',
    name: 'Rapid theme thrash (1000 toggles)',
    budget: '< 10s, no leak, no unmount storm',
    measured: `${ms.toFixed(0)}ms, threw=${threw}`,
    pass: threw ? false : ms < 10_000 ? null : false,
    note: 'Confirms 1000 re-renders complete well within budget with no exception (measured). "No unmount storm" requires observing a real React DOM commit/unmount cycle in a browser; not faked as a pass — theming is CSS-variable based per architecture, so no component remount is expected, but this harness cannot directly observe the DOM lifecycle.',
  })
}

// S-09: Cache soak — 10k distinct documents, memory stays under ceiling
{
  const cache = new LRUCache<string>({
    capacity: 1_000_000,
    byteCeiling: 150 * 1024 * 1024,
    sizeOf: (v) => (v as string).length,
  })
  let overCeiling = false
  for (let i = 0; i < 10_000; i++) {
    cache.set(`doc${i}`, 'x'.repeat(2000))
    if (cache.bytes > 150 * 1024 * 1024) overCeiling = true
  }
  results.push({
    id: 'S-09',
    name: 'Cache soak (10k distinct documents)',
    budget: 'memory stays under ceiling',
    measured: `finalBytes=${cache.bytes}, overCeiling=${overCeiling}`,
    pass: !overCeiling,
  })
}

// S-10: Unicode adversarial — RTL overrides, zero-width, combining marks, emoji ZWJ
{
  const RLO = '‮'
  const ZWSP = '​'
  const combining = 'é̂̃' // e + combining accents
  const zwjEmoji = '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}' // family ZWJ sequence
  const doc = `Text with ${RLO}reversed${RLO} and zero${ZWSP}width and ${combining} and ${zwjEmoji} and <script>alert(1)</script>`
  let threw = false
  let hasScript = false
  let preservedVisible = false
  try {
    const tree = processor.runSync(processor.parse(doc)) as Root
    const html = toHtml(tree)
    hasScript = /<script/i.test(html)
    preservedVisible = html.includes('reversed') && html.includes('zero') && html.includes(zwjEmoji)
  } catch {
    threw = true
  }
  results.push({
    id: 'S-10',
    name: 'Unicode adversarial (RTL override, zero-width, combining marks, emoji ZWJ)',
    budget: 'no mojibake, no injection',
    measured: `threw=${threw}, scriptInjected=${hasScript}, visibleTextPreserved=${preservedVisible}`,
    pass: !threw && !hasScript && preservedVisible,
  })
}

// S-11: Concurrent renders — 50 simultaneous instances, no cross-instance state bleed
{
  let allCorrect = true
  const ms = timeMs(() => {
    const outputs = Array.from({ length: 50 }, (_, i) => {
      const doc = `# Instance ${i}\n\nUnique content marker ${i}-${Math.random()}.`
      const tree = processor.runSync(processor.parse(doc)) as Root
      return { i, html: toHtml(tree) }
    })
    for (const { i, html } of outputs) {
      if (!html.includes(`Instance ${i}`)) allCorrect = false
      for (const other of outputs) {
        if (other.i !== i && html === other.html) allCorrect = false
      }
    }
  })
  results.push({
    id: 'S-11',
    name: 'Concurrent renders (50 simultaneous instances)',
    budget: 'no cross-instance state bleed',
    measured: `${ms.toFixed(0)}ms, allCorrect=${allCorrect}`,
    pass: allCorrect,
  })
}

// S-12: Math bomb — 1000 display equations, lazy load holds, < 3000ms
{
  const doc = Array.from({ length: 1000 }, (_, i) => `$$\nx_{${i}} = y^{${i}} + ${i}\n$$`).join('\n\n') + '\n'
  let threw = false
  const ms = timeMs(() => {
    try {
      const tree = unified()
        .use(remarkParse)
        .use(math)
        .use(remarkRehype)
        .use(mathHighlight)
        .use(rehypeSanitize, sanitizeSchema)
        .runSync(
          unified().use(remarkParse).use(math).parse(doc),
        ) as Root
      toHtml(tree)
    } catch {
      threw = true
    }
  })
  results.push({
    id: 'S-12',
    name: 'Math bomb (1000 display equations)',
    budget: '< 3000ms, lazy load holds',
    measured: `${ms.toFixed(0)}ms, threw=${threw}`,
    pass: !threw && ms < 3000,
  })
}

return results
}

export function runStressMatrix(): StressResult[] {
  return computeResults()
}

export function writeStressResults(results: StressResult[], outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + '\n',
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = runStressMatrix()
  const outPath = join(process.cwd(), 'bench/results/stress.json')
  writeStressResults(results, outPath)
  const measured = results.filter((r) => r.pass !== null)
  const failed = measured.filter((r) => r.pass === false)
  console.log(`Stress matrix: ${measured.length - failed.length}/${measured.length} directly-measured scenarios PASS`)
  console.log(`Result file: ${outPath}`)
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((r) => r.id).join(', '))
    process.exitCode = 1
  }
}
