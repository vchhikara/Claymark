# Claymark — activity ledger (canonical)

Canonical activity ledger required by the vargr-build-rules executor
protocol. Covers this session's pass only. The v1.0.0 delivery's full
checkpoint/decision/error history lives in `plan/04-STATE-LEDGER.md` — this
table does not duplicate it.

Session: vargr-build-rules executor pass, 2026-09-06, branch `ui-wip`,
starting commit `94be163`.

## Verdict vocabulary
`PASS · FAIL · BLOCKED · DEFERRED · ESCALATE`

## Discovery — initial state (before any change)

| ID | Check | Evidence | Verdict |
|---|---|---|---|
| L-001 | `pnpm tsc --noEmit` runnable | `Cannot find module '.../typescript/bin/tsc'` — `node_modules` present but incomplete (40 top-level entries, most packages not linked) | FAIL |
| L-002 | `pnpm install --frozen-lockfile` | `ERR_PNPM_OUTDATED_LOCKFILE` — `package.json`'s `radix-ui: "^1.6.7"` (a range specifier) not reflected in the lockfile's specifier field | FAIL |
| L-003 | `git status` | working tree dirty: 9 files, ~270 uncommitted lines, since the last commit (`94be163`) which itself recorded a clean tree | BLOCKED (needed triage, not a defect) |

## Root-cause → correction → revalidation

| ID | Root cause | Correction | Revalidate | Verdict |
|---|---|---|---|---|
| L-004 | `radix-ui` pinned with `^` in `package.json`, the sole range specifier in the file, violating this project's own zero-range-specifier invariant (`plan/03-CHECKLIST.md` G0 criterion C3) | Pinned exact `1.6.7` | `grep -cE '"[\^~]' package.json` → 0; `pnpm install --frozen-lockfile` → exit 0, resolved version unchanged | PASS |
| L-005 | `@types/mdast` pinned at `3.0.15` (unist-v2, loosely-typed `type: string`), incompatible with `@types/hast@3.0.5` (unist-v3, strict literal discriminants) — a stale dependency the earlier `@types/hast` v3 alignment (session-3 `CP-007` in `plan/04-STATE-LEDGER.md`) never had its counterpart applied to | Bumped to `4.0.4` (unist-v3), matching the transitively-resolved version already used by `remark`/`mdast-util-*` at runtime | `pnpm tsc --noEmit` — surfaced 17 previously-hidden real type errors (see L-006/L-007), none newly introduced by the bump itself | PASS (bump correct; surfaced pre-existing gaps, addressed below) |
| L-006 | `src/pipeline/plugins/shiki-config.ts` imported `HighlighterGeneric` from `'shiki'`'s top-level export, which does not reliably flatten through shiki 1.6.0's `export * from '@shikijs/core'` re-export chain under `moduleResolution: "bundler"` + `typescript@5.4.5` | Switched to shiki's own directly (non-`export *`) named-exported `Highlighter` type alias — identical resolved type | `pnpm tsc --noEmit` on this file → 0 errors | PASS |
| L-007 | Every `processor.parse(x)` result fed into the shared `processor`'s `.run()`/`.runSync()` — 15 call sites across `src/pipeline/streaming/reconcile.ts`, `bench/{index,stress,security-final,corpus/render-snapshot}.*`, `tests/{a11y,fast-path,security}.spec.ts` — is statically an mdast `Root` (can contain `Html` nodes) being passed where the shared `processor`'s composed-plugin-chain generics resolve the parameter as hast `Root` (cannot). Masked before L-005 by `@types/mdast@3`'s loose typing; a real, pre-existing static gap, not a runtime one (`allowDangerousHtml:false` + the `htmlToText` handler in `src/pipeline/processor.ts` mean no `Html` node ever actually reaches this boundary at runtime) | Added `as Root` to the `.parse()` output at all 15 sites — mirrors the cast-at-usage-site convention already used at every one of these sites for the *return* value | `pnpm tsc --noEmit` → 0 errors, full project | PASS |
| L-008 | `pnpm lint` crashed outright (`Cannot find module 'find-up'`) — a corrupted `node_modules/.pnpm/eslint@9.3.0` link, not a lockfile/specifier problem | `rm -rf node_modules && pnpm install --frozen-lockfile` (full relink from the pnpm content-addressable store, already warm — no re-download) | `pnpm lint` → runs; 7 errors, cross-checked against `docs/SYNC-HANDOFF.md`'s own list — all previously documented, 0 new | PASS |
| L-009 | `tests/responsive.spec.ts` (3 test files incl. 2 stale worktree copies) failed: Playwright's Chromium binary was never downloaded in this environment | `pnpm exec playwright install chromium` | `npx vitest run tests/responsive.spec.ts` → 3/3 files, 9/9 tests pass | PASS |

## Per-phase consolidated verification (this session's deliverable, taken together)

| ID | Scope | Check | Evidence | Verdict |
|---|---|---|---|---|
| L-010 | Whole project | `pnpm tsc --noEmit` | exit 0, 0 errors | PASS |
| L-011 | Whole project | `pnpm lint` | 7 errors — `react/no-danger` (rule-not-found, ×1 main + ×2 stale worktrees), `prefer-const` (×1 + ×2 stale worktrees), `react-hooks/exhaustive-deps` (rule-not-found, ×1) — all confirmed pre-existing per `docs/SYNC-HANDOFF.md`, 0 new | PASS (with disclosed pre-existing findings) |
| L-012 | Whole project | `pnpm test` | 355/355 tests, 54/54 files (includes 2 stale-worktree triplications of the whole suite) — no flakes this run, incl. the normally-flaky `stress.spec.ts` S-01 | PASS |
| L-013 | Library build | `pnpm build` | exit 0; `dist/claymark.js` (807 B entry, delegates to `dist/index-B-L2oCXT.js` 416,829 B) + `dist/claymark.cjs` (1,043 B entry, delegates to `dist/index-BKLaPdSh.cjs` 268,671 B) + `.d.ts` files present | PASS |
| L-014 | PWA build | `pnpm build:app` | exit 0; `dist/app/*` produced (chunk-size warning only, pre-existing, not a failure) | PASS |
| L-015 | Working tree | `git status --short` after commits | clean except `plan/.claude/settings.local.json` (untracked, empty `{}`, machine-local — left alone, matches the existing convention of not tracking `.claude/settings.local.json`) | PASS |

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-001 | Split the fix work into two commits (`01097cb` dependency/type fixes, `bb8675b` pre-existing UI-wip changes) rather than one | Rule 4 (don't mix unrelated systems in one change) — the two are unrelated in origin and purpose |
| D-002 | Did not push `ui-wip` or open a PR | `docs/SYNC-HANDOFF.md` explicitly says ask first; also an outward-facing/"explicit permission required" action under this session's standing operating rules, which the executor protocol's "no human gates" instruction does not override |
| D-003 | Did not remove the stale `.claude/worktrees/*` directories despite them tripling test runtime | Same as D-002 — `docs/SYNC-HANDOFF.md` says ask before `git worktree remove`; logged in `progress.md` instead |
| D-004 | Did not attempt to reconcile `docs/SPEC.md`'s typography numbers against `ui-wip`'s token changes, or theme the two new hardcoded pill colors | Out of this pass's stated scope (`spec.md`); a design decision belonging to whoever owns the UI-polish work, not an environment/build-health fix |
| D-005 | Did not attempt `DEF-001/003/005/006/007/008` closure or macOS/Windows cross-builds | Out of scope for this pass; logged in `progress.md`, not silently dropped |
