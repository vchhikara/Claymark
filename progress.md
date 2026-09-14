# Claymark — progress (canonical task list)

Canonical delivery task list required by the vargr-build-rules executor
protocol. Complements, and does not replace, `plan/03-CHECKLIST.md` (the
detailed v1.0.0 task ledger — 104/104 checked, see there for full history).

## v1.0.0 core delivery

- [x] Phases P0–P8 (104 tasks), gates G0–G8 — see `plan/03-CHECKLIST.md`
- [ ] **GATE G9 — human acceptance of the v1.0.0 delivery** (`plan/03-CHECKLIST.md:224`, `docs/HANDOFF.md`). Requires the user; not self-approvable.
- [x] Close `DEF-001` — dead-export/unused-module audit (`knip` or equivalent) over `src/` (`b6c5616`, see `ledger.md` L-019)
- [x] Close `DEF-003` — KaTeX has no dynamic-import lazy-load boundary (`eb7b9d2`, see `ledger.md` L-020 — also surfaced a more severe finding: math was never wired into the processor at all, not just non-lazy)
- [x] Close `DEF-004` — 3 pre-existing lint errors (`a819158`, see `ledger.md` L-024 — `react/no-danger`/`react-hooks/exhaustive-deps` were a missing-plugin config gap, plus one genuine `prefer-const`; also fixed a real bug found along the way — the `react/no-danger` disable comment was on the wrong line and suppressed nothing)
- [x] Close `DEF-005` — `tests/stress.spec.ts` S-01 timing flake (`52f075d`, see `ledger.md` L-021 — hardened to median-of-5, budget raised to 5000ms with disclosed justification per D-009)
- [x] Close `DEF-006` — `tests/mermaid.spec.ts` ordering-dependent flake (`8ff1337`, see `ledger.md` L-022 — root cause was mermaid.js's own wedged internal state, fixed via per-file test isolation)
- [x] Close `DEF-007` — `pnpm audit` findings (`02d11cf`, see `ledger.md` L-025 — actually 15 findings, not 8, and one reached production via mermaid; user explicitly authorized the toolchain major bumps needed to close all of them)
- [ ] Close `DEF-008` — Android APK signing/release keystore
- [ ] macOS/Windows Tauri desktop cross-builds (only Linux `.deb`/`.rpm`/AppImage exist)

## This session (vargr-build-rules pass) — environment & commit hygiene

- [x] Diagnose and fix `package.json`'s `radix-ui: "^1.6.7"` range specifier (violated the project's own zero-range-specifier rule) — pinned exact `1.6.7`
- [x] Investigate `@types/mdast@3.0.15` vs `@types/hast@3.0.5` — turned out to be a red herring (the bump to `4.0.4` was reverted; see `ledger.md`'s "Correction" section). `@types/mdast` is unchanged from baseline.
- [x] Regenerate `pnpm-lock.yaml` from the corrected specifiers; confirm `pnpm install --frozen-lockfile` passes clean with no resolved-version change
- [x] Fix `pnpm tsc --noEmit` (was failing to even run — `typescript` binary missing from a corrupted `node_modules`; then, once installable, surfaced ~19 real type errors, all traced to one root cause in `src/pipeline/plugins/shiki-config.ts` — see `ledger.md` L-006 and the "Correction" section for the false start along the way)
- [x] Fix `pnpm lint` (was crashing entirely — `find-up` module missing from a corrupted `eslint` install) via a clean `node_modules` reinstall
- [x] Install the missing Playwright Chromium binary (`tests/responsive.spec.ts` was failing 3/3 for lack of it)
- [x] Full verification sweep: `pnpm tsc --noEmit` 0 errors · `pnpm lint` 7 known pre-existing errors, 0 new · `pnpm test` 355/355, 54/54 files · `pnpm build` and `pnpm build:app` both exit 0
- [x] Commit the dependency/type-fix batch (`01097cb`)
- [x] Commit the pre-existing uncommitted `ui-wip` working-tree changes, verified as-is (`bb8675b`)
- [x] Author `spec.md`, `progress.md`, `ledger.md` (this triad)

## This session (defect-closure pass, `defect-closure` branch off `ui-wip`)

- [x] Close `DEF-001`, `DEF-003`, `DEF-005`, `DEF-006` per user's explicit itemized instructions (see checkboxes above; `ledger.md` L-019–L-022, D-009)
- [x] Fix the missing `dist/styles.css` build output flagged above (`6445358`, see `ledger.md` L-023) — added `src/styles.css` aggregating tokens/component/KaTeX CSS, wired it as a second Vite lib entry, exported `claymark/styles.css`, and fixed `sideEffects` so bundlers can't tree-shake the import away
- [x] Close DEF-007 (`02d11cf`) — see checkbox above
- DEF-008 remains explicitly out of scope (needs the user's call on a release signing identity, not something to decide unilaterally)

## `ui-wip` UI-polish phase — open items (not attempted this pass)

- [ ] Decide on integrating the remaining `scratch/shadcn-prototype/` components — `Dialog` (could close the image-lightbox gap, `DEF-002`), `Table`, `Badge`, `Separator`, `ScrollArea`, `Menubar`, `Toast`
- [x] Push `ui-wip` and open a PR — user explicitly asked. Pushed `94be163..02de572`, opened [PR #4](https://github.com/vchhikara/Claymark/pull/4) (`ui-wip` → `master`). See `ledger.md` L-018.
- [ ] Reconcile `docs/SPEC.md`'s typography numbers (`20px`/`16px` body/code) against the `ui-wip` token changes (now `18px`/`15px`, plus a new `12px` code-block size) — a product-copy decision, not logged as done or reverted
- [ ] Theme the two new hardcoded pill/reference colors in `src/theme/claymark.css` (`#a84545`, `#3367d6`) — currently identical in light/dark, not driven by a semantic token
- [x] Clean up stale `.claude/worktrees/optimistic-sinoussi-38bf13` and `.claude/worktrees/objective-sinoussi-6193de` — user explicitly asked; both confirmed merged into `origin/master` first, then `git worktree remove --force` on each. See `ledger.md` L-016.
- [x] Delete the now-worktree-less local branches `vargr/objective-sinoussi-6193de` / `vargr/optimistic-sinoussi-38bf13` — user explicitly asked; `git branch -d` (safe mode) succeeded on both, confirming git's own merge check agreed. See `ledger.md` L-017.
