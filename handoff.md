# Claymark — handoff (2026-09-15)

Written at the end of a session that took `claymark-native/` (the Kotlin/Jetpack
Compose native Android port) from a polish pass through to a signed v1.0.0
release, merged the native-port branch into `master`, removed stale Tauri
Android build artifacts, and synced project state to Notion. This is a status
snapshot for whoever picks up next — human or agent.

## What shipped this session

- **UI polish pass** on `claymark-native/` (drawer nav icon row, clayPot table
  borders, thinned reading-progress rail, correct brand-mark logo, Settings
  text-size stepper now uses `+`/`−` icons instead of `A+`/`A-` text, Print
  feature archived not deleted — see `claymark-native/archive/print-support/`).
- **Verified crash-free** on two physical devices: `RZ2XA00Y4MD` (SM_X610
  tablet) and `RZGL322202Z` (SM_S931B phone).
- **Signed release build wired up**: `claymark-native/keystore.properties`
  (gitignored) points at a newly generated keystore,
  `claymark-native/keystore/claymark-release.jks` (also gitignored — **back
  this up somewhere safe**, e.g. a password manager or offline copy; losing it
  means no future release build can be signed with the same identity as
  v1.0.0). `./gradlew assembleRelease` produces a v2-scheme-signed APK.
- **`v1.0.0` tag** on `master`, plus the built APK committed at
  `claymark-native/releases/claymark-v1.0.0.apk`.
- **Git**: `kotlin-native-port` branch pushed, merged into `master` (no
  conflicts), pushed. Stale Tauri **Android-only** build artifacts removed
  (`src-tauri/gen/android/`, `src-tauri/icons/android/`) — the desktop Tauri
  shell and Rust core were explicitly left untouched, per the user's scoping.
- **Notion**: new project entry created (workspace `Projects` DB) with
  Spec/To-do/Ledger child pages; `.notion_sync_state.json` written at repo
  root (currently untracked — not yet committed, see below).

## Known stale state — do not trust blindly

- **`spec.md` / `progress.md` / `ledger.md` at the repo root are stale**,
  still describing the pre-merge `ui-wip` state as of 2026-09-06. They were
  synced to Notion as-is (that's what the sync runbook requires — mirror,
  don't editorialize) but were never rewritten to reflect this session's
  native-Android work. If the next session runs `/notion-sync` again, expect
  it to push the same stale content unless these files are updated first.
- **`.notion_sync_state.json`** exists at repo root but is currently
  **untracked** — not committed. Decide whether it should be gitignored
  (machine/session-local state, arguably shouldn't be shared) or committed
  (so any session on any machine resumes the same Notion linkage). Not
  decided this session.

## Open items (from `progress.md`, not re-verified this session)

- GATE G9 — human acceptance of the v1.0.0 web/library delivery. Requires the
  user; not self-approvable.
- `DEF-001` (dead-export audit), `DEF-003` (KaTeX lazy-load), `DEF-004`
  (3 pre-existing lint errors), `DEF-005`/`DEF-006` (two known test flakes),
  `DEF-007` (8 devDependency-only audit findings) — all still open, not
  touched this session.
- macOS/Windows Tauri desktop cross-builds — only Linux `.deb`/`.rpm`/AppImage
  exist.
- `scratch/shadcn-prototype/` components (`Dialog`, `Table`, `Badge`,
  `Separator`, `ScrollArea`, `Menubar`, `Toast`) — still sitting unintegrated,
  undecided whether they're wanted.
- `docs/SPEC.md`'s typography numbers vs. the shipped `ui-wip` token changes —
  flagged as a product-copy decision in an earlier session, never resolved.

## Two products, one repo — don't conflate them

- **Root of repo**: the `claymark` npm library/rendering engine + Tauri
  **desktop** shell (`src-tauri/`). This is what `spec.md`/`progress.md`/
  `ledger.md` at the root actually describe (mostly pre-dates this session's
  work).
- **`claymark-native/`**: the Kotlin/Compose native Android app
  (`com.claymark.nativeapp`), now the primary Android app. This session's
  work was entirely here. It has its own `README.md`, `PROCESS.md`,
  `BUILD-AUDIT.md`, and the now-stale `HANDOFF-2.md` (superseded by this
  file for anything about signing/release/git state — `HANDOFF-2.md`'s "never
  compiled" note is historical, not current).

## Quick orientation for the next session

- Build: `cd claymark-native && JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
  ./gradlew assembleDebug -q` (silent = success).
- Install/verify loop: `adb devices -l` → `adb -s <id> install -r <apk>` →
  `adb -s <id> shell am force-stop com.claymark.nativeapp` → `adb -s <id>
  logcat -c` → `adb -s <id> shell am start -n
  com.claymark.nativeapp/.MainActivity` → screenshot → check logcat for
  `FATAL EXCEPTION`.
- Release build: `./gradlew assembleRelease -q`, output at
  `app/build/outputs/apk/release/app-release.apk`, verify with `apksigner
  verify --verbose <apk>` (found at
  `$ANDROID_HOME/build-tools/<version>/apksigner`).
- If `keystore.properties` is ever missing, `assembleRelease` silently
  produces an **unsigned** APK — check for it before assuming a release build
  is distributable.
