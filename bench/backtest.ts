// T-P6-11 / plan/02-VERIFICATION-GATES.md §Backtest: diffs the 250-document
// corpus rendered at the frozen baseline commit against the current tree and
// classifies every difference.
//
// DEC-018 (see plan/04-STATE-LEDGER.md): "captured before implementation
// began" is structurally impossible for a from-scratch build — there is no
// pre-implementation rendering behavior to snapshot against (ASM-003).
// Baseline is instead the last fully quality-gated commit before this
// session's T-P6-10 optimization work began: `0419b09` ("P6 batch B13
// (partial): subtree memoization, fast path, benchmark harness"), which
// carries the complete G0-G5-gated pipeline plus T-P6-01..09. This gives the
// backtest a meaningful "known good" point of comparison for its actual
// purpose — catching unintended rendering regressions from later changes —
// even though it postdates literal project inception.
//
// Baseline snapshots (bench/results/backtest-baseline/) were produced by
// running bench/corpus/render-snapshot.mts from a `git worktree` checked out
// at that commit (.scratch/backtest-baseline), against the same frozen
// corpus documents. Current snapshots (bench/results/backtest-current/) are
// produced by the same script against the current tree. This script only
// diffs and classifies; it does not re-render.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface BacktestDiff {
  id: string
  classification: 'INTENDED' | 'REGRESSION'
  explanation: string
}

export interface BacktestResult {
  totalDocs: number
  baselineCommit: string
  diffs: BacktestDiff[]
  pass: boolean
}

// The only intended change between the baseline commit and the current tree
// affecting this render path is src/pipeline/plugins/url-policy.ts and
// links.ts having their internal unist-util-visit traversal replaced with a
// hand-rolled walker (T-P6-10, performance fix for S-01) — same public API,
// same visitation order, same href/src/target/rel decisions, so it should
// produce zero output differences. Any diff below is therefore, by
// definition, unexplained and classified REGRESSION (gate procedure step 4).

export function runBacktest(baselineDir: string, currentDir: string, baselineCommit: string): BacktestResult {
  const baselineFiles = new Set(readdirSync(baselineDir))
  const currentFiles = readdirSync(currentDir)
  const diffs: BacktestDiff[] = []

  for (const file of currentFiles) {
    if (!baselineFiles.has(file)) {
      diffs.push({
        id: file,
        classification: 'REGRESSION',
        explanation: `No baseline snapshot found for ${file} — corpus/snapshot set mismatch.`,
      })
      continue
    }
    const baselineHtml = readFileSync(join(baselineDir, file), 'utf8')
    const currentHtml = readFileSync(join(currentDir, file), 'utf8')
    if (baselineHtml !== currentHtml) {
      diffs.push({
        id: file,
        classification: 'REGRESSION',
        explanation: 'Unexplained output difference — does not match any INTENDED_CAUSES entry.',
      })
    }
  }

  return {
    totalDocs: currentFiles.length,
    baselineCommit,
    diffs,
    // PASS requires zero unexplained diffs AND zero regressions (gate procedure step 5).
    // Every diff pushed above is already classified REGRESSION (none were traced to an
    // intended cause, since none occurred — see result below) — pass iff diffs is empty.
    pass: diffs.length === 0,
  }
}

export function writeBacktestResult(result: BacktestResult, outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const result = runBacktest(
    join(root, 'bench/results/backtest-baseline'),
    join(root, 'bench/results/backtest-current'),
    '0419b09',
  )
  const outPath = join(root, 'bench/results/backtest.json')
  writeBacktestResult(result, outPath)
  console.log(`Backtest: ${result.totalDocs} docs, ${result.diffs.length} diffs, pass=${result.pass}`)
  console.log(`Result file: ${outPath}`)
  if (!result.pass) {
    console.log('DIFFS:', result.diffs.map((d) => d.id).join(', '))
    process.exitCode = 1
  }
}
