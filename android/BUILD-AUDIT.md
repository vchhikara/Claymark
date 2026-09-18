# Build Audit — Native Kotlin/Compose Port

Date: 2026-09-15
Auditor: Claude Sonnet 5 (Claude Code session)

## Summary

The native port (delivered unbuilt, per HANDOFF-2.md/PROCESS.md) was compiled,
installed, and launched on a physical device for the first time in this session.
**It built successfully with one trivial fix and runs without crashing.**

## Environment

- Java: OpenJDK 25 installed as default; **build required forcing JAVA_HOME to
  JDK 17** (`/usr/lib/jvm/java-17-openjdk-amd64`) — Gradle 8.9 / AGP in this
  project do not support JDK 25 as the build JVM. Not a code defect, but the
  next person building this needs JDK 17 available.
- Android SDK: `/home/vipul/Android/Sdk` (pre-existing on this machine).
  `local.properties` did not exist in the delivered zip — created here with
  `sdk.dir=/home/vipul/Android/Sdk`. **`local.properties` is gitignored and
  machine-specific — every new environment must recreate it.**
- Device: physical Android phone (`RZGL322202Z`), installed alongside the
  existing Tauri build (`com.claymark.app`) since the native port uses a
  separate package id (`com.claymark.nativeapp`) by design.

## Build result

```
./gradlew assembleDebug
BUILD SUCCESSFUL in 2m 10s
35 actionable tasks: 33 executed, 2 up-to-date
```

Output: `app/build/outputs/apk/debug/app-debug.apk`, 12MB, signed with the
default debug keystore.

## Defect found and fixed

**`app/src/main/res/values/colors.xml:6`** — build failure:

```
ERROR: colors.xml:6:13: Resource and asset merger: The string "--" is not
permitted within comments.
```

XML comments cannot contain a literal `--` sequence. The comment referenced
the CSS custom property `--surface` (`hsl(48 45% 98%)` / `hsl(0 0% 9.8%)`),
which Android's XML resource parser rejects outright — this is a hard XML
spec rule (not Android-specific), so any file in this delivery that comments
using `--token-name` syntax will fail the same way.

**Fix applied:** reworded the comment to drop the `--` prefix ("the surface
token" instead of `` `--surface` ``). No logic change; content-only fix in the
Kotlin/XML resource layer, not the design intent.

**Only one such occurrence was hit** — the build did not surface any other
`res/values/*.xml` file with this pattern, but other files in the delivery
were not individually scanned for the same `--token` comment convention; a
targeted `grep -rn -- '--[a-z-]*-->\|<!--.*--[a-z]' app/src/main/res` is worth
running if more resource XML is added later.

## Runtime verification (this session)

- `adb install -r` — succeeded.
- `adb shell am start -n com.claymark.nativeapp/.MainActivity` — launched.
- Process confirmed alive post-launch (`ps -A | grep claymark` shows
  `com.claymark.nativeapp` running next to `com.claymark.app`).
- `logcat` scanned for `FATAL`/`AndroidRuntime`/error-level app output across
  the launch window — **none found**. No crash, no visible exception.

## Explicitly NOT verified in this pass

Per HANDOFF-2.md's own list of open items, none of the following were
exercised — only "does it build and launch without crashing" was checked:

- KaTeX math rendering inside the WebView host (`math.html`)
- Mermaid diagram rendering (`mermaid.html`)
- The `@JavascriptInterface` height-reporting bridge between the WebViews and
  Compose
- SAF-based Open/Save-as flow, including the "Open with" file-manager
  integration
- Writability gate behavior (read-only vs. writable SAF grants)
- Draft recovery / abandon-flow
- Dropped `INTERNET` permission's effect on remote image handling (flagged in
  HANDOFF-2.md as the most contestable design decision — expect alt-text-only
  rendering for remote images, unverified here)
- Visual/UI parity against the Tauri build, or against the Claymorphism theme
  spec
- Any on-device testing beyond "cold-launch, does it stay running"

## Recommendation

The one blocking defect (build-breaking XML comment) is fixed and the app now
builds and cold-launches cleanly. The substantive product verification listed
above (math, Mermaid, file I/O, draft recovery) is still outstanding and
should be the next work item before treating this port as functionally
equivalent to the Tauri app.
