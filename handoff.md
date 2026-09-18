# Claymark — handoff (2026-09-18)

Written at the end of a session that implemented the full 6-phase
Android-parity plan for the Tauri **desktop app**, fixed several bugs found
via user testing, and pushed to `master`. The user's stated next priority is
a new product surface: a **Claymark web (browser) extension**. This handoff
exists so the next session — human or agent — can pick that up with full
context and without re-deriving anything below.

## Where things stand — four shipped surfaces, a fifth about to start

| Surface | Location | State |
|---|---|---|
| `claymark` npm library (rendering engine) | repo root, `src/pipeline/`, `src/components/`, `src/theme/` | v1.0.0 shipped. Pure renderer — parses/sanitizes/renders Markdown, no editing, no network calls. See `docs/SPEC.md`/`docs/CURRENT-STATE.md` |
| PWA | `src/app/` built in `app` Vite mode | Shipped, `dist/app/` |
| Tauri desktop app | `src/app/` + `src-tauri/` | **This session's work.** Now a real document editor (explicit user override of the library's "not an editor" non-goal, for this target only) — see below |
| Native Android app | `claymark-native/` (Kotlin/Jetpack Compose) | v1.0.0 shipped, signed release APK, see `claymark-native/`'s own docs. Unrelated codebase to everything else in this table — don't conflate |
| **Web (browser) extension** | **does not exist yet** | **Next task.** No manifest, no scaffolding, nothing — see below |

## This session's work (desktop app, now done)

Implemented all 6 phases of `android-to-desktop-checklist.md` (the desktop
app was previously a 77-line demo shell around the rendering library; it now
has real document open/save/autosave, OS file-association, drag-drop,
routing, a drawer, Settings/Help/About/Privacy screens, edit mode with a
formatting toolbar, search/replace, an outline dialog, and the claymorphism
visual design system). Full detail in `ledger.md`'s "Session 2" block and
`progress.md`'s "Desktop app — Android-parity chrome" section — don't
duplicate it here, read those.

**Six real bugs were found and fixed after the phases were "done," all via
actually looking (user screenshots, live browser reload) rather than trusting
automated test/type-check output alone** — worth internalizing before
starting the extension:
1. Brand-mark logo rendered as a solid blob (bad SVG arc math)
2. App crashed entirely outside a real Tauri webview (eager IPC calls on
   mount, no environment guard)
3. Claymorphism CSS existed but was applied to only 3 of the ~8 chrome
   components that needed it
4. Buttons rendered completely blank/white — `color-mix()` CSS gradients had
   no solid-color fallback, so an unsupporting webview silently dropped the
   whole background
5. "Discard" in the abandon-draft dialog didn't actually revert unsaved edits
6. A routing edge case left "Back" landing on an empty document view

**The lesson, stated plainly**: `pnpm tsc --noEmit` and `pnpm test` passing
is not evidence a feature works. None of the 6 bugs above were caught by
either. They were only found by loading the actual app in a browser/webview
and looking at it, or because the user did and said so. Apply the same
discipline to the extension — an extension has its own class of "looks fine
in isolation, breaks in the real host" bugs (a content script's CSS
colliding with the host page, a service worker's lifecycle being unlike a
normal page, permissions silently denied) that unit tests won't catch either.

Committed as `8f1bda7`, pushed to `origin/master`. `docs/screenshots/` (a
walkthrough screenshot set) exists locally but was **deliberately not
committed** — user asked to keep it out of git.

## Next task: Claymark web (browser) extension

**Nothing exists for this yet** — no manifest, no directory, no dependency
in `package.json`. This is a green-field product surface, not a resumed one.
Do not assume prior art beyond what's listed below.

### What to do first — scope it with the user, don't assume

The user named this as "the only thing left," but didn't specify what the
extension actually does. Before writing code, get an explicit answer to at
least:
- **What does it do?** Candidates, not a decision: render Markdown found on
  the current page (a "reader mode" for `.md` files served raw, or GitHub-
  style pages) · a popup/side-panel Markdown editor using the `claymark`
  library · both. Each implies a very different Manifest V3 architecture
  (content script vs. popup/side panel vs. background service worker, or
  some combination).
- **Which browsers?** Chrome/Chromium (Manifest V3, required since 2024) is
  the safe default; Firefox has its own store and slightly different MV3
  support — confirm whether both are in scope or just one.
- **Reuse, don't rebuild**: the `claymark` npm library at the repo root
  (`dist/claymark.js`/`.cjs`, or build fresh from `src/`) is the rendering
  engine — it already does CommonMark+GFM, syntax highlighting, math,
  Mermaid, and sanitization. The extension should consume it, not
  reimplement any of that.

### Relevant prior art in this repo (read before designing)

- `docs/ARCHITECTURE.md` §9 "Extension points" — the library's own
  documented customization surface (component overrides, token overrides).
  Relevant to how a browser extension would embed/theme the renderer, not to
  be confused with "browser extension" as a product.
- `docs/SPEC.md` §6 already documents the "not a Markdown editor" non-goal
  and this session's flagged override for the desktop app specifically — if
  the browser extension also needs editing (not just rendering), that non-
  goal will need the same kind of explicit, flagged override, not a silent
  change.
- `src/theme/tokens.css` + `src/theme/claymark.css` — the full design-token
  and claymorphism system, reusable as-is for extension UI (popup/side
  panel) to stay visually consistent with the other four surfaces.

### Process notes carried over from this session

- This project runs under `vargr-build-rules`: TDD (test first), evidence-
  over-assertion (`pnpm tsc --noEmit` / `pnpm test` / actual manual
  verification before any "done" claim), and `progress.md`/`ledger.md` kept
  current as canonical files (`spec.md`/`README.md` too — all four are
  read by `/notion-sync`).
- `.notion_sync_state.json` exists at repo root (currently **untracked** —
  excluded from the last commit along with `docs/screenshots/` and
  `fiverr-screenshots/`; consider committing it or deciding to keep it
  untracked deliberately) — the project's Notion linkage. This session ran
  `/notion-sync`'s `SYNC` procedure and pushed the new to-do/ledger entries
  and this handoff's own content to Notion. Run `/notion-sync` again once
  extension work is underway; the runbook's `SYNC` procedure (not `INIT`,
  already linked) reconciles `progress.md`/`ledger.md` non-destructively.
- Don't touch `src/pipeline/`, `src/components/` (the markdown-rendering
  primitives) except where the extension work explicitly requires it — that
  layer is mature and shared by every surface in the table above.
