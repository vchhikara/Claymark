I've attached a zip of the source for **Claymark**, an existing cross-platform app currently built with Tauri v2 (Rust backend + a React/TypeScript web frontend, compiled to an Android APK via a WebView shell). I want you to build a **native Android duplicate of it** — same product, same behavior, same look — but written as a proper native Android app (Kotlin + Jetpack Compose, not a WebView wrapper).

## What Claymark is

A pixel-faithful, security-hardened Markdown reading app. It renders Markdown (CommonMark + GFM, math via KaTeX-equivalent, syntax-highlighted code in ~34 languages, Mermaid-style diagrams, tables) as a clean, editorial reading surface — think "a calm, serif-typeset reader for .md files," not a code editor and not a WYSIWYG editor. Security is a core product pillar: it never executes raw HTML or scripts from a document, never makes runtime network requests, and only allow-lists safe URL schemes for links. Full product framing is in `README.md`, `spec.md`, and `SECURITY-AUDIT.md` in the zip — read those first for the product's intent and its explicit non-goals ("What Claymark deliberately will not do").

## What to build

1. **Read the whole zip before writing any code.** Priority reading order:
   - `README.md`, `spec.md`, `SECURITY-AUDIT.md` — product intent, security model, what NOT to build.
   - `src/` — the actual application logic (this is the real spec, more precise than the docs): document open/save/edit flow (`src/hooks/useDocumentSession.ts`, `src/documents/`), the Markdown rendering pipeline (`src/pipeline/`), UI components (`src/components/`, `src/app/main.tsx`).
   - `src/theme/` (tokens.css, fonts.css, claymark.css) — the full design system: exact colors (HSL tokens for light/dark), typography (Source Serif 4 for body, Inter for UI chrome, JetBrains Mono for code — get the font files from `public/fonts/`), spacing scale, radii. This is the visual source of truth; match it precisely, don't approximate.
   - `src-tauri/src/lib.rs` + `src-tauri/gen/android/app/src/main/java/com/claymark/app/*.kt` — the two native Android bridges this app already needed (a ContentResolver DISPLAY_NAME lookup for opaque `content://` URIs, and an incoming-intent handler for "Open with" file-manager launches). Port this logic natively — in a native app it should be simpler (no Tauri plugin bridge needed, just direct ContentResolver/Intent calls from Kotlin).
   - `src-tauri/gen/android/app/src/main/AndroidManifest.xml` — the intent-filters for the file-manager "Open with" integration (VIEW action, text/markdown mime type, .md/.markdown file patterns) — replicate these exactly so the native app is also a registered handler for Markdown files.

2. **Native Android stack**: Kotlin, Jetpack Compose for UI, Android's Storage Access Framework (`ACTION_OPEN_DOCUMENT`/`ACTION_CREATE_DOCUMENT`) for the open/save-as file pickers — this replaces `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` 1:1. Use a real CommonMark+GFM parser (e.g. a Kotlin/JVM Markdown library), a real syntax highlighter for code blocks, and a math-rendering approach for the subset of math this app supports — check `src/pipeline/` for the exact feature set (don't add anything it doesn't already do).

3. **Preserve the app's specific behaviors, not just its visual style** — these are real product decisions already made, not incidental:
   - The distinction between `save`, `save-as`, and `download-copy` actions, and exactly when each is offered (see `PERSIST_LABEL` and `persistAction` logic in `src/app/main.tsx` and `src/documents/backends/tauri.ts`).
   - The `writable` flag logic — some Android content URIs (MediaDocumentsProvider / the "Recent"/"Documents" drawer route) have no persistable write grant, and the app must not offer a Save button that's guaranteed to fail for those.
   - The unsaved-changes ("abandon") confirmation flow before navigating away from a dirty edit.
   - Draft recovery after an unexpected close (see `draftStore` / `recoveredDraft` in `useDocumentSession.ts`).
   - The reading-progress indicator, sticky header behavior, and the "editing is deliberately secondary to reading" posture (a single Edit button, plain textarea editing — not a rich editor).

4. **Scope discipline**: build exactly what's in the zip, nothing more. Don't add features, settings, or screens the existing app doesn't have. Don't introduce a backend/server/sync — this is a fully local, offline, single-file-at-a-time reader. If something in the zip is ambiguous, say so and ask rather than guessing.

5. When done, give me a short report: what you built, which parts of the original behavior you could not port 1:1 (and why), and what's left unverified because you couldn't run it on a device.

Ask me anything you need clarified before you start rather than assuming.
