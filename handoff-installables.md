# Claymark — handoff: Linux + Windows desktop installables (2026-09-18)

Written for the next session, whose scope is **only** the Linux and Windows
desktop installables (`src-tauri/`, the Tauri wrapper around the `claymark`
web app). Android is done — see `handoff.md` for that (native
`claymark-native/` app: v1.0.0 tagged, signed release APK committed, merged
to `master`). A browser extension is also still outstanding but is explicitly
**not** this session's job — don't scope-creep into it.

## The one-line status

**Nobody has successfully built the desktop app in this environment.** Not
"it built and then rotted" — a from-scratch `cargo check` in `src-tauri/`
fails immediately because required system libraries aren't installed. Treat
any doc claiming otherwise (see below) as unverified until you personally
reproduce a green build.

## What I actually did to verify this (2026-09-18), reproduce these yourself

```bash
cd "/home/vipul/My Projects/Claymark/claymark"
pnpm install --frozen-lockfile   # succeeded, 5.6s, reconciled some node_modules drift
pnpm build:app                   # succeeded — the PWA/frontend build is fine, 53.8s
cd src-tauri
cargo check                      # FAILS
```

The `cargo check` failure, verbatim root cause:

```
error: failed to run custom build command for `soup3-sys v0.5.0`
...
Package libsoup-3.0 was not found in the pkg-config search path.
The system library `libsoup-3.0` required by crate `soup3-sys` was not found.
```

I also checked directly — **none** of the Tauri Linux build dependencies are
installed on this machine (Ubuntu 26.04.1 LTS, host `HPpavilionpro`, x86_64):

```bash
pkg-config --exists webkit2gtk-4.1        # MISSING
pkg-config --exists javascriptcoregtk-4.1 # MISSING
pkg-config --exists ayatana-appindicator3-0.1  # MISSING
which patchelf        # not found
which linuxdeploy     # not found
which appimagetool    # not found
which rpmbuild         # not found (blocks .rpm bundling even once the rest works)
```

`dpkg-deb` **is** present, so `.deb` bundling itself will work once the app
compiles — the blocker is purely the missing dev headers for the compile
step, not the packaging tooling.

There is also **no evidence any bundle was ever produced on disk**:
`find src-tauri/target -path "*bundle*"` returns nothing, and
`src-tauri/target/release/` contains only dependency build-script artifacts
(`.cargo-lock` etc.), no linked binary, no `bundle/` directory.

## The documentation says something different — it's wrong, or stale, or both

- `docs/CURRENT-STATE.md` §5 claims: *"Desktop app | Tauri-packaged native
  binary — Linux `.deb`/`.rpm`/AppImage built and confirmed this cycle;
  macOS/Windows build the same way but weren't cross-built in this Linux
  session | `src-tauri/target/release/bundle/`"* — that directory does not
  exist right now.
- `progress.md` (root) lists as an open item: *"macOS/Windows Tauri desktop
  cross-builds (only Linux `.deb`/`.rpm`/AppImage exist)"* — same false
  premise, Linux doesn't currently exist either.
- Git history has a real commit, `ab101f1` — *"T-P9-03: Tauri desktop shell
  scaffold, icons, verified build+bundles"* — so a Linux bundle **was**
  produced successfully at some point, on some environment, with the right
  system libraries present. That environment is not this one, or those
  libraries were removed since. Don't take "it was built once" as "it builds
  now" — I just proved it doesn't, in this session, right now.

**Bottom line for the next session: fix the actual doc claims once you have
real evidence.** Don't just take my word for the current failure either —
reproduce it yourself, then fix it, then re-verify, then correct
`docs/CURRENT-STATE.md` and `progress.md` to match reality (this codebase's
own operating rules are explicit about no completion claims without
evidence — apply that here too).

## What "done" looks like for this session

1. **Linux**: install the missing system packages, get `cargo check` (then
   `cargo build --release`) green, then run an actual Tauri bundle command
   (see below) and confirm real `.deb`/`.rpm`/AppImage files exist on disk
   and — ideally — that at least the `.deb` actually installs and launches
   on this machine.
2. **Windows**: this machine is Linux. Cross-compiling a *Windows* Tauri
   bundle (`.msi` via WiX, or `.exe` via NSIS) from Linux is not a supported,
   reliable Tauri workflow — Tauri's own docs push cross-platform bundling
   toward CI (GitHub Actions with a `windows-latest` runner) rather than
   local cross-compilation. **Don't burn time trying to force a native
   Windows installer out of this Linux box.** The realistic path is either:
   - Set up a GitHub Actions workflow that builds the Windows bundle on a
     `windows-latest` runner (this repo doesn't have a `.github/workflows/`
     directory yet — check before assuming one exists), or
   - Explicitly tell the user Windows needs to happen on/via a Windows
     machine or CI, and scope this session to Linux only unless CI is what
     they meant by "Windows installable."
   This is a genuine ambiguity in the original ask ("the linux and windows
   installable") — resolve it with the user early rather than guessing which
   path they want.

## Exact commands to pick up with

```bash
# 1. Install Linux build deps (Ubuntu/Debian — this machine is 26.04.1 LTS)
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf build-essential curl wget file libssl-dev libgtk-3-dev rpm

# 2. Rebuild from clean
cd "/home/vipul/My Projects/Claymark/claymark"
pnpm install --frozen-lockfile
pnpm build:app
cd src-tauri
cargo check          # must go green before attempting a full bundle
cd ..

# 3. Actual bundle (uses tauri.conf.json's "bundle.targets": "all")
pnpm tauri build      # or: npx tauri build
# bundles land under src-tauri/target/release/bundle/{deb,rpm,appimage}/

# 4. Verify, don't just trust exit code 0
ls -la src-tauri/target/release/bundle/*/
# install the .deb somewhere disposable and confirm the app actually launches
```

## Relevant config already in place (don't rediscover this)

- `src-tauri/tauri.conf.json`: `productName: "claymark"`, `version: "1.0.0"`,
  identifier `com.claymark.app`, `bundle.targets: "all"`, icons already
  reference `.icns`/`.ico`/PNG variants under `src-tauri/icons/` (confirm
  they still exist — Android icon cleanup this session only touched
  `src-tauri/icons/android/`, not the root `src-tauri/icons/` set, but verify
  before assuming).
- `@tauri-apps/cli` is `2.0.0` (Tauri v2) — bundling commands and config
  schema are v2-shaped, not v1.
- Android-specific Tauri build artifacts (`src-tauri/gen/android/`,
  `src-tauri/icons/android/`) were **deliberately removed** in the previous
  session (2026-09-15) — the native Android app (`claymark-native/`) replaced
  that path entirely. Don't recreate them; that's settled, not an oversight.
- The Rust toolchain itself is fine: `cargo 1.98.0`, and only
  `x86_64-unknown-linux-gnu` + the four Android NDK targets are installed via
  `rustup target list --installed` — no Windows target (`x86_64-pc-windows-*`)
  is present, consistent with "Windows needs its own machine/CI" above.

## Two-products reminder (same note as `handoff.md`, repeated because it matters here)

This repo root is the `claymark` **library + Tauri desktop shell**. It is a
separate product line from `claymark-native/` (the finished Android app).
Nothing you do here should touch `claymark-native/`, and nothing there is
relevant to this work beyond "Android is done, don't worry about it."

## Also still outstanding (not this session, just so you know it exists)

A **browser extension** was mentioned by the user as a remaining deliverable
alongside the desktop installables. No investigation into it has been done —
no directory, config, or manifest for one exists in this repo as of this
handoff. If the user brings it up, it needs its own scoping/handoff; don't
assume it's related to the Tauri desktop build.
