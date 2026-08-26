import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runBudgetBenchmarks, writeResults } from '../bench/index'

describe('G6 — Benchmark harness (T-P6-09)', () => {
  it('emits a machine-readable (valid JSON) result file with one entry per budget metric', () => {
    const dir = mkdtempSync(join(tmpdir(), 'claymark-bench-'))
    const outPath = join(dir, 'benchmark.json')
    try {
      const results = runBudgetBenchmarks()
      writeResults(results, outPath)

      expect(existsSync(outPath)).toBe(true)
      const parsed = JSON.parse(readFileSync(outPath, 'utf8'))
      expect(typeof parsed.generatedAt).toBe('string')
      expect(Array.isArray(parsed.results)).toBe(true)
      expect(parsed.results.length).toBeGreaterThanOrEqual(8)

      for (const entry of parsed.results) {
        expect(typeof entry.metric).toBe('string')
        expect(typeof entry.budget).toBe('string')
        expect(typeof entry.measured).toBe('string')
        expect('pass' in entry).toBe(true)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  // Timing-based, not pass/fail: under a shared test runner with other spec
  // files executing concurrently, CPU contention can push a tight budget
  // (e.g. the 16ms first-render-2KB budget) over threshold even though the
  // harness and the underlying pipeline are both correct — rigorous,
  // isolated budget verification is T-P6-10's job (the stress-matrix run),
  // not this smoke test's. This just confirms every metric produced a real
  // number, not NaN/undefined.
  it('produces a finite, non-negative measurement for every directly-measurable metric', () => {
    const results = runBudgetBenchmarks()
    for (const r of results.filter((r) => r.pass !== null)) {
      const value = Number(r.measured)
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
