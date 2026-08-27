import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runStressMatrix, writeStressResults } from '../bench/stress'

// This suite re-runs the full 12-scenario stress matrix (T-P6-10), which is
// deliberately heavy (5 MB document, 1000x1000 table, 100k-char streaming
// simulation, 1000 display equations, ...) — a long timeout is expected and
// correct, not a sign anything is wrong.
describe('G6 — Stress matrix S-01..S-12 (T-P6-10)', () => {
  it('emits a machine-readable result file with all 12 scenarios present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'claymark-stress-'))
    const outPath = join(dir, 'stress.json')
    try {
      const results = runStressMatrix()
      writeStressResults(results, outPath)

      expect(existsSync(outPath)).toBe(true)
      const parsed = JSON.parse(readFileSync(outPath, 'utf8'))
      const ids = parsed.results.map((r: { id: string }) => r.id)
      expect(ids).toEqual([
        'S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06',
        'S-07', 'S-08', 'S-09', 'S-10', 'S-11', 'S-12',
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 180_000)

  it('every fully-measurable scenario (no browser/not-yet-built dependency) passes', () => {
    const results = runStressMatrix()
    const measurable = results.filter((r) => r.pass !== null)
    const failed = measurable.filter((r) => r.pass === false)
    expect(failed.map((r) => r.id)).toEqual([])
  }, 180_000)
})
