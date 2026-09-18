# Claymark — progress (canonical task list)

Canonical delivery task list required by the vargr-build-rules executor
protocol. Complements, and does not replace, `plan/03-CHECKLIST.md` (the
detailed v1.0.0 task ledger — 104/104 checked, see there for full history).

## Desktop app — Android-parity chrome (2026-09-18 session)

Implemented `android-to-desktop-checklist.md`'s full 6-phase plan on top of
the Tauri desktop shell (`src/app/`), explicitly authorized to become a real
document-editing app for this target only (the `claymark` library itself
stays a renderer — see the flagged notes in `docs/CURRENT-STATE.md`/
`docs/SPEC.md` §6/§7).

- [x] Phase 1 — design-system corrections: quote-rule/danger tokens, AMOLED
      theme, text-size stepper, claymorphism CSS system, brand mark
- [x] Phase 2 — Tauri OS integration + document/session state machine,
      open/save/save-as, autosave, crash-recovery drafts, recent files
- [x] Phase 3 — app shell: routing, Welcome/Settings/Help/About/Privacy
      screens, Drawer, Reader header, formatting toolbar
- [x] Phase 4 — interactive chrome: search/replace, TOC dialog, theme-picker
      stub, abandon-draft dialog, toasts, global keyboard shortcuts
- [x] Phase 5 — OS integration: file-association "open with", window-wide
      drag-and-drop, paste-as-new-document
- [x] Phase 6 — Tauri bundle re-verified end-to-end (`.deb`/`.rpm`/AppImage
      built and launched; AppImage needed `--appimage-extract` + `AppRun`,
      no FUSE in this sandbox — not a build defect)
- [x] Post-implementation bug fixes (found via user-supplied screenshots
      comparing against the native Android app, not caught by the automated
      test suite):
  - Brand-mark "C" logo rendered as a solid blob (bad arc sweep-flags) — fixed
    with a mask-based ring+wedge SVG construction
  - App crashed entirely outside a real Tauri runtime (`onOpenFileFromOS`/
    `onWindowFileDrop` called Tauri IPC eagerly on mount) — added an
    `isTauriRuntime()` guard
  - Claymorphism CSS was built in Phase 1 but never applied to the Phase 3+
    chrome (Button/Dialog/ReaderHeader/SettingsScreen/FormattingToolbar) —
    wired in
  - Buttons rendered blank/invisible — `color-mix()` gradients had no solid
    `background-color` fallback, so a webview without `color-mix()` support
    dropped the whole background declaration — added fallbacks in
    `button.css`/`dialog.css`/`claymark.css`
  - "Discard" in the abandon-draft dialog navigated away without reverting
    the in-memory edit — added `lastCommittedSourceRef` tracking in
    `main.tsx`
  - Back from Settings (reached via the Welcome-screen drawer, no document
    loaded) landed on an empty "Untitled" reader — `routeContextValue.back()`
    now redirects to Welcome when no document is open
- [x] Full walkthrough screenshot set captured (`docs/screenshots/`, not
      pushed to git — local verification artifact only)
- [x] Committed (`8f1bda7`) and pushed to `origin/master`

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

## Next up — Claymark web (browser) extension

Not started. No scaffolding, manifest, or code exists yet anywhere in this
repo — this is a new product surface, not a resumed one. Per the user
(2026-09-18): with the desktop app now at Android parity, the browser
extension is the next major platform target after the npm library, PWA,
Tauri desktop app, and native Android app already shipped.

- [x] Scope the extension — **locked 2026-09-18**, confirmed by the user:
      all three modes in v1 (content-script reader mode, popup/side-panel
      viewer, popup/side-panel editor); Chrome/Chromium MV3 **and** Firefox;
      persistence of the last pasted/edited doc (non-goal override,
      viewer/editor only). Full detail in `web-extension-checklist.md` §0.
- [x] Stage reusable assets for implementation in `_web-extension-staging/`
      (temporary — built `claymark` library, theme CSS, fonts, `url-policy.ts`,
      `toc.ts` reference, `docs/SPEC.md`; deleted once a real extension
      package exists and has pulled in what it needs).
- [x] A separate agent session built a working Chrome MV3 extension in
      `_web-extension-staging/claymark-extension/` (source in `source/`) —
      full-tab surface, editor + persistence, engine parity (Shiki/KaTeX/
      Mermaid), 40/40 engine tests + 32/32 e2e at the time. Diverged from
      the locked scope: no content-script reader mode, no popup/side-panel
      (full tab only), Firefox deferred.
- [x] Closed two of those three gaps (2026-09-18, "Session 2" in the
      staging folder's own ledger): added a popup surface (420×600, reuses
      the same `App` component, "Open in tab ↗" to reach the full-tab
      surface) and a content-script reader mode (auto-renders raw `.md`
      URLs / `raw.githubusercontent.com` / `gist.githubusercontent.com` in
      a closed shadow root — checklist §2 Trap 1 threat model). Verified:
      `npm run build`/`typecheck`/`test` clean, manual browser verification
      of all three surfaces (Playwright not installed in this checkout, so
      `tests/e2e.py` itself wasn't re-run — flagged as a real gap, not
      silently skipped).
- [x] Ported shadcn/ui components (2026-09-18, "Session 3"/"Session 5" —
      staging folder + repo ledgers respectively): hand-ported Button/Dialog/
      Badge/Separator/Tooltip from `scratch/shadcn-prototype/` (real Radix
      primitives, hand-written CSS against the extension's own tokens, no
      Tailwind/cva) and replaced every emoji/glyph icon with `lucide-react`
      icons across the welcome screen, reader header, editing toolbar,
      drawer, and search bar. `Dialog.tsx` now wraps Radix internally with
      the exact same external prop API — no call-site changes needed.
      Verified: `npm run build`/`typecheck`/`test` (40/40) clean; manual
      browser-pane verification of welcome, reader header (no overflow at
      800px or 1200px), edit toolbar, drawer, Outline dialog, and popup
      surface. Content-script reader mode not re-verified (untouched by
      this port).
- [x] Fixed the bundle-size regression (2026-09-18, ledger L-051): scoped
      Radix imports + lazy-loaded the Dialog chunk. 127.00 KB → 115.50 KB gz,
      back under the 120 KB NFR-2 budget.
- [x] Closed the tooltip gap (L-052) — with native `title` attributes
      instead of the scaffolded Radix Tooltip, since wiring that back in
      reopened the bundle-size regression for no functional gain over
      `title`. Deleted the unused `pb/tooltip.tsx` scaffolding.
- [x] Found and fixed a real bug while fixing the above (L-050): Radix
      Dialog's scroll-lock injected a `<style>` tag that violated the
      extension's strict `style-src 'self'` CSP — 3 console errors per
      dialog open. Overlay now renders a plain div instead of Radix's.
- [x] Wrote `tests/e2e.py` coverage for the popup surface and reader mode
      (L-053) — 32/32 → 42/42 Playwright checks. Reader mode's closed shadow
      root needed a CDP session (`DOM.getDocument({pierce:true})`) since
      Playwright's own selectors can't see into closed shadow trees.
- [ ] Firefox build — still not started, the one remaining §0 scope gap
- [ ] Reader mode has no syntax highlighting/KaTeX/Mermaid yet (flagged
      scope limit, not a bug — see the staging folder's `docs/LEDGER.md` X-039)
- [ ] Decide Manifest V3 architecture details still open beyond what's
      built: e.g. whether reader mode should also offer an "upgrade
      GitHub's own rendered Markdown" mode (checklist §0 first bullet,
      second half — not attempted, only the raw-file case was built)
- [ ] Reuse the existing `claymark` npm library (`dist/claymark.js`/`.cjs`,
      root of this repo) as the rendering engine — don't reimplement
      Markdown parsing/sanitization for the extension
- [ ] Chrome Web Store / Firefox Add-ons packaging and store listings

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
- [x] Push `ui-wip` and open a PR — user explicitly asked. Pushed `94be163..02de572`, opened [PR #4](https://github.com/vchhikara/Claymark/pull/4) (`ui-wip` → `master`). See `ledger.md` L-018.
- [ ] Reconcile `docs/SPEC.md`'s typography numbers (`20px`/`16px` body/code) against the `ui-wip` token changes (now `18px`/`15px`, plus a new `12px` code-block size) — a product-copy decision, not logged as done or reverted
- [ ] Theme the two new hardcoded pill/reference colors in `src/theme/claymark.css` (`#a84545`, `#3367d6`) — currently identical in light/dark, not driven by a semantic token
- [x] Clean up stale `.claude/worktrees/optimistic-sinoussi-38bf13` and `.claude/worktrees/objective-sinoussi-6193de` — user explicitly asked; both confirmed merged into `origin/master` first, then `git worktree remove --force` on each. See `ledger.md` L-016.
- [x] Delete the now-worktree-less local branches `vargr/objective-sinoussi-6193de` / `vargr/optimistic-sinoussi-38bf13` — user explicitly asked; `git branch -d` (safe mode) succeeded on both, confirming git's own merge check agreed. See `ledger.md` L-017.
