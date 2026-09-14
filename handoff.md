# Session handoff — read this first in a new session

Prepared 2026-09-14, end of the session that closed DEF-004/DEF-007, did
Android on-device testing, and fixed two UI bugs found along the way. This
describes exactly what's true right now and what's open — read
`workflow.md` next for the locked feature-parity policy before doing any
new feature work.

## Where things stand

- Repo: `/home/vipul/My Projects/Claymark/claymark`
- Branch: **`defect-closure`** (off `ui-wip`), pushed to
  `origin/defect-closure` — **no PR open yet**, user hasn't asked for one.
- Working tree: clean except an untracked `plan/.claude/` directory (not
  created by this session's work; leave it, don't delete without checking
  what it is first).
- Latest commit: `221e326`. Full log this session, oldest→newest:
  `0c42187` (dist/styles.css docs) → `a819158`/`efed1af` (DEF-004) →
  `02d11cf`/`1ea8ab4` (DEF-007) → `ade91ba` (margin/padding fix) →
  `12d4203` (font-loading fix) → `221e326` (docs for both).

## What was closed this session

- **DEF-004** — 3 lint errors (a missing-plugin config gap + one real
  `prefer-const`). See `ledger.md` L-024.
- **DEF-007** — `pnpm audit` findings: actually 15, not the ticket's 8, one
  reaching production. User explicitly authorized major-version toolchain
  bumps (vite/vitest/@vitejs-plugin-react/playwright/typescript) to close
  all of them. See `ledger.md` L-025, D-010.
- **Android on-device testing** (the user's actual ask this session):
  installed a signed release APK first (blank-screen symptom, later
  root-caused as a stale build artifact, not a live bug), then built and
  installed a proper **debug** APK (needed NDK r27c, a `rustup target add
  aarch64-linux-android`, and `JAVA_HOME` pinned to the system's Java 17 —
  Gradle 8.9 doesn't run under Java 25) to get WebView remote-debugging
  access via `adb forward` + Chrome DevTools Protocol.
- **Two real UI bugs found and fixed** via that on-device testing:
  - **L-026**: `.claymark-root`'s max-width/padding was applied three
    times (`ThemeProvider` + a redundant wrapper in `src/app/main.tsx` +
    `MarkdownRoot`), stacking to ~120px of horizontal padding on a phone
    viewport. Fixed by removing `main.tsx`'s redundant layer. Commit
    `ade91ba`.
  - **L-027**: `public/fonts/*.woff2` (Source Serif 4, Inter, JetBrains
    Mono) were bundled but **no `@font-face` rule anywhere loaded them** —
    `src/theme/fonts.ts` was unconsumed metadata, so every font stack fell
    through to system fallbacks (Georgia/sans/monospace) on every
    platform, silently, since before this session. Added
    `src/theme/fonts.css`, wired into `src/styles.css` and `index.html`.
    Verified via CDP (`document.fonts`) that the real fonts now load
    on-device. Commit `12d4203`.

## Decisions made this session (see `ledger.md` D-009/D-010 for the
   DEF-005/DEF-007 ones; these two are new)

- **Browser extension: confirmed deferred, not in scope.** The user's
  earlier "three deliverables" framing (Linux/Windows app, browser
  extension, Android app) doesn't match `docs/SPEC.md` §5, which lists no
  browser extension at all — the user clarified they meant the PWA
  (`claymark-app`), which already exists. A real WebExtension stays
  explicitly deferred until everything else is done. Full reasoning and
  the locked policy: `workflow.md`.
- **Feature-parity workflow locked as `workflow.md`** — Option A: keep the
  shared-core architecture (PWA/Desktop/Android all package the same
  `dist/app` build), work sequentially on one surface at a time, verify
  with a repeatable per-target checklist, flag platform divergence before
  building rather than assuming. Read that file before starting any new
  feature work — it's binding, not a suggestion to re-litigate.

## Open items, in the order they'd naturally come up

1. **DEF-008** — Android release signing keystore. Needs the user's call on
   a signing identity; do not decide unilaterally.
2. **DEF-009** — Android debug/release APK's `lib/arm64-v8a/libapp_lib.so`
   fails Android's 16 KB page-size alignment check (surfaces as a system
   "Android app compatibility" dialog on install, not a Claymark bug).
   Needs an NDK/linker flag fix for the Rust/Cargo Android target. Not
   attempted yet.
3. **macOS/Windows Tauri desktop cross-builds** — only Linux
   `.deb`/`.rpm`/AppImage exist. Not attempted yet.
4. **Whether to open a PR** for `defect-closure` → `ui-wip` — pushed but
   not asked for. Ask before opening one.
5. Two full-suite-load timing flakes remain **known, pre-existing, and
   accepted**, not regressions: `tests/stress.spec.ts` and
   `tests/bench.spec.ts` occasionally time out under concurrent CPU load
   (e.g. an Android build running in parallel) but pass 2/2 every time run
   in isolation. Don't re-investigate these from scratch — see `ledger.md`
   L-021/D-009 and this session's confirmation for the established
   pattern.
6. `ui-wip` UI-polish open items carried from before this session (unchanged,
   see `progress.md`'s own "not attempted this pass" section) — the
   `scratch/shadcn-prototype/` component integration decision, the
   `docs/SPEC.md` typography-numbers reconciliation, and the two hardcoded
   pill/reference colors in `src/theme/claymark.css`.

## Standing conventions (repeat of what earlier sessions already
   established, restated so a fresh session doesn't have to rediscover
   them)

- Never push a branch or open/update a PR without the user's explicit
  instruction, given fresh each time.
- One commit per defect/feature; document every one in `ledger.md`
  (evidence-based row) and check it off in `progress.md`.
- `spec.md`/`progress.md`/`ledger.md` are the canonical three-file
  contract (vargr-build-rules lock) — don't let `workflow.md`/`handoff.md`
  substitute for them; they're policy/pointer docs, not the record.
- Verify before claiming done: command output or a real re-read, never
  "should work."
