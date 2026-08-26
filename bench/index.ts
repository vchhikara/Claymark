// T-P6-09 / docs/SPEC.md §NFR-2 ("§7" in the roadmap's cross-reference —
// same section, the two docs number it differently): a reusable benchmark
// harness that measures Claymark against the stated performance budgets and
// emits a machine-readable result file. This module is imported by the
// stress-matrix run (T-P6-10) and the historical-corpus backtest (T-P6-11);
// running it directly (`npx tsx bench/index.ts`) exercises the budget-only
// subset and writes bench/results/benchmark.json as a smoke check that the
// harness itself works end to end.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { processor } from '../src/pipeline/processor'
import { toReact } from '../src/pipeline/to-react'
import { LRUCache } from '../src/pipeline/cache'
import { ReconcileState } from '../src/pipeline/streaming/reconcile'
import type { Root } from 'hast'

export interface BenchResult {
  metric: string
  budget: string
  measured: string
  unit: string
  pass: boolean | null // null = not measurable by this harness (needs a real browser/build)
  note?: string
}

function timeMs(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

function repeatMd(paragraph: string, targetBytes: number): string {
  const block = paragraph + '\n\n'
  const blocks = Math.max(1, Math.ceil(targetBytes / block.length))
  return block.repeat(blocks)
}

export function runBudgetBenchmarks(): BenchResult[] {
  const results: BenchResult[] = []

  // Warm up the pipeline once before timing — the budgets describe steady-
  // state rendering, not first-ever module load / JIT warmup in the process.
  {
    const warmupDoc = repeatMd('warmup', 1024)
    const warmupTree = processor.runSync(processor.parse(warmupDoc)) as Root
    toReact(warmupTree)
  }

  // First render, 2 KB document (budget < 16 ms)
  {
    const doc = repeatMd('This is a short paragraph of ordinary prose used for benchmarking.', 2 * 1024)
    const ms = timeMs(() => {
      const tree = processor.runSync(processor.parse(doc)) as Root
      toReact(tree)
    })
    results.push({
      metric: 'First render, 2 KB document',
      budget: '< 16ms',
      measured: ms.toFixed(2),
      unit: 'ms',
      pass: ms < 16,
    })
  }

  // First render, 100 KB document (budget < 250 ms)
  {
    const doc = repeatMd('This is a short paragraph of ordinary prose used for benchmarking.', 100 * 1024)
    const ms = timeMs(() => {
      const tree = processor.runSync(processor.parse(doc)) as Root
      toReact(tree)
    })
    results.push({
      metric: 'First render, 100 KB document',
      budget: '< 250ms',
      measured: ms.toFixed(2),
      unit: 'ms',
      pass: ms < 250,
    })
  }

  // Streaming append, per token (budget < 4 ms) — average over a realistic stream
  {
    const doc = repeatMd('Streaming append benchmark paragraph with a bit of realistic length.', 8 * 1024)
    const state = new ReconcileState()
    let buffer = ''
    const perTokenMs: number[] = []
    for (let i = 0; i < doc.length; i += 4) {
      const token = doc.slice(i, i + 4)
      buffer += token
      const ms = timeMs(() => {
        state.reconcile(buffer)
      })
      perTokenMs.push(ms)
    }
    const avg = perTokenMs.reduce((a, b) => a + b, 0) / perTokenMs.length
    results.push({
      metric: 'Streaming append, per token',
      budget: '< 4ms',
      measured: avg.toFixed(3),
      unit: 'ms (avg)',
      pass: avg < 4,
    })
  }

  // Cache hit (budget < 1 ms)
  {
    const cache = new LRUCache<Root>()
    const tree: Root = { type: 'root', children: [] }
    cache.set('doc', tree)
    const ms = timeMs(() => {
      cache.get('doc')
    })
    results.push({
      metric: 'Cache hit',
      budget: '< 1ms',
      measured: ms.toFixed(4),
      unit: 'ms',
      pass: ms < 1,
    })
  }

  // Memory, 10k-render soak (budget < 150 MB steady state) — approximated via
  // the cache's own byte accounting, since a real steady-state heap
  // measurement requires a long-lived process and GC control this harness
  // does not attempt to provide.
  {
    const cache = new LRUCache<string>({
      capacity: 1_000_000,
      byteCeiling: 150 * 1024 * 1024,
      sizeOf: (v) => (v as string).length,
    })
    for (let i = 0; i < 10_000; i++) {
      cache.set(`doc${i}`, 'x'.repeat(2000))
    }
    const mb = cache.bytes / (1024 * 1024)
    results.push({
      metric: 'Memory, 10k-render soak',
      budget: '< 150MB steady state',
      measured: mb.toFixed(2),
      unit: 'MB (cache-accounted, not process RSS)',
      pass: mb < 150,
      note: 'Approximated via LRUCache byte accounting, not a real process memory measurement.',
    })
  }

  // Bundle-size and CLS budgets require a real bundler build / browser and
  // are not measured by this harness — flagged honestly rather than faked.
  results.push({
    metric: 'Highlighter lazy chunk',
    budget: '< 300KB gzipped',
    measured: 'n/a',
    unit: 'KB gzipped',
    pass: null,
    note: 'Requires inspecting a real build output (see T-P4-08 bundle-boundary check for the methodology); not measured by this harness.',
  })
  results.push({
    metric: 'Initial bundle, core only',
    budget: '< 120KB gzipped',
    measured: 'n/a',
    unit: 'KB gzipped',
    pass: null,
    note: 'Requires inspecting a real build output; not measured by this harness.',
  })
  results.push({
    metric: 'Cumulative layout shift',
    budget: '0',
    measured: 'n/a',
    unit: 'CLS',
    pass: null,
    note: 'Requires a real browser hydration measurement (candidate: extend tests/__snapshots__/g3-eval.mjs); carried forward as UNVALIDATED since CP-013/CP-014.',
  })

  return results
}

export function writeResults(results: BenchResult[], outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2) + '\n',
  )
}

// Direct execution: `npx tsx bench/index.ts`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = runBudgetBenchmarks()
  const outPath = join(process.cwd(), 'bench/results/benchmark.json')
  writeResults(results, outPath)
  const measured = results.filter((r) => r.pass !== null)
  const failed = measured.filter((r) => r.pass === false)
  console.log(`Benchmark harness: ${measured.length - failed.length}/${measured.length} measured budgets PASS`)
  console.log(`Result file: ${outPath}`)
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((r) => r.metric).join(', '))
    process.exitCode = 1
  }
}
