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

## Correction — L-005 and L-007 were wrong; superseded here

Per Rule 6 (never continue past a failed revalidation) and Rule 10 (no
completion claim without evidence): after committing `01097cb` (which
included L-005/L-007's fix) and separately fixing `pnpm lint`'s corrupted
`node_modules` (L-008, which required a *second* `rm -rf node_modules &&
pnpm install --frozen-lockfile`), a routine re-run of `pnpm tsc --noEmit`
— done as due diligence before the final sweep, not because anything
prompted suspicion — came back with 16 errors, not 0. Investigating:

- **L-005's diagnosis was wrong.** The mdast/hast `Root` mismatch was
  already present in the *very first* `tsc` run of this session, before
  `@types/mdast` was touched at all (re-reading that run's own output
  confirms the error already named `@types+mdast@3.0.15` on one side).
  The "unist-v2's loose typing was masking a real gap" theory was a
  plausible-sounding guess I didn't verify against the actual first-run
  evidence before acting on it. The `@types/mdast` 3.0.15→4.0.4 bump was
  an independently-reasonable alignment (matching `@types/hast`'s own
  unist-v3 move) but was not the fix for L-007's errors and was not
  necessary.
- **The bump had a real, separate side effect.** The dependency graph
  already contained a duplicate, older `mdast-util-from-markdown@1.3.1`/
  `mdast-util-to-string@3.2.0` pair (pulling their own `@types/mdast@3.0.15`)
  alongside the modern `remark-parse@11`-generation chain (which pulls
  `@types/mdast@4.0.4` regardless of what this project's own
  `package.json` declares). With my own devDependency *also* at 4.0.4,
  pnpm happened to dedupe my top-level import onto the same nominal
  instance the internal chain uses, which is why `pnpm tsc --noEmit`
  read 0 errors right after L-007's fix — coincidentally, not because
  the fix was structurally correct. Reverting `@types/mdast` back to
  `3.0.15` (undoing L-005) made the coincidental dedupe stop, and the
  *same* 16 errors reappeared, now in a stable, deterministic form
  (confirmed via 3 consecutive re-runs) rather than the address-order-
  dependent flip seen mid-investigation.
- **L-007's actual root cause:** `processor.runSync`'s parameter type is
  determined by `remark-parse`'s own internal, modern `@types/mdast@4.0.4`
  — *not* by this project's own `@types/mdast` devDependency version at
  all. `processor.parse(x)` already naturally returns exactly that type.
  My `as Root` (hast) cast on the `.parse()` output was therefore
  actively wrong — it was overriding an already-correct inferred type
  with an incorrect one. Removing the cast at all 15 sites (verified:
  each file is now byte-identical to the pre-session baseline `94be163`
  for this specific change) restored `pnpm tsc --noEmit` to a
  deterministic 0 errors, confirmed across 3 consecutive runs.

| ID | Correction | Revalidate | Verdict |
|---|---|---|---|
| L-005R (supersedes L-005) | Reverted `@types/mdast` to `3.0.15` (original value) | `pnpm tsc --noEmit` ×3 consecutive runs → 0 errors each time; `git diff 94be163 -- package.json` shows only the L-004 `radix-ui` change remains | PASS |
| L-007R (supersedes L-007) | Reverted the `as Root` cast on `processor.parse(...)` at all 15 sites (no cast needed) | `git diff 94be163 -- <the 8 affected files>` → empty (byte-identical to baseline); `pnpm tsc --noEmit` ×3 → 0 errors | PASS |

Net effect: the only files that actually needed a change for `pnpm tsc
--noEmit` to pass are `package.json`/`pnpm-lock.yaml` (L-004, the
`radix-ui` range specifier) and `src/pipeline/plugins/shiki-config.ts`
(L-006). L-002/L-003 (the corrupted `node_modules`) were real and
required the reinstalls regardless.

## Per-phase consolidated verification (this session's deliverable, taken together)

| ID | Scope | Check | Evidence | Verdict |
|---|---|---|---|---|
| L-010 | Whole project | `pnpm tsc --noEmit` | exit 0, 0 errors — **superseded, see L-005R/L-007R above**: this specific run's green result was a coincidental dependency-dedupe artifact, not evidence the fix was correct. Re-verified 0 errors ×3 after the correction, on the actually-correct code | PASS (as corrected) |
| L-011 | Whole project | `pnpm lint` | 7 errors — `react/no-danger` (rule-not-found, ×1 main + ×2 stale worktrees), `prefer-const` (×1 + ×2 stale worktrees), `react-hooks/exhaustive-deps` (rule-not-found, ×1) — all confirmed pre-existing per `docs/SYNC-HANDOFF.md`, 0 new. Unaffected by the L-005/L-007 correction (re-run gave identical output) | PASS |
| L-012 | Whole project | `pnpm test` | 355/355 tests, 54/54 files (includes 2 stale-worktree triplications of the whole suite) — no flakes this run, incl. the normally-flaky `stress.spec.ts` S-01. This run predates the L-005/L-007 correction, but the reverted lines were pure type-level casts with zero runtime effect (`as Root` erases at compile time either way), so this evidence still holds; re-run after the correction for full confidence — see L-012R | PASS |
| L-013 | Library build | `pnpm build` | exit 0; `dist/claymark.js` (807 B entry, delegates to `dist/index-B-L2oCXT.js` 416,829 B) + `dist/claymark.cjs` (1,043 B entry, delegates to `dist/index-BKLaPdSh.cjs` 268,671 B) + `.d.ts` files present. Same type-erasure caveat as L-012 — re-run after the correction, see L-013R | PASS |
| L-014 | PWA build | `pnpm build:app` | exit 0; `dist/app/*` produced (chunk-size warning only, pre-existing, not a failure). Re-run after the correction, see L-013R | PASS |
| L-015 | Working tree | `git status --short` after commits | clean except `plan/.claude/settings.local.json` (untracked, empty `{}`, machine-local — left alone, matches the existing convention of not tracking `.claude/settings.local.json`) | PASS |
| L-012R | Whole project, post-correction | `pnpm test` | 354/355, 53/54 files — one failure, `tests/stress.spec.ts`, on the full-suite concurrent run. Re-ran that file alone: 6/6 pass (incl. both stale-worktree copies), confirming this is `DEF-005` (`plan/04-STATE-LEDGER.md`), the pre-existing, already-disclosed timing flake that only reproduces under full-suite load — same diagnosis pattern as its original discovery — not a regression from the L-005R/L-007R correction | PASS (pre-existing flake, not a regression) |
| L-013R | Library + PWA build, post-correction | `pnpm build` && `pnpm build:app` | both exit 0, real non-empty bundles (re-run after reverting L-005/L-007) | PASS |
| L-016 | `.claude/worktrees/{objective-sinoussi-6193de,optimistic-sinoussi-38bf13}` — user explicitly asked to close them (superseding D-003's "ask first") | Verified both branches' tips (`4ca408b`, `4dbc049`) are ancestors of `origin/master` via `git merge-base --is-ancestor` before touching anything; checked each worktree for uncommitted work (`git status --short` — only untracked `.claude/` local-settings dirs and one untracked historical handoff doc, `docs/SYNC-HANDOFF-B.md`, itself confirming "all committed, all merged"); ran `git worktree remove --force` on each | `git worktree list` → only the main checkout remains; `.claude/worktrees/` empty; `git status --short` on the main checkout unaffected | PASS |
| L-017 | `vargr/objective-sinoussi-6193de` / `vargr/optimistic-sinoussi-38bf13` (the now-worktree-less local branches from L-016) — user explicitly asked to delete them | `git branch -d` (safe mode, not `-D`) on both — this mode itself refuses if a branch isn't fully merged, an independent corroboration of the `git merge-base --is-ancestor` check already done at L-016 | Both deleted without git raising its own not-merged objection; `git branch --list "vargr/*"` → empty | PASS |
| L-018 | Push `ui-wip` + open a PR — user explicitly asked (supersedes D-002's "ask first") | `git push origin ui-wip` (`94be163..02de572`, fast-forward, no force); `gh pr list --head ui-wip` first confirmed no pre-existing PR to avoid a duplicate; `gh pr create --base master --head ui-wip` | Push: `To .../Claymark.git\n   94be163..02de572  ui-wip -> ui-wip`. PR: `https://github.com/vchhikara/Claymark/pull/4` | PASS |

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-001 | Split the fix work into two commits (`01097cb` dependency/type fixes, `bb8675b` pre-existing UI-wip changes) rather than one | Rule 4 (don't mix unrelated systems in one change) — the two are unrelated in origin and purpose |
| D-002 | Did not push `ui-wip` or open a PR | `docs/SYNC-HANDOFF.md` explicitly says ask first; also an outward-facing/"explicit permission required" action under this session's standing operating rules, which the executor protocol's "no human gates" instruction does not override. **Superseded by D-007.** |
| D-003 | Did not remove the stale `.claude/worktrees/*` directories despite them tripling test runtime | Same as D-002 — `docs/SYNC-HANDOFF.md` says ask before `git worktree remove`; logged in `progress.md` instead. **Superseded by D-006.** |
| D-004 | Did not attempt to reconcile `docs/SPEC.md`'s typography numbers against `ui-wip`'s token changes, or theme the two new hardcoded pill colors | Out of this pass's stated scope (`spec.md`); a design decision belonging to whoever owns the UI-polish work, not an environment/build-health fix |
| D-005 | Did not attempt `DEF-001/003/005/006/007/008` closure or macOS/Windows cross-builds | Out of scope for this pass; logged in `progress.md`, not silently dropped |
| D-006 (supersedes D-003) | Removed both stale worktrees (L-016) | User explicitly asked, in a later turn — the exact permission D-003 was withholding pending. Did not additionally delete the now-orphaned local branches (`vargr/objective-sinoussi-6193de`, `vargr/optimistic-sinoussi-38bf13`) — not asked for; logged as an optional follow-up in `progress.md` instead. **Superseded by D-008.** |
| D-007 (supersedes D-002) | Pushed `ui-wip` and opened a PR (L-018) | User explicitly asked, in a later turn — the exact permission D-002 was withholding pending |
| D-008 (supersedes D-006) | Deleted the now-worktree-less local branches `vargr/objective-sinoussi-6193de` / `vargr/optimistic-sinoussi-38bf13` (L-017) | User explicitly asked, in a later turn — the optional follow-up D-006 had left undone |

## Session 2 — Android-parity desktop chrome, 2026-09-18, branch `master`

User approved the full 6-phase plan in `android-to-desktop-checklist.md`
("approved and do not stop until all of the plan is implemented full 6
phases"), authorizing the desktop app specifically to become a real
document editor, overriding the "not a Markdown editor" non-goal for that
target only.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-019 | Phases 1–6 implemented (design tokens/claymorphism, Tauri OS integration + session state machine, app shell/routing/screens/drawer, search/TOC/abandon-draft dialogs, file-association + drag-drop + paste, Tauri bundle re-verified) | `pnpm tsc --noEmit` clean per phase; `pnpm test` green per phase; dev-server browser verification at each phase close | PASS |
| L-020 | Brand-mark "C" logo rendered as a solid blob, not a "C" | Root cause: hand-computed SVG arc `A` command with ambiguous sweep-flags. Fixed via a `<mask>`-based ring (outer/inner circle) + wedge polygon cutout in `BrandMark.tsx`. Found from the user's own screenshot of the packaged app, not caught by any automated check | PASS |
| L-021 | App crashed entirely in a plain-browser context (`TypeError: Cannot read properties of undefined`) | Root cause: `onOpenFileFromOS`/`onWindowFileDrop` (`tauriEvents.ts`) called `@tauri-apps/api`'s `listen()`/`getCurrentWebview()` unconditionally in a mount effect — these throw outside a real Tauri webview. Fixed with an `isTauriRuntime()` guard (`'__TAURI_INTERNALS__' in window`) that no-ops both functions otherwise. Found only because a later prompt forced a fresh browser reload — the full vitest suite does not mount `main.tsx`'s real effects and did not catch this | PASS |
| L-022 | User reported (with 12 Android-app reference screenshots): "zero claymorphism in desktop app, no sidebar, no settings, no help, privacy policy, no separate edit mode" | Investigated live rather than assumed: Drawer/Settings/Help/Privacy/Edit-mode all existed and worked — the real causes were (a) the hamburger/menu icon rendering fully invisible (missing `color` on a text-glyph button, same class of bug fixed earlier for `WelcomeScreen`'s buttons) and (b) claymorphism CSS built in Phase 1 was never applied past `Drawer`'s Recent panel, `SearchBar`, and the edit textarea — `Button`/`Dialog`/`ReaderHeader`/`SettingsScreen`/`FormattingToolbar` were all still flat. Fixed both | PASS |
| L-023 | User-attached photo of the running native app showed formatting-toolbar buttons rendering as blank white pills with invisible glyphs | Root cause: `.pb-button[data-variant='outline']`/`'secondary']`, `.pb-dialog-content`, `.pb-clay-raised`, `.pb-clay-pot` all set `background-image` (a `linear-gradient()` using `color-mix()`) with **no** `background-color` fallback — if the runtime WebKit doesn't support `color-mix()`, the whole declaration is dropped, leaving the browser's default white button background under light-colored text. Added a solid `background-color` ahead of every affected gradient | PASS |
| L-024 | Testing found: clicking "Discard" in the abandon-draft dialog navigated back but left the edited text applied in memory | Root cause: no tracking of last-committed content: `source` was only ever set forward, never reverted. Added `lastCommittedSourceRef` (updated on load/save/autosave-success) and reset `source`/`sourceRef` to it in `onDiscard` | PASS |
| L-025 | Testing found: Back from Settings (opened via the Welcome-screen drawer, no document loaded) landed on an empty "Untitled" reader | Root cause: `routeReducer`'s `BACK` unconditionally sends any sub-screen to `'reader'` (a real, tested contract — `tests/routing.spec.tsx` — correct when a document is loaded). Fixed one layer up: `routeContextValue.back()` in `main.tsx` checks `session.document` and redirects to `'welcome'` instead when none exists, leaving the reducer and its tests untouched | PASS |
| L-026 | Full walkthrough screenshot set, 13 screens/dialogs, captured via `html2canvas` injected into the live dev preview + a small local Python server receiving the PNGs (Playwright's own screenshot tool was unavailable — `chrome` channel not installed, no root to install it) | `docs/screenshots/2026-09-18-app-walkthrough/` (not committed — local-only per the user) | PASS |
| L-027 | Full regression after all fixes | `pnpm tsc --noEmit` 0 errors; `pnpm test` 190/192 passing — the 2 failures (`tests/stress.spec.ts` S-01 timing, `tests/useStreamingMarkdown.spec.tsx` Shiki-hydration timing) are pre-existing flakes unrelated to `src/app/`, confirmed by scope (neither touches anything this session changed) | PASS |
| L-028 | Committed and pushed | `git commit` (no `docs/screenshots/`, `fiverr-screenshots/`, or `.notion_sync_state.json` staged, per the user), `git pull --rebase origin master` (one unrelated remote commit, a README banner), `git push origin master` → `b085c6e..8f1bda7` | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-009 | Did not fix `checklist §2`/`§8` (core rendering / explicitly-not-required items) | Out of the approved 6-phase plan's scope |
| D-010 | Left `routeReducer`'s `BACK` contract and its test (`tests/routing.spec.tsx`) unchanged; fixed the Settings→empty-reader bug one layer up in `main.tsx` instead | The reducer's "sub-screen → reader" rule is correct and tested when a document is loaded — the actual bug was reachable only from the no-document Welcome-screen path, which the reducer has no way to know about (pure function of `Route` alone) |
| D-011 | Excluded `docs/screenshots/2026-09-18-app-walkthrough/` from the commit | User explicitly asked not to push the screenshot folder — kept as a local-only verification artifact |
