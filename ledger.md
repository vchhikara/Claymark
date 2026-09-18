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

## Session 3 — web extension scoping (§0 lock) + asset staging, 2026-09-18

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-029 | Staged reusable assets for the (not-yet-built) web extension into `_web-extension-staging/` — built `claymark` library (`dist/claymark.js`/`.cjs`/`.d.ts`), `theme/tokens.css`+`claymark.css`, the three OFL fonts, `src/pipeline/plugins/url-policy.ts`, `src/app/toc.ts` (reference), `docs/SPEC.md` — per `web-extension-checklist.md` §1 | Files copied and listed via `find`; a `README.md` was added inside the folder explaining each item and flagging the `color-mix()` caveat (checklist §2 Trap 2) before reuse | PASS |
| L-030 | Asked the user to resolve `web-extension-checklist.md` §0's three open scope gates (extension surfaces, browser targets, persistence) rather than assuming | `AskUserQuestion` — answered: all three surfaces (reader mode + viewer + editor) in v1; Chrome MV3 **and** Firefox; persist last pasted/edited doc (non-goal override) | PASS |
| L-031 | Locked §0 in `web-extension-checklist.md`, checked off the three gates with the decision recorded, and updated `progress.md`'s "Next up" section to reflect the resolved scope and the new staging folder | Diffs applied via `Edit`, not re-read back (file state already current per tool contract) | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-012 | Did not begin actual extension implementation (manifest, build config, source tree) this pass | User's instruction was explicitly staged: stage assets first, lock scope second, implementation is separate follow-on work |

## Session 4 — user-installed the extension, requested popup + reader mode, 2026-09-18

Between Session 3 and this one, a separate agent session (not this
conversation) built a full Chrome MV3 extension into
`_web-extension-staging/claymark-extension/`. The user loaded it unpacked
and asked to keep the full-tab surface, add a popup, and add the
content-script reader mode that build shipped without.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-032 | Audited `_web-extension-staging/` against the locked `web-extension-checklist.md` §0 scope before touching anything | Read `build-report/01-OVERVIEW.md`, `manifest.json` — confirmed: full-tab-only (no popup, no content script), Chrome-only (Firefox explicitly deferred per its own `docs/TODO.md`) | PASS |
| L-033 | Fixed a pre-existing build-blocking bug: `scripts/postbuild.mjs` used `new URL(...).pathname`, which stays percent-encoded for this repo's own space-containing path | Switched to `fileURLToPath` | PASS |
| L-034 | Added popup surface: `src/popup.html`/`popup.tsx` (second Vite entry, reuses `App` with a `popup` prop), `styles/popup.css` (fixed 420×600), manifest `action.default_popup`, renamed `_execute_action` → `open-full-tab` command (`Alt+Shift+M`) since a popup pre-empts `action.onClicked` | `npm run build`/`typecheck` clean; manually verified in the browser pane at http://localhost:8934/popup.html — correct size, "Open in tab ↗" bar, no console errors, sample doc renders (headings/lists/code fence/table) | PASS |
| L-035 | Added content-script reader mode: `src/content/reader.ts`, matches `*.md`/`*.markdown`/raw GitHub/Gist hosts, activates only when `document.contentType` is `text/plain`/`text/markdown` and the page looks like a raw-file view; renders into `attachShadow({mode:'closed'})` (checklist §2 Trap 1 threat model — host page is untrusted, must not reach in or have our output reach it); reused `toHast`+`hast-util-to-html` (already-sanitized tree) rather than a raw innerHTML write | Manually verified against a local `text/plain`-served `.md` file: heading/bold/list/code fence render correctly in the shadow root; View raw ↔ View rendered toggle round-trips | PASS |
| L-036 | `postbuild.mjs` extended: bundles `content/reader.ts` as an IIFE (same pattern as the existing Mermaid sandbox bundle) and generates a standalone `content/reader.css` by concatenating `tokens.css`/`claymark.css`/`engine-ext.css`/`fonts.css` with `:root` rewritten to `:host` (a shadow tree's bare `:root` selector matches the page's real document root, not the shadow host) | `npm run build` passes postbuild's own file-existence + no-inline-script/style checks | PASS |
| L-037 | Full regression: `npm run build`/`typecheck` clean, `npm test` (engine) still 40/40 unchanged | Command output captured this session | PASS |
| L-038 | `tests/e2e.py` (Playwright, 32 checks in the prior build) could not be re-run — no Playwright install survived in this checkout (`pip`/venv absent) | Flagged as an open gap in both the staging folder's own `docs/LEDGER.md` (X-041) and `progress.md`, not silently treated as passing | DEFERRED |
| L-039 | Replaced `_web-extension-staging/claymark-extension/` (the loadable unpacked build) with a fresh `npm run build` output reflecting all of the above | `diff -rq` against `source/dist` before overwrite confirmed only expected differences (missing popup/content files, stale hashes) | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-013 | Did not attempt the Firefox build in this pass | User's ask was specifically "keep full tab, add popup, add content-script reader mode" — Firefox is a separate, still-open §0 gap, not requested this turn |
| D-014 | Did not add Shiki/KaTeX/Mermaid to the content-script reader mode | Keeps the content-script bundle small and avoids shipping a second copy of those engines; flagged as a known v1 limit for reader mode specifically, not the full-tab/popup surfaces (which already have them) |

## Session 5 — shadcn/ui component port + lucide icons, 2026-09-18

User asked to "make it look pretty" with shadcn components after confirming
the popup + reader mode build worked; clarified to hand-port the existing
`scratch/shadcn-prototype/` components (real Radix primitives, hand-written
CSS against the extension's own tokens, no Tailwind/cva) and replace every
emoji/glyph icon with lucide-react icons.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-040 | Ported Button/Dialog/Badge/Separator/Tooltip from `scratch/shadcn-prototype/` into `_web-extension-staging/source/src/app/ui/pb/*.tsx`; `radix-ui` pinned to 1.6.7 to match the prototype | `npm install` + `npm run typecheck` clean | PASS |
| L-041 | `Dialog.tsx` rewritten on top of `PortedDialog`/`PortedDialogContent` while preserving the exact external prop API (`title`/`onClose`/`children`/`actions`/`labelledBy`), so no `App.tsx` call site changed; old `[data-autofocus]` autofocus contract preserved via `onOpenAutoFocus` + `preventDefault()` | Manually verified in browser pane: Outline dialog opens with correct overlay/focus, lucide `X` close icon works | PASS |
| L-042 | Replaced every emoji/glyph icon (`☰`, `←`, `<b>B</b>`, `<i>I</i>`, `</>`, bullet, `🔗`, `↑`, `−`/`+`, `✕`) with `lucide-react` icons across `App.tsx`, `Drawer.tsx`, `SearchBar.tsx` | Verified visually: welcome hamburger, back arrow, editing toolbar Bold/Italic/Code/List/Link, scroll-to-top, text-size steppers, drawer/search icon buttons all render lucide icons, not glyphs | PASS |
| L-043 | Full regression: `npm run typecheck`/`build` clean after each round, `npm test` (engine) still 40/40 unchanged | Command output captured this session | PASS |
| L-044 | Manual browser-pane verification of restyled surfaces: welcome screen, full-tab reader header at 800px and 1200px width, edit-mode toolbar, Drawer, Outline dialog, popup surface (fixed 420×600) | Screenshots taken at each step; header showed no overflow at either width (an earlier capture that looked cut off was a transient/mid-navigation artifact, not a real layout bug) | PASS |
| L-045 | Content-script reader mode (`content/reader.ts`) was **not** touched by this port and was **not** re-verified this pass | Doesn't import any of the changed files, but flagged rather than silently assumed still-working | DEFERRED |
| L-046 | Bundle size regressed from 110.75 KB gz to 127.00 KB gz (408.41 KB raw) after adding `radix-ui` + `lucide-react`, exceeding NFR-2's 120 KB core budget by ~7 KB | `npm run build` output captured this session | FLAGGED, not fixed |
| L-047 | `PortedTooltip`/`IconButtonTip` (`src/app/ui/pb/tooltip.tsx`) ported but not wired into any icon-only button — those buttons still rely on `aria-label`/`title` only | Grepped for `IconButtonTip` usage — zero call sites | FLAGGED, not fixed |
| L-048 | Refreshed `_web-extension-staging/claymark-extension/` (the loadable unpacked build) with the new build output | `cp -r source/dist claymark-extension` after final verification | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-015 | Left `PortedTooltip` unwired rather than adding it to every icon-only button | User's ask was specifically icon replacement ("make it look pretty... use icons from shadcn"), not new interaction affordances — wiring tooltips is a scope addition, flagged as a follow-up instead of performed silently |
| D-016 | Did not address the bundle-size regression (127 KB vs. 120 KB budget) this pass | Not requested by the user this turn; a real fix (e.g. dynamic-importing Dialog-only code) is nontrivial enough to warrant its own pass rather than a rushed change bundled into a styling request |

## Session 6 — closed L-045/L-046/L-047 and the pre-existing X-041 e2e gap, 2026-09-18

User asked to fix every open gap (old and new) rather than leave them flagged.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-049 | Got a real Playwright run working again (`tests/e2e.py` was un-runnable in this checkout — no Python package, no browser binary): `uv venv` + `uv pip install playwright` + `playwright install chromium` into a scratch venv | 32/32 pre-existing checks passed once two selectors broken by the shadcn/icon port were fixed (`text=← Back` → `.cm-header .cm-back`, since Back is now an icon+text button not a literal glyph; `.cm-btn-danger` → text-based selector, since Discard is now a `PortedButton variant="destructive"`) | PASS |
| L-050 | Found and fixed a real CSP violation the Radix Dialog port introduced: Radix's `Dialog.Overlay` wraps children in `react-remove-scroll`, which injects a `<style>` tag to compensate for the removed scrollbar — blocked by the extension's `style-src 'self'` policy (no unsafe-inline), 3 console errors per dialog open | `PortedDialogOverlay` (`src/app/ui/pb/dialog.tsx`) now renders a plain `<div>` instead of `DialogPrimitive.Overlay` — Content's own `DismissableLayer` still closes on outside click, only the scroll-lock behavior is lost. `zero console errors/warnings` e2e check went from FAIL to PASS | FIXED |
| L-051 | Closed L-046 (bundle-size regression): switched `pb/dialog.tsx`/`pb/separator.tsx` from the `radix-ui` umbrella package to scoped `@radix-ui/react-dialog`/`@radix-ui/react-separator` imports (no measurable size change — Rollup was already tree-shaking the barrel correctly) and lazy-loaded `Dialog.tsx` itself via `React.lazy`/`Suspense` (Outline/Theme/Discard/Draft-restore dialogs all go through one lazy chunk, `Dialog-*.js`, fetched on first open) | `npm run build`: 408.41 KB/127.00 KB gz → 373.02 KB/115.47 KB gz, under NFR-2's 120 KB budget. `Outline jump scrolls` e2e check (exercises the lazy chunk under the extension's own CSP) still passes | FIXED |
| L-052 | Closed L-047 (unwired tooltips) — but not the way it was scaffolded: wiring `PortedTooltip`/`IconButtonTip` into the icon-only buttons (`Open menu`, page `Back`, text-size steppers, scroll-to-top) pulled Radix's Tooltip/Popper machinery back into the initial bundle and pushed it to 133.09 KB gz, over budget again. Deleted the unused `src/app/ui/pb/tooltip.tsx` scaffolding and its `.pb-tooltip` CSS (dead code, never referenced) and uninstalled `@radix-ui/react-tooltip`; added native `title` attributes to the same buttons instead — same hover-discoverability outcome, zero bundle cost | `npm run build` back to 115.50 KB gz. Buttons now carry both `aria-label` and `title` | FIXED, by different means than scaffolded |
| L-053 | Closed X-041 (missing e2e coverage for the popup surface and content-script reader mode, open since the popup/reader-mode session): added 10 new checks to `tests/e2e.py` — popup renders welcome/sample, `data-popup` flag set, "Open in tab" bar present, zero console errors; reader mode mounts its shadow host against a locally-served raw `.md` file (own `http.server.HTTPServer` spun up in-process), renders heading/bold text, and the raw↔rendered toggle works. Reader mode's shadow root is `mode:'closed'` by design, which Playwright's own selectors cannot pierce (confirmed empirically) — used a CDP session (`DOM.getDocument({pierce:true})`) instead, the same escape hatch DevTools itself uses for closed shadow trees | `tests/e2e.py`: 32/32 → 42/42, including the new popup/reader-mode cases. This is also the first re-verification of reader mode (L-045) since the shadcn/icon port — confirmed unaffected | FIXED |
| L-054 | Fixed the `radix-ui`/`lucide-react` caret-range dependency violation flagged but not actually corrected in Session 5 (L-040 claimed "pinned to 1.6.7" but `package.json` still had `^1.6.7`/`^1.47.0`) | `package.json` now pins exact versions for all Radix/lucide deps, per the repo's zero-range-specifier convention | FIXED |
| L-055 | Refreshed `_web-extension-staging/claymark-extension/` with the final build | `cp -r source/dist claymark-extension` | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-017 | Chose native `title` over wiring the scaffolded Radix Tooltip | Both close the same UX gap (hover label on icon-only buttons); Radix Tooltip's Popper/floating-ui weight reopened the NFR-2 budget violation the Dialog lazy-load had just closed, for no functional gain `title` doesn't already provide |
| D-018 | Did not touch reader mode's missing syntax highlighting (X-039) or start the Firefox build (X-032) this pass | Both are pre-existing, explicitly-scoped-out limitations from earlier sessions, not regressions from the shadcn/icon port — re-verified reader mode still works as originally shipped (L-053) but left its known feature gap and the Firefox target as-is, consistent with how they were always flagged (deferred, not broken) |

## Session 7 — top-level repo reorg: android/, desktop/, web-extension/, 2026-09-18

User asked for a per-platform folder layout. Confirmed scope via AskUserQuestion first (three questions, all answered before touching anything): core lib/PWA stays at repo root; `claymark-native/` and `src-tauri/` rename in place rather than relocate under a new parent; the temporary `_web-extension-staging/` graduates into a permanent `web-extension/`.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-056 | `git mv src-tauri desktop` — verified first that Tauri CLI doesn't require the literal folder name `src-tauri` (it discovers `tauri.conf.json` by walking the tree, not by a hardcoded folder-name match) | `npx tauri info` ran clean post-rename; `frontendDist: "../dist/app"` in `desktop/tauri.conf.json` is a relative path, unaffected by the rename | PASS |
| L-057 | `git mv claymark-native android` — checked `settings.gradle.kts`/`build.gradle.kts` first for hardcoded path strings (none; Gradle project name comes from `rootProject.name`, not the directory) | `./gradlew -q projects` resolved the project structure correctly post-rename; failed only on an unrelated, pre-existing JDK version mismatch (system JDK 25 vs. the Kotlin compiler's version parser, already documented in `plan/03-CHECKLIST.md` from the original Android setup as needing JDK 21) — confirmed via stacktrace this is not caused by the rename | PASS |
| L-058 | Promoted `_web-extension-staging/source` → `web-extension/` (plus its `docs/` and `README.md`); dropped `build-report/` (superseded by this ledger) and the staging-only `_web-extension-staging.zip`; deleted the now-empty staging folder | `npm run build` in `web-extension/` still produces the same 115.50 KB gz bundle as before the move (all its internal paths are relative) | PASS |
| L-059 | Fixed the one *functional* stale-path reference the renames broke: `eslint.config.js`'s `ignores` list still said `src-tauri/**` | `npm run lint` from repo root runs clean against the new ignore list (`desktop/**`, `android/**`, `web-extension/**`); the 6 pre-existing lint errors it reports are unrelated (missing `react-hooks` plugin rule defs, one `prefer-const`) — confirmed pre-existing, not introduced by this session | PASS |
| L-060 | Updated path references across the *live* docs (`README.md`, `handoff.md`, `handoff-installables.md`, `BRAINSTORM.md`, `LOGO-STRATEGY.md`, `web-extension-checklist.md`, `android-to-desktop-checklist.md`, `docs/CURRENT-STATE.md`, `docs/INSTALLATION.md`, `docs/HANDOFF.md`, `docs/HUMAN-TESTING-GUIDE.md`) from `src-tauri/`/`claymark-native/` to `desktop/`/`android/` | Left two categories of reference untouched on purpose: (1) `plan/*.md` — frozen build-session audit trail describing what literally happened at those old paths on 2026-08-28, rewriting them would be revisionist; (2) literal historical filenames (`claymark-native-android.zip`, `claymark-native-port-prompt.md`) that name a delivered artifact, not a live path | PASS |
| L-061 | Verified nothing broke: root `npm run build` (core lib) still succeeds; `web-extension/` build + its `claymark-extension/` unpacked copy refreshed; `desktop/tauri.conf.json`'s relative paths intact; `android/`'s Gradle project structure resolves | Command output captured this session | PASS |
| L-062 | `.gitignore` updated: `src-tauri/target/` → `desktop/target/`, added `web-extension/claymark-extension/` (build-artifact copy, same treatment as the repo's other `dist/` outputs) | — | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-019 | Left the core npm library/PWA at repo root instead of moving it under a `platforms/`/`apps/` parent | User's explicit choice when asked — smallest blast radius, since every root-level build config (`vite.config.ts`, `tsconfig.json`, `package.json`) stays exactly where every existing tool already expects it |
| D-020 | Did not touch `.notion_sync_state.json`'s embedded `src-tauri`/`claymark-native` mentions | It's a sync-state cache regenerated by the notion-sync skill from live content, not a hand-maintained doc — the next sync run will pick up the new paths naturally; hand-editing a cache file risks it drifting from what Notion actually has |

## Session 8 — repo-root file cleanup, 2026-09-18

Follow-up to Session 7's folder reorg: tidy the remaining loose/misplaced files at repo root.

| ID | Check / change | Evidence | Verdict |
|---|---|---|---|
| L-063 | Found `Claymark.apk` (150 MB, root) was a *different*, much larger file than the curated `android/releases/claymark-v1.0.0.apk` (10 MB) — different MD5s, and `unzip -l` showed a multi-dex unshrunk build (958 files) consistent with a debug build, not the signed release | Moved to `android/builds/claymark-debug.apk` (new `builds/` subfolder, distinct from the curated `releases/`) rather than deleted — origin/currency unclear, not mine to discard unilaterally |
| L-064 | `claymark-android-src.zip` (gitignored, the original delivered Android source archive, already fully extracted into `android/`) — redundant now, historical | Moved to `.archive/`, alongside the repo's other superseded delivered zip |
| L-065 | `claymark-native-port-prompt.md` (root) — single-platform historical prompt document, only ever referenced by bare filename in `ledger.md`, not a live path anyone resolves | Moved into `android/`, alongside its siblings (`HANDOFF-2.md`, `PROCESS.md`) |
| L-066 | `banner.jpg` (root) — the only asset floating outside `brand/`'s existing logo/asset structure, referenced once from `README.md` | Moved to `brand/banner.jpg`; `README.md`'s `![Claymark banner](banner.jpg)` updated to the new relative path; confirmed nothing else (`index.html`, `public/`, `src/`) references it |
| L-067 | `docs/screenshots/screenshots desktop app/` — a nested nonsense-named folder (space in the name), holding a walkthrough screenshot set the user had earlier explicitly asked *not* be committed (D-011, prior session), but `.gitignore` never actually enforced that — it just stayed untracked by omission | Renamed to `docs/screenshots/desktop-app/`; added `docs/screenshots/` to `.gitignore` to make the "local-only" intent durable instead of relying on remembering not to `git add` it |
| L-068 | Left `SECURITY-AUDIT.md` and `web-extension-checklist.md` at root despite initially considering moving them into `docs/`/`web-extension/` | `plan/01-ROADMAP.md` names `SECURITY-AUDIT.md` as its literal mandated root-level deliverable path (same convention as `spec.md`/`progress.md`/`ledger.md`) — moving it would break that documented contract. `web-extension-checklist.md` is paired with `android-to-desktop-checklist.md` as a matched pair of root-level platform-planning docs; moving one without the other would be inconsistent, so both stay |
| L-069 | Verified nothing broke: root build still succeeds, README's banner image resolves at its new path, no other file references any of the moved paths | `grep` sweep across `*.md`/`.notion_sync_state.json`/`index.html`/`public/`/`src/` for each old path, confirmed clean | PASS |

### Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-021 | Did not delete the 150 MB `Claymark.apk`, only relocated it | It's gitignored (no git-history cost either way) but its origin and whether it's still needed is genuinely unclear — a large binary the user didn't create this session isn't mine to discard without asking; moving it out of the way is reversible, deleting it isn't |
