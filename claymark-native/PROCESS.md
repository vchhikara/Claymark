# Claymark native Android port — process handout

**Session date:** 15 September 2026
**Input:** `claymark-android-src.zip` (Tauri v2 / React / TypeScript), `brand_guidelines.md`
**Output:** `claymark-native-android.zip` — a Gradle project, 123 files, 20 Kotlin sources, ~5 MB unpacked
**Not done in session:** compilation. No Android SDK or emulator was available, so nothing was built or run.

---

## 1. Workflow, in order

| Phase | What happened | Why this order |
|---|---|---|
| Read | Unpacked the zip, read docs → app shell → session logic → theme → pipeline → components → native bridges | The prompt named a priority reading order; `src/` was treated as the real spec and the docs as intent |
| Clarify | Three blocking questions asked before any code | Each wrong guess would have meant rebuilding the design layer or the two hardest render paths |
| Prep | Converted fonts, fetched pinned KaTeX/Mermaid | Both are inputs the rest of the build depends on; failing late would have wasted the whole scaffold |
| Scaffold | Gradle files, manifest, resources, asset tree | Structure before content, so every later file had a known home |
| Build | Tokens → theme → documents → session → markdown → UI → shell → activity | Strict dependency order, leaves first — nothing was written before the thing it imports |
| Review | Manual correctness pass, four fixes applied | No compiler, so this substituted for one |
| Package | Zip, present, report | — |

### Why clarification came before code

Three ambiguities were genuinely blocking rather than merely uncertain:

1. **Claymorphism contradicted the attached brand guidelines.** §7 of `brand_guidelines.md` states Claymark is "not loud" and that the document outranks the chrome; the prompt said match `tokens.css` precisely. Guessing scope wrong meant rewriting every surface.
2. **Math and Mermaid have no native Compose renderer.** The four viable answers produce four different architectures.
3. **Package name.** `com.claymark.app` would have made the native APK replace the Tauri build on-device and compete for the "Open with" registration.

The answers — chrome-only clay, WebView for both renderers, side-by-side install — determined the shape of `theme/Claymorphism.kt`, `markdown/WebViews.kt`, and the whole asset pipeline. None could have been retrofitted cheaply.

---

## 2. Tool calls

23 calls total. Ordered as they ran.

### Reading (7 calls)

| # | Tool | Purpose |
|---|---|---|
| 1 | `bash_tool` | Unzip, list tree (200 files) |
| 2 | `bash_tool` | Doc line counts + `cat brand_guidelines.md` |
| 3 | `bash_tool` | `README.md`, `spec.md`, `SECURITY-AUDIT.md` |
| 4 | `bash_tool` | `src/app/main.tsx` |
| 5 | `bash_tool` | `useDocumentSession.ts`, `documents/types.ts`, `draft-store.ts` |
| 6 | `bash_tool` | `backends/tauri.ts`, `document-service.ts` |
| 7 | `bash_tool` | `theme/tokens.css` |

### Reading, continued (5 calls)

| # | Tool | Purpose |
|---|---|---|
| 8 | `bash_tool` | `theme/claymark.css` — the largest single source of visual truth |
| 9 | `bash_tool` | Pipeline core: `processor.ts`, `url-policy.ts`, `links.ts`, `math.ts`, `shiki-config.ts`, `gfm.ts`, `prettify-code.ts` |
| 10 | `bash_tool` | `InlineCode/CodeBlock/Heading/Table/ThemeToggle.tsx`, `ThemeProvider.tsx` |
| 11 | `bash_tool` | `MainActivity.kt`, `ContentResolverPlugin.kt`, `AndroidManifest.xml`, `lib.rs` |
| 12–14 | `bash_tool` ×3 | `map.tsx` + `code.ts`; remaining components; `MarkdownRoot`, `fonts.css`, `MermaidDiagram`, `useStreamingMarkdown` |

### Clarification (1 call)

| # | Tool | Purpose |
|---|---|---|
| 15 | `ask_user_input_v0` | Three tappable questions — clay scope, math/Mermaid strategy, application ID |

### Environment prep (4 calls)

| # | Tool | Purpose |
|---|---|---|
| 16 | `bash_tool` | `pip install fonttools brotli`; converted six `.woff2` → `.ttf` via fontTools (Android has no woff2 loader) |
| 17 | `bash_tool` | Queried npm registry for KaTeX / Mermaid latest tags |
| 18 | `bash_tool` | Verified the project's **pinned** versions (katex 0.16.47, mermaid 10.9.8) still exist — used those, not latest |
| 19 | `bash_tool` | Downloaded and extracted both tarballs |

### Scaffold (3 calls)

| # | Tool | Purpose |
|---|---|---|
| 20 | `bash_tool` | First scaffold attempt — **failed**: the shell is `sh`, not `bash`, so `mkdir -p {a,b,c}` created a directory literally named `{values,values-night,xml,drawable}` |
| 21 | `bash_tool` | Inspected the damage |
| 22 | `bash_tool` | Rebuilt with an explicit loop; copied icons, TTFs, KaTeX, Mermaid, woff2 |

### Authoring (17 `create_file` + 4 `bash_tool` patch calls)

Gradle files and manifest/resources were written with heredocs; all Kotlin, HTML and Markdown with `create_file`. Four `bash_tool` calls ran Python patch scripts for post-hoc fixes.

### Delivery (3 calls)

`bash_tool` (verify tree) → `bash_tool` (zip) → `present_files`.

---

## 3. Decisions worth recording

| Decision | Rationale |
|---|---|
| `applicationId = com.claymark.nativeapp` | You chose `com.claymark.native`, but `native` is a reserved Java keyword and cannot be a package segment — it breaks the generated `R` class. Same side-by-side outcome |
| Pinned KaTeX/Mermaid versions, not latest | The project's `SECURITY-AUDIT.md` documents a deliberate pin at mermaid 10.9.8 (11.x was alpha) and katex 0.16.47. Jumping to 12.0.0 / 0.18.7 would have silently discarded that decision |
| Spacing scale resolved at 18 px/rem | `--text-body: 18px` is the root font size, so `--space-4: 1rem` is 18 dp, not 16. Using 16 would have made the port "look close but feel wrong" |
| Dropped `INTERNET` permission | The README's "zero runtime network requests" becomes platform-enforced. Flagged as the most contestable call in the session |
| HSL triplets kept verbatim in `Tokens.kt` | So the file diffs against `tokens.css` line for line, rather than being a pre-resolved hex approximation |
| `WebViewAssetLoader` over `file://` | `allowFileAccess` defaults false on API 30+; a synthetic origin also gives the pages a real same-origin policy |
| Kept `DOWNLOAD_COPY` in the enum | Unreachable on this backend, exactly as on Tauri. Narrowing the contract would have hidden a product decision |
| Platform `Dialog` for the abandon prompt | Directly addresses the on-device finding behind `overflow-x: hidden` — a runaway-width row once dragged a fixed-position modal off-screen. A dialog window cannot be pushed off by content layout |

---

## 4. Fixes caught in the review pass

No compiler ran, so these were found by reading. All four were real defects:

1. **`HeightBridge` name clash** — a constructor property `onHeight: (Float) -> Unit` alongside a method `onHeight(Int)` calling `onHeight(...)`. Ambiguous at best, infinite recursion at worst. Renamed to `heightCallback` / `errorCallback`.
2. **Double density scaling** — the WebView reports CSS pixels, which with `initial-scale=1` are already dp. Converting again via `toDp()` would have scaled every math block and diagram by the device density a second time.
3. **`clip()` before `clayRaised()`** — clipped away the shadow the modifier exists to draw.
4. **Side effect during composition** — `ImageLightbox` called `onClose()` inline when no bitmap decoded. Moved into a `LaunchedEffect`.

Also fixed: the blockquote rule used `fillMaxWidth(0f)` with a fixed height instead of `IntrinsicSize.Min` + `fillMaxHeight`, and `ReadingProgressRail` called a non-existent `fillMaxHeightFraction` helper.

---

## 5. Recommendations

### Do first, before anything else

1. **Compile it.** Unused imports are warnings, but the review pass was unaided — expect a handful of genuine type errors on the first `assembleDebug`. `markdown/Blocks.kt` and `markdown/WebViews.kt` are the likeliest sites.
2. **Verify the WebView height handshake on a real device.** If math blocks or diagrams render collapsed or over-tall, the CSS-px assumption or the `document.fonts.ready` timing is wrong. This is the single most fragile piece.
3. **Confirm Mermaid 10.9.8's `render()` promise shape.** `mermaid.render(id, source).then(r => r.svg)` is the 10.x API, but it was not run.
4. **Re-test the MediaDocumentsProvider route on the POCO M2 Pro.** The writability gate now has two layers — the URI-prefix check you already had, plus a real `persistedUriPermissions` query. Verify that the drawer route still correctly offers Save-as rather than Save.

### Then

5. **Decide the remote-images question.** Either accept alt-text-only (current), or add `INTERNET` plus Coil and update the README, which currently contradicts `url-policy.ts`.
6. **Check spacing against the Tauri build side by side.** Both APKs can be installed at once — that was the point of the separate application ID. Open the same file in each and compare.
7. **Inline code pills.** If the flat span background reads as broken rather than merely simplified, `InlineTextContent` with a custom-drawn rounded background is the fix.

### Larger follow-ups, in rough value order

8. **Highlighter fidelity.** If the lexical tokenizer proves too coarse, the realistic upgrades are a KMP highlighter library or running Shiki in the existing WebView infrastructure — the second is architecturally cheap now that the asset loader exists, but puts code blocks back in a WebView.
9. **Inline math in mixed paragraphs.** Currently only plain-text paragraphs route to KaTeX. Generating the escaped HTML from the full inline AST rather than flattened text would cover bold, links, and inline code alongside math.
10. **Accessibility sweep.** The web build conformed to WCAG 2.2 AA with zero axe-core violations. Nothing equivalent was checked here: content descriptions, TalkBack traversal, and the disabled-checkbox semantics all need a pass.
11. **Tests.** The original carried 355. This port has none. The highest-value targets are `UrlPolicy.safeUrl` (the security boundary, and directly portable from the existing test vectors), `MarkdownParser.preprocessDisplayMath`, and the `DocumentSession` state machine.

### Don't

- Don't add features, screens, or settings. Scope discipline was explicit and the port holds to it.
- Don't "fix" the theme-independent `#a84545` / `#3367d6` inline-code colors, the 15 px / 12 px code size split, or `clay-700` as the light-theme link. All three are recorded decisions, not oversights.
