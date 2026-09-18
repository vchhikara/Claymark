# Claymark — native Android

A native Android build of Claymark: Kotlin and Jetpack Compose, not a WebView
shell. Same product, same behavior, same palette and type as the Tauri/React
original in `claymark-android-src.zip`.

The reading surface is Compose. Two things are not: KaTeX math and Mermaid
diagrams run in a locked-down WebView loading bundled assets, because no
native equivalent for either exists on the JVM.

---

## Building

```bash
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

A release build needs your own signing config; the module ships none.

Requirements: JDK 17, Android SDK with platform 35 and build-tools 35. Gradle
8.9 is fetched by the wrapper on first run. All dependencies come from
`google()` and `mavenCentral()`.

`applicationId` is `com.claymark.nativeapp`, not `com.claymark.app`, so this
installs alongside your Tauri APK. It is also not `com.claymark.native` —
`native` is a reserved Java keyword and cannot be a package segment, which
would break the generated `R` class.

---

## What's where

| Path | Ports |
|---|---|
| `theme/Tokens.kt` | `src/theme/tokens.css` — every color, space, radius, type step |
| `theme/Theme.kt` | `src/theme/ThemeProvider.tsx` — system theme + persisted override |
| `theme/Fonts.kt` | `src/theme/fonts.css` — the three typefaces |
| `theme/Claymorphism.kt` | new — the clay treatment, chrome only |
| `documents/DocumentBackend.kt` | `src/documents/backends/tauri.ts` + `ContentResolverPlugin.kt` |
| `documents/DraftStore.kt` | `src/documents/draft-store.ts` |
| `session/DocumentSession.kt` | `src/hooks/useDocumentSession.ts` |
| `markdown/Parser.kt` | `src/pipeline/processor.ts` |
| `markdown/UrlPolicy.kt` | `src/pipeline/plugins/url-policy.ts`, `links.ts` |
| `markdown/Highlighter.kt` | `src/pipeline/plugins/code.ts`, `shiki-config.ts` |
| `markdown/Inlines.kt` | `src/components/{Link,Inline,InlineCode,Heading}.tsx` |
| `markdown/Blocks.kt` | `src/components/map.tsx` and most of `claymark.css` |
| `markdown/CodeBlockView.kt` | `src/components/{CodeBlock,CopyButton}.tsx` |
| `markdown/TableView.kt` | `src/components/Table.tsx` |
| `markdown/WebViews.kt` | `src/components/MermaidDiagram.tsx` + the math pipeline |
| `ClaymarkApp.kt` | `src/app/main.tsx` |
| `MainActivity.kt` | `MainActivity.kt` + `lib.rs`'s two Tauri commands |

---

## Security posture

Stricter than the original in one respect, identical in the rest.

- **No `INTERNET` permission.** The original declared it because the Tauri
  WebView needed it to load its own bundle. Nothing here does, so "zero
  runtime network requests" is enforced by the platform rather than by
  convention. KaTeX and Mermaid are bundled in `assets/`.
- **Raw HTML is shown as text, never rendered.** No override.
- **URL schemes are allow-listed** (`http`, `https`, `mailto`, plus
  `data:image/{png,jpeg,gif,webp}`), including the percent-escape probe that
  catches `java%09script:`-style payloads.
- **The WebViews cannot escape the APK.** Assets are served from a synthetic
  origin via `WebViewAssetLoader`; every other request is answered with an
  empty 404, navigation is blocked outright, and the content handed to them
  is generated from the parsed AST, never document markup.
- **External links leave the app** through the system chooser — the native
  equivalent of `target="_blank" rel="noopener noreferrer"`.

---

## Known deviations

Detail on each of these is in the handover report; the short list:

1. **Syntax highlighting is lexical, not TextMate.** Same 34-language
   registry and same two palettes, but a hand-written tokenizer stands in for
   Shiki.
2. **No Prettier pre-formatting** of code fences before highlighting.
3. **Inline math re-renders its whole paragraph** in the KaTeX WebView, and
   only for paragraphs that are plain text.
4. **Remote images are not fetched** — they show alt text. This follows from
   dropping `INTERNET`.
5. **The streaming pipeline is absent.** It has no role in a local
   single-file reader.
6. **Inline code pills are flat.** Compose paints span backgrounds without
   padding or corner radius.
