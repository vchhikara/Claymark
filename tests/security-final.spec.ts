import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runSecurityFinal, writeSecurityResults } from '../bench/security-final'

// T-P8-08: re-runs the full security suite from T-P2-12 against the
// completed build and pins the result — a regression here means the
// standalone bench/results/security-final.json artifact (G8) has gone
// stale relative to the pipeline's actual behavior.
describe('G8 — Security suite final re-run (T-P8-08)', () => {
  it('emits a machine-readable result file with every category present', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claymark-security-'))
    const outPath = join(dir, 'security-final.json')
    try {
      const results = await runSecurityFinal()
      writeSecurityResults(results, outPath)

      expect(existsSync(outPath)).toBe(true)
      const parsed = JSON.parse(readFileSync(outPath, 'utf8'))
      expect(parsed.results.map((r: { category: string }) => r.category)).toEqual([
        'XSS corpus (NFR-1.2 · G2-C2)',
        'Malicious-URL fixtures (G2-C5)',
        'External link rel hardening (NFR-1.4 · G2-C6)',
        'No <script> nodes in any output path (G2-C3)',
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 120_000)

  it('every category passes 100%, no regression', async () => {
    const results = await runSecurityFinal()
    const failed = results.filter((r) => !r.pass)
    expect(failed.map((r) => r.category)).toEqual([])
  }, 120_000)
})
