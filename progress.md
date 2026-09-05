# Claymark — progress (canonical task list)

Canonical delivery task list required by the vargr-build-rules executor
protocol. Complements, and does not replace, `plan/03-CHECKLIST.md` (the
detailed v1.0.0 task ledger — 104/104 checked, see there for full history).

## v1.0.0 core delivery

- [x] Phases P0–P8 (104 tasks), gates G0–G8 — see `plan/03-CHECKLIST.md`
- [ ] **GATE G9 — human acceptance of the v1.0.0 delivery** (`plan/03-CHECKLIST.md:224`, `docs/HANDOFF.md`). Requires the user; not self-approvable.
- [ ] Close `DEF-001` — dead-export/unused-module audit (`knip` or equivalent) over `src/`
- [ ] Close `DEF-003` — KaTeX has no dynamic-import lazy-load boundary
- [ ] Close `DEF-004` — 2 pre-existing lint errors (`react/no-danger` rule-not-found, `prefer-const`) — still present this session, now 3 counting `react-hooks/exhaustive-deps`, see `ledger.md`
- [ ] Close `DEF-005` — `tests/stress.spec.ts` S-01 timing flake (did not reproduce this session's runs, but not eliminated)
- [ ] Close `DEF-006` — `tests/mermaid.spec.ts` ordering-dependent flake
- [ ] Close `DEF-007` — 8 devDependency-only `pnpm audit` findings
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

## `ui-wip` UI-polish phase — open items (not attempted this pass)

- [ ] Decide on integrating the remaining `scratch/shadcn-prototype/` components — `Dialog` (could close the image-lightbox gap, `DEF-002`), `Table`, `Badge`, `Separator`, `ScrollArea`, `Menubar`, `Toast`
- [ ] **Ask the user before pushing `ui-wip` or opening a PR** — explicit, standing instruction in `docs/SYNC-HANDOFF.md`, and a "publishing/outward-facing" action under this session's own operating rules regardless of the executor protocol's no-gates instruction
- [ ] Reconcile `docs/SPEC.md`'s typography numbers (`20px`/`16px` body/code) against the `ui-wip` token changes (now `18px`/`15px`, plus a new `12px` code-block size) — a product-copy decision, not logged as done or reverted
- [ ] Theme the two new hardcoded pill/reference colors in `src/theme/claymark.css` (`#a84545`, `#3367d6`) — currently identical in light/dark, not driven by a semantic token
- [ ] Clean up stale `.claude/worktrees/optimistic-sinoussi-38bf13` and `.claude/worktrees/objective-sinoussi-6193de` (both PRs already merged into `origin/master`) — ask before `git worktree remove`; today they cause every `vitest run` to execute the full suite three times over
