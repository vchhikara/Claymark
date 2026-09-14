# Claymark — feature-parity workflow (LOCKED)

**Status: LOCKED.** Decided with the user 2026-09-14, on `defect-closure`
(commit `221e326` at the time of writing). This is a standing decision, not
a proposal — treat it as binding for how work gets scoped and sequenced
going forward. Revise only on the user's explicit instruction to reopen it,
not on a future session's own judgment call.

---

## 1. The deliverables (canonical — supersedes any earlier "three
   deliverables" framing)

Per `docs/SPEC.md` §5, there are four artifacts, not three:

| Artifact | Form | Consumer | Status as of this lock |
|---|---|---|---|
| `claymark` | npm package: ESM + CJS + `.d.ts` | Developers | Shipped (v1.0.0) |
| `claymark-app` | Installable PWA | End users, mobile (browser) | Shipped |
| `claymark-desktop` | Tauri binary: Linux done; macOS/Windows cross-builds not yet attempted | Desktop users | Linux done, macOS/Windows open |
| Android (Tauri mobile) | Native APK, same frontend as the PWA | End users, mobile (installed) | Debug build working, verified on-device this session; release signing (DEF-008) and 16 KB page-alignment (DEF-009) still open |

**A browser extension (Chrome/Firefox add-on — `content_scripts`,
`background`, toolbar `action`) is explicitly DEFERRED, not scoped, not
started.** It does not appear in `docs/SPEC.md` at all — the user confirmed
"browser extension" in their own earlier framing meant the PWA, which
already exists. If a genuine WebExtension is wanted later, it starts as its
own spec section and its own mini-project after everything else in this
table is considered done — see §4.

## 2. Why one core, three shipped surfaces — the architecture fact this
   workflow leans on

Confirmed this session by reading `tauri.conf.json` and extracting a built
APK: PWA, Desktop, and Android are **not three separate frontends**. All
three package the exact same build output —

- PWA: `dist/app` (from `vite build --mode app`) served as-is, cached by
  the service worker.
- Desktop (Tauri): `dist/app` embedded into a compiled Rust binary at
  build time (`tauri.conf.json`'s `build.frontendDist`) — not unpacked as
  loose files, confirmed by extracting a built APK and finding only
  `tauri.conf.json` + dexopt files under `assets/`.
- Android (Tauri mobile): the same `dist/app` embedded into `libapp_lib.so`
  the same way.

**Practical consequence:** a feature landed in `src/` (the library) or
`src/app/` (the PWA/reader shell) already reaches all three surfaces the
next time each is built — no per-platform reimplementation. This is the
entire reason Option A (below) is viable without becoming three parallel,
diverging codebases.

A browser extension would NOT fit this model — it can't embed a Tauri
binary, needs its own manifest/injection/CSP model, and would genuinely be
a separate codebase reusing only the `claymark` npm package's rendering
logic, none of the app shell. This is *why* it's deferred rather than
folded in.

## 3. The decision: Option A

> Keep riding the shared-core model. Finish Desktop (macOS/Windows
> cross-builds) and Android (DEF-008 signing, DEF-009 alignment) polish
> under the existing architecture. Defer the browser extension entirely
> until "everything else" is considered complete — at which point it gets
> scoped as its own project, not bolted onto the existing build.

Explicitly rejected: parallelizing all four surfaces at once, or starting
the extension now "while we're at it." Work stays sequential — one thing
at a time, finished, verified, before moving to the next — per the user's
own stated preference.

## 4. Workflow for every future feature request

1. **Target the shared core first.** A feature request lands in `src/`
   (library) or `src/app/main.tsx` (the reader shell) by default — that's
   the one place where "add once" is structurally true across PWA/Desktop/
   Android per §2. Don't ask "which platform" before checking whether it's
   even platform-specific.
2. **Verify on the shared core, then per-target, as a repeatable
   checklist** — not reinvented per feature:
   - `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`,
     `pnpm build:app` — all must be clean before anything platform-specific.
   - PWA: manual or Playwright-driven browser check if the feature is
     visual/interactive.
   - Desktop: at minimum a Linux build/run; macOS/Windows only when those
     cross-builds exist (currently they don't — see progress.md).
   - Android: `adb install -r` a debug build, screenshot before/after,
     `logcat` sanity check for crashes — the pattern established this
     session (see `ledger.md` L-026/L-027 for a worked example).
3. **Flag platform divergence before building it, don't assume.** Some
   features are NOT free across all three just because the frontend is
   shared — e.g. a file picker is a native dialog on Desktop/Android (via
   Tauri's dialog plugin) but an `<input type=file>` on the PWA/web. When a
   feature has this shape, ask which behavior is wanted per surface before
   writing code, rather than picking one and assuming it's right everywhere.
4. **Platform-only work gets its own ticket, scoped to one surface, and
   never blocks the others.** Current examples: DEF-008 (Android release
   signing), DEF-009 (Android 16 KB page-alignment), macOS/Windows
   cross-build setup. These don't gate PWA or Linux Desktop feature work.
5. **The browser extension stays out of scope** until the user explicitly
   says to reopen §1/§3 of this file. When that happens: write a real spec
   section for it first (what does it inject into — a popup-only markdown
   previewer, or does it act on arbitrary third-party pages? — this
   materially changes the permission model and architecture), figure out
   exactly how much of the `claymark` npm package it can reuse (almost
   certainly: all rendering/sanitization logic; none of the Tauri/PWA
   shell), and schedule it as its own phase with its own commit history —
   not interleaved with Desktop/Android work.

## 5. Standing session conventions this workflow does not change

(Carried over from `progress.md`/`ledger.md` — restated here so this file
is a complete pointer, not because they're new.)

- One commit per defect/feature (Rule 4 — never bundle unrelated fixes).
- `progress.md`/`ledger.md`/`spec.md` stay the canonical three-file
  contract (vargr-build-rules lock) — update them, don't replace their role
  with this file. This file is the *policy* for how work gets scoped and
  sequenced; those three remain the *record* of what was actually done.
- Never push a branch or open/update a PR without the user's explicit
  instruction, given fresh each time — a prior push authorization does not
  carry forward.
- DEF-008 (release signing identity) requires the user's decision; not
  something to decide unilaterally.
