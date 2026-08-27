import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// T-P6-11 / GATE G6 (Class 3 — historical corpus backtest). Unlike the
// stress matrix (T-P6-10, cheap enough to regenerate live every run), a
// backtest re-render requires an actual git worktree checked out at the
// frozen baseline commit (see bench/backtest.ts) — an expensive, external-git
// operation not suited to running on every test invocation. This suite
// instead validates the recorded evidence: the frozen corpus is exactly the
// specified 250-document composition, and the last backtest run (bench/backtest.ts)
// found zero unexplained diffs. Re-run bench/corpus/generate.ts +
// bench/backtest.ts's worktree procedure (see its file header) to regenerate
// this evidence at G6/G7/G8 per plan/02-VERIFICATION-GATES.md.

const ROOT = process.cwd()

describe('G6 — Historical corpus backtest (T-P6-11)', () => {
  it('the frozen corpus has exactly 250 documents in the specified composition', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'bench/corpus/manifest.json'), 'utf8'))
    expect(manifest.total).toBe(250)
    expect(manifest.entries).toHaveLength(250)

    const counts: Record<string, number> = {}
    for (const entry of manifest.entries as Array<{ category: string }>) {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1
    }
    expect(counts).toEqual({
      'long-form-prose': 60,
      'code-heavy': 50,
      'math-papers': 30,
      'diagram-bearing': 20,
      'table-heavy': 30,
      'chat-transcripts': 40,
      adversarial: 20,
    })
  })

  it('every manifest document exists on disk', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'bench/corpus/manifest.json'), 'utf8'))
    for (const entry of manifest.entries as Array<{ path: string }>) {
      expect(existsSync(join(ROOT, entry.path))).toBe(true)
    }
  })

  it('the last recorded backtest run found zero unexplained diffs', () => {
    const resultPath = join(ROOT, 'bench/results/backtest.json')
    expect(existsSync(resultPath)).toBe(true)
    const result = JSON.parse(readFileSync(resultPath, 'utf8'))
    expect(result.totalDocs).toBe(250)
    expect(result.diffs).toEqual([])
    expect(result.pass).toBe(true)
  })

  it('baseline and current snapshot sets both cover all 250 documents', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'bench/corpus/manifest.json'), 'utf8'))
    const ids = new Set((manifest.entries as Array<{ id: string }>).map((e) => `${e.id}.html`))

    for (const dir of ['bench/results/backtest-baseline', 'bench/results/backtest-current']) {
      const files = new Set(readdirSync(join(ROOT, dir)))
      expect(files.size).toBe(250)
      for (const id of ids) expect(files.has(id)).toBe(true)
    }
  })
})
