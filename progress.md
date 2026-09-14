# Claymark — progress (canonical task list)

Canonical delivery task list required by the vargr-build-rules executor
protocol. Complements, and does not replace, `plan/03-CHECKLIST.md` (the
detailed v1.0.0 task ledger — 104/104 checked, see there for full history).

## Product priority (governs the reader-shell backlog below)

**Viewing is primary, editing is secondary.** Claymark's mission is to be
the user's default app for *opening* Markdown files fast (USP: fast render)
— not a Markdown IDE. Editing must exist and be safe, but must never
compete visually or architecturally with View mode:

- View mode is the default/landing state; Edit is a single, unobtrusive
  entry point off it, not a peer nav destination.
- When anything must be sequenced or trimmed, View-mode correctness (fast
  render, filename-centric header, Find in document) outranks Edit-mode
  polish.
- The editor stays a plain `<textarea>` (per the audit) — no WYSIWYG, no
  formatting toolbar, no split editor/preview.
- The reading-progress bar (left-edge orange accent element, added this
  session — `ledger.md` L-029) is a View-mode element, not part of the
  editor chrome; it is explicitly **not** in scope for any "remove the
  resize handle / nested editor scrolling" cleanup.

## Architecture decision: Tauri/web stays, no native Android rewrite

Explicitly considered and rejected (this session): recreating Claymark as
a native (Kotlin/Compose) Android app instead of continuing on the
Tauri-wrapped shared web frontend. Reasoning: Claymark's actual product is
the renderer/sanitization pipeline (`src/pipeline/`, `src/components/`),
shipped as an npm library *and* as PWA/Tauri-desktop/Tauri-Android from one
`dist/app` build (`spec.md`, `workflow.md`, locked). A native rewrite would
either reimplement that pipeline a second time (permanent parity burden) or
still embed a WebView for rendering (reinventing Tauri by hand), while
losing 3 of the 4 current targets and the npm-library distribution. Every
gap the two audits found (no save flow, ambiguous labels, no file-access
layer, no find-in-document) is an application-shell gap, not a
WebView/architecture limitation, and is buildable in the current stack per
the Tauri/PWA audit's own `DocumentBackend`-adapter design. Revisit only
with evidence (measured perf/size failure on a real release build, a
capability Tauri's plugin ecosystem genuinely can't reach, or Android usage
that justifies a second product) — not before the reader-shell work below
is done.

## Reader-shell backlog (from the Tauri/PWA cross-platform audit)

Source: `Claymark_Tauri_PWA_Research_Backed_Audit.md` (2026-09-14),
superseding an earlier native-Android-framed audit
(`Claymark_Research_Backed_Product_UX_Audit.md`) whose UX conclusions carry
over but whose Kotlin/Compose/SAF implementation vocabulary does not apply
to this stack — see that doc's own §103 correction table. None of this is
started; the reader shell (`src/app/main.tsx`) currently has no save/dirty-
state/file-open-adapter/find/recent-files layer at all — it is read-only
display plus a raw `<input type=file>`.

### P0 — data safety (do first, before any visual/shell work)

- [x] Dirty-state tracking (`source !== persistedSource`) — `useDocumentSession`'s
      `updateText`, `text === persistedTextRef.current` → clean/dirty
- [x] Explicit **Save**, **Save as**, and honest **Download copy** (PWA
      fallback label when write-back isn't possible — never call a
      download a "Save") — three distinct header actions in `main.tsx`
      wired to `DocumentBackend.save/saveAs/downloadCopy`; browser-verified
      against the mocked File System Access API and the `<input type=file>`
      fallback (a bug where the adaptive Save button called `save()` instead
      of `downloadCopy()` on a non-writable document was found and fixed
      during this verification pass)
- [x] Recovery draft: auto-persisted, debounced ~700ms, survives crash/process
      death — **P0 simplification, disclosed**: `localStorage` (`draft-store.ts`)
      rather than the audit's Tauri app-data-dir/OPFS; acceptable for typical
      Markdown sizes but not the audit's full P1 answer (see P1's
      `DraftStore` item). Browser-verified: draft flush, full page reload,
      recovered-draft banner + restore, and Discard (banner clears, text
      reverts to last-saved, `localStorage` key removed)
- [x] Save/Discard/Cancel protection on every path that could abandon a
      dirty buffer: toolbar Back and Open file both browser-verified
      (Cancel/Discard/Save all exercised on both paths). Android/OS back and
      window/tab close and incoming associated file are not yet
      wired — no such entry points exist in this app yet (Android back-button
      interception and Tauri `RunEvent::Opened` are P1 items below)
- [x] Failed save preserves the full edit buffer + draft — never silently
      lost; no auto-return to View mode on failure — `doSave`'s catch branch
      sets `mode: 'save-failed'`, buffer untouched
- [x] Save-race protection — typing during an in-flight save must not get
      marked clean when that save resolves — `doSave`'s `s.text === text`
      guard before marking `saved`
- [ ] Incoming-file protection while dirty (queue it, resolve dirty state
      first, then open) — depends on the P1 file-association/`RunEvent::Opened`
      wiring below; the abandon-modal mechanism itself is already generic
      enough to add a third `pendingAbandon.reason` once that wiring exists

### P1 — core product

**Architecture**
- [x] `DocumentBackend` interface + Tauri/web runtime adapters, selected
      once via `isTauri()`, lazy-imported so native-only deps never reach
      the PWA bundle — `src/documents/{types,document-service}.ts` +
      `backends/{web,tauri}.ts`; the web backend is browser-verified above,
      the Tauri backend's plugin wiring (Cargo.toml, lib.rs, capabilities)
      is in place but **not yet verified against a real Tauri build**
- [ ] `DraftStore` / `RecentStore` interfaces with backend-specific
      implementations — `DraftStore` exists but as the disclosed
      `localStorage`-only P0 simplification (see P0 above), not yet the
      backend-specific (Tauri app-data-dir vs. web OPFS) design this item
      describes; `RecentStore` not started (P2 "Recent files")

**Shell / IA** — View mode primary, Edit mode secondary (see product
priority above)
- [x] Filename-centered header (replaces the static "Claymark" title) —
      `main.tsx` shows `session.ref?.name` once a document is open, falls
      back to "Claymark" only in the no-document state
- [x] Rename `Write` → `Edit`, `Browse` → `Open file` (kill ambiguous
      tool-language action names) — done in the rewritten header
- [x] Separate full-screen View mode and Edit mode — kill any stacked
      editor+preview pattern — `isEditing` branches the whole content area
      between `<textarea>` and `<MarkdownRoot>`, never both
- [x] Editor: no resize handle, no nested vertical scrolling in the
      *editor* specifically (does not touch the reading-progress bar) —
      `resize: 'none'`, `minHeight: calc(100vh - 8rem)`, page-level scroll
      only; the `.claymark-progress-*` bar is untouched

**File access**
- [ ] Tauri: `@tauri-apps/plugin-dialog` for open, `@tauri-apps/plugin-fs`
      for read/write — plugins added and registered (`Cargo.toml`, `lib.rs`,
      `capabilities/default.json`), `backends/tauri.ts` written against
      them, but not yet exercised on an actual Tauri build (desktop or
      Android) — only the web backend has been live-verified so far
- [ ] Tauri: `tauri-plugin-persisted-scope` so reopened files survive an
      app restart (scope changes aren't persisted automatically)
- [x] PWA: File System Access API where supported, `<input type=file>`
      fallback everywhere else — both paths browser-verified this pass
      (including the FSA-absent ephemeral-file → Download-copy path)
- [x] PWA: capability-driven persist label (`Save` vs `Download copy`) per
      `primaryPersistLabel(doc)` — driven by actual write capability, not
      assumed — `DocumentBackend.persistAction()` + `PERSIST_LABEL`,
      browser-verified for both `save` and `download-copy`
- [ ] Last-document reopen (Tauri Store/app-data JSON; PWA: serialized
      `FileSystemFileHandle` in IndexedDB where supported)
- [ ] Tauri file associations (`.md`/`.markdown` only — not `.txt`, not
      `.mdx`; `View`+`Send` intents) with cold-start and warm-app
      `RunEvent::Opened` handling
- [ ] Desktop (Windows/Linux) second-instance file-open handling via
      `tauri-plugin-single-instance` (`RunEvent::Opened` alone only covers
      Android/iOS/macOS)
- [ ] Desktop close protection: `onCloseRequested()` + `preventDefault()`
      when dirty → Save/Discard/Cancel

**Reading/editing features**
- [ ] Find in document — incremental, case-insensitive default, highlight
      matches, next/prev, current/total count, Escape closes, preserves
      scroll position on close
- [ ] Undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`)
- [ ] Desktop keyboard shortcuts: `Ctrl/Cmd+O` open, `Ctrl/Cmd+F` find,
      `Ctrl/Cmd+S` save — only intercepted when Claymark actually handles
      them, never overriding native copy/paste/select-all

**Markdown hardening**
- [ ] Verify/harden against: headings, nested lists, task lists,
      blockquotes, code blocks, wide tables, long URLs/unbroken tokens,
      images, malformed input — none may force page-wide horizontal scroll
- [ ] Link handling: in-document anchors scroll correctly (dedupe IDs),
      HTTP/HTTPS opens externally (`@tauri-apps/plugin-opener` on Tauri,
      `target=_blank rel=noopener noreferrer` on web), relative Markdown
      links resolve only where the backend genuinely can and fail
      gracefully otherwise
- [ ] Missing-image handling: preserve alt text, never crash, never
      collapse surrounding layout

**Security** (Tauri-specific: a rendering bug here is a path toward
privileged IPC, not just a web XSS bug — see audit §13)
- [ ] Raw-HTML policy decision — escape/ignore by default; audit current
      pipeline to confirm no unsanitized `dangerouslySetInnerHTML`-
      equivalent sink exists anywhere in `src/pipeline`/`src/components`
- [ ] Block unsafe URL schemes (`javascript:` etc.) at the sanitization
      boundary
- [ ] Restrictive Tauri CSP in the production config
- [ ] Tauri capabilities audit — narrow fs/dialog scopes, no shell/process
      exposure beyond what's actually used
- [ ] Malicious-Markdown fixture test suite (`<script>`, `onerror=`,
      `<svg onload>`, `<iframe>`, `<object>`, encoded/mixed-case variants)
      run against both the Tauri build and the PWA build

**States & platform correctness**
- [ ] No-document state; required error states — permission revoked, file
      moved/deleted, read failure, empty file, encoding failure, malformed
      Markdown, external modification conflict
- [ ] Session/state restoration: current document id, view/edit mode,
      scroll position, selection — small state via Tauri Store/IndexedDB;
      full source text never in `localStorage` or a saved-state Bundle
- [ ] Accessibility gates: 4.5:1/3:1 contrast (both themes), 200% zoom
      without loss of function, 48×48 CSS px mobile hitboxes, real
      heading/link/table semantics (no clickable `<div>`s), TalkBack/
      screen-reader labels for every icon action, visible `:focus-visible`,
      restrained `aria-live` for save/error status
- [ ] WebView compatibility pass across WebView2, WKWebView, WebKitGTK,
      Android system WebView, Chrome/Firefox/Safari PWA — minimum:
      `position: sticky`, `overflow-x: auto`, `env(safe-area-inset-*)`,
      text selection, `:focus-visible`

### P2 — after core correctness

- [ ] Recent files (max 5, metadata-only, graceful "no longer available"
      state with Open/Remove actions)
- [ ] Conditional Table of Contents (heading count ≥ 4 AND document taller
      than ~2 viewports; modal sheet on compact widths, no persistent
      sidebar)
- [ ] Theme moved to overflow menu (System/Light/Dark; no emoji sun/moon as
      production chrome — note: the theme toggle is currently in the
      sticky header per this session's L-029 fix, so this is a deliberate
      relocation, not new work)
- [ ] File info panel (name, source/provider label, size, modified, access
      — only real backend-known metadata, never a fabricated path)
- [ ] Desktop window-state restore (`tauri-plugin-window-state`)
- [ ] PWA `file_handlers` progressive enhancement (feature-detected via
      `launchQueue`, never treated as baseline)
- [ ] Richer external-file-change conflict detection (mtime/size/hash)
- [ ] Service-worker update / Tauri updater: never reload/restart while
      the editor is dirty

### Explicitly rejected — do not build without new evidence

Custom file browser/vault/workspace, bottom nav/drawer/tabs, FAB, command
palette, home dashboard · WYSIWYG editor, split editor/preview, permanent
formatting toolbar, Vim mode, autocomplete/linting · backlinks/tags/graph
view/notes database/templates/daily notes/accounts/cloud sync/
collaboration · Git client/terminal/plugin marketplace/repo explorer · PDF
export/publishing pipeline/static-site generator · custom Android SAF
directory plugin, multi-window documents, filesystem indexing.

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
- [x] Close `DEF-009` — Android debug/release APK `libapp_lib.so` (`lib/arm64-v8a`) is not 16 KB page-size aligned (`b7669a4`, see `ledger.md` L-028 — fixed via `build.rs`'s `cargo:rustc-link-arg`, since tauri-cli force-overrides `.cargo/config.toml` rustflags for Android targets)
- [ ] macOS/Windows Tauri desktop cross-builds (only Linux `.deb`/`.rpm`/AppImage exist)
- **Browser extension: confirmed out of scope, deferred.** `docs/SPEC.md` §5 lists no browser extension among the four deliverables — the user's earlier "three deliverables" framing meant the PWA (`claymark-app`, already shipped), not a separate Chrome/Firefox extension. A real WebExtension stays deferred until everything else above is done; see `workflow.md` (locked) for the full reasoning and the feature-parity workflow going forward.

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
- [x] On-device (Android, physical hardware) navigation testing via `adb`: investigated an apparent "blank screen" symptom against a stale unsigned release APK — root-caused as a stale-build artifact, not a live bug (a freshly-built debug APK from current source renders correctly); confirmed Write/Browse/theme-toggle navigation all work; surfaced two real, separate issues along the way — DEF-009 (16 KB page-size alignment, tracked above) and a genuine triple-nested-padding layout bug (fixed, see below)
- [x] Fix `src/app/main.tsx` applying the same `.claymark-root` max-width/padding a second time on top of `ThemeProvider`'s own wrapper, stacking with `MarkdownRoot`'s own third application — visible as oversized side margins squeezing all content toward the centre, most noticeable on a phone-width viewport (see `ledger.md` L-026)

## This session (UI bug-report pass, user-supplied screenshots + on-device follow-ups)

- [x] Fix inline code "pilling" wrapping badly on multi-word type signatures (e.g. `` `(e: RenderError) => void` ``) via `box-decoration-break: clone` (`027cc88`, see `ledger.md` L-029)
- [x] Fix header font size too small; make theme toggle reachable while scrolled via `position: sticky` header (`027cc88`, L-029)
- [x] Body text: `justify` → `left` by default; table cells: `left` → `center` by default (`027cc88`, L-029)
- [x] Add a reading-progress bar as the page's side scroller (`027cc88`, L-029)
- [x] Fix 4 occurrences of invalid `hsl(var(--accent-brand))` (token is a hex literal, not an HSL triplet) → bare `var(--accent-brand)` (`027cc88`, L-029)
- [x] Fix code-block language label going blank (most visible on Android) — `getCodeLanguage()` only checked the `language-xxx` class, not rehype-pretty-code's alternate `data-language` attribute form (`027cc88`, L-029)
- [x] Fix codeblock header/Copy-button overlapping the code below it; keep header inside the same bordered box per user correction; remove the resulting redundant divider line (`027cc88`, L-029)
- [x] Close `DEF-009` — see checkbox above

## `ui-wip` UI-polish phase — open items (not attempted this pass)

- [ ] Decide on integrating the remaining `scratch/shadcn-prototype/` components — `Dialog` (could close the image-lightbox gap, `DEF-002`), `Table`, `Badge`, `Separator`, `ScrollArea`, `Menubar`, `Toast`
- [x] Push `ui-wip` and open a PR — user explicitly asked. Pushed `94be163..02de572`, opened [PR #4](https://github.com/vchhikara/Claymark/pull/4) (`ui-wip` → `master`). See `ledger.md` L-018.
- [ ] Reconcile `docs/SPEC.md`'s typography numbers (`20px`/`16px` body/code) against the `ui-wip` token changes (now `18px`/`15px`, plus a new `12px` code-block size) — a product-copy decision, not logged as done or reverted
- [ ] Theme the two new hardcoded pill/reference colors in `src/theme/claymark.css` (`#a84545`, `#3367d6`) — currently identical in light/dark, not driven by a semantic token
- [x] Clean up stale `.claude/worktrees/optimistic-sinoussi-38bf13` and `.claude/worktrees/objective-sinoussi-6193de` — user explicitly asked; both confirmed merged into `origin/master` first, then `git worktree remove --force` on each. See `ledger.md` L-016.
- [x] Delete the now-worktree-less local branches `vargr/objective-sinoussi-6193de` / `vargr/optimistic-sinoussi-38bf13` — user explicitly asked; `git branch -d` (safe mode) succeeded on both, confirming git's own merge check agreed. See `ledger.md` L-017.

## This session (P0 reader-shell implementation — DocumentBackend, save/dirty/recovery)

- [x] Implement the P0 reader-shell backlog (see checkboxes above): `DocumentBackend`
      adapter (web + Tauri, Tauri plugin wiring), `useDocumentSession` state
      machine (dirty tracking, save-race guard, recovery drafts, abandon
      protection), rewired `main.tsx` to it with three explicit save actions
      (Save/Save as/Download copy) and a full-screen textarea editor
- [x] Browser-verified end-to-end via a mocked `showOpenFilePicker`/`showSaveFilePicker`
      (the sandboxed pane can't drive the real native picker): open→edit→dirty→save,
      Back-while-dirty and Open-file-while-dirty abandon protection (all three
      Cancel/Discard/Save choices on both paths), Save-as, Download-copy, and
      full crash-recovery (debounced draft, real page reload, recovered-draft
      banner + restore + Discard)
- [x] Found and fixed two real bugs during that verification pass (not present
      in any prior committed code): (1) the adaptive Save button called
      `session.save()` instead of `session.downloadCopy()` when write-back
      wasn't possible, throwing instead of downloading; (2) `resolveAbandon`'s
      `open-file` branch re-invoked `openFile()`, which re-checked a stale
      `state.mode`/`state.saveStatus` closure and silently no-op'd instead of
      opening the next file — split into a gate-only `openFile` and a
      gate-free `performOpen` that `resolveAbandon` calls directly
- Not yet done: Tauri backend live-verification (desktop or Android build),
  incoming-file-while-dirty protection (depends on P1 file-association
  wiring, not yet built)
