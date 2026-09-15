# HANDOFF — Claymark native Android

**State:** written, never compiled. Treat every file as a first draft that has been carefully read but not machine-checked.
**Last session:** 15 September 2026
**Deliverable:** `claymark-native-android.zip` → project root `claymark-native/`

Read `PROCESS.md` for how this was built and why. This file is what to do next.

---

## 1. Start here

```bash
cd claymark-native
./gradlew assembleDebug
```

Requires JDK 17 and Android SDK platform 35 + build-tools 35. Gradle 8.9 arrives via the wrapper.

The first build will surface errors. That is expected and is not a sign the port is wrong — no compiler was available in the authoring session, so a manual read stood in for one. Fix them before judging anything else.

**Most likely error sites, in order:**

| File | What to watch |
|---|---|
| `markdown/Blocks.kt` | Largest file, most imports, most commonmark API surface. `OrderedList.markerStartNumber` nullability; `TaskListItemMarker` position in the AST |
| `markdown/WebViews.kt` | `AndroidView` + `WebViewAssetLoader` wiring; the `@JavascriptInterface` bridge |
| `markdown/TableView.kt` | `TableCell.Alignment` enum branches; the `generateSequence` traversal |
| `ui/Components.kt` | Modifier ordering after the clip removals |
| `session/DocumentSession.kt` | `CompletableDeferred` await inside `viewModelScope`; `by viewModels()` resolving the `AndroidViewModel` constructor |

Unused imports are warnings only — ignore them until the build is green.

---

## 2. Verify on device, in this order

Both APKs install side by side (`com.claymark.nativeapp` vs `com.claymark.app`), so every check below can be an A/B against the Tauri build with the same file open.

1. **Math and diagrams render at the right height.** The WebView reports CSS pixels, which are assumed to equal dp. If blocks come out collapsed, doubled, or clipped, that assumption or the `document.fonts.ready` measurement timing is wrong. Start at `RenderHost` in `markdown/WebViews.kt`.
2. **Mermaid renders at all.** `mermaid.render(id, source).then(r => r.svg)` is the 10.x API but was never executed. On failure the app falls back to a code block, so a silent fallback means this broke.
3. **The writability gate.** Open a document via the "Documents"/"Recent" drawer on the POCO M2 Pro. It must offer **Save as**, not Save. Then open one via the direct storage-volume route — that must offer **Save**. This is the behavior the original found live on-device; it now has two layers (URI prefix check plus a real `persistedUriPermissions` query).
4. **"Open with" from a file manager.** Both the `content://` mime-type filter and the `file://` `.md`/`.markdown` pattern. Expect read-only, hence Save-as.
5. **Draft recovery.** Edit without saving, force-stop the app, reopen the same file. The recovery notice should appear with the edited text.
6. **The abandon flow.** Dirty edit → Back (both the header button and the system gesture) → Save / Discard / Cancel, all three resolving correctly. Also from a failed save, which routes through the same prompt.
7. **Spacing and type against the Tauri build.** The scale resolves rem at 18 px, not 16. Arithmetically correct is not the same as looking right.

---

## 3. Open questions for the user

1. **Remote images.** Currently not fetched — the app declares no `INTERNET` permission, so `http(s)` images show alt text. This follows the README's "documents cannot load remote resources", but `src/pipeline/plugins/url-policy.ts` does permit `http`/`https` for `src`, so the browser build would have loaded them. The original is internally inconsistent here. **Decide which is authoritative** before building on top of it.
2. **Application ID.** Shipped as `com.claymark.nativeapp`, not the requested `com.claymark.native` — `native` is a reserved Java keyword and cannot be a package segment. Side-by-side install is unaffected. Confirm this is acceptable or supply another name.
3. **Claymorphism intensity.** Scoped to chrome as agreed and deliberately restrained. All of it lives in `theme/Claymorphism.kt`; the elevation, rim-light alpha, and gradient depth are three constants there. Easy to dial either direction after seeing it on a screen.

---

## 4. Known gaps, carried forward

None of these are bugs. They are scoped deviations, each documented at its site.

| Gap | Where | Upgrade path |
|---|---|---|
| Lexical highlighting, not TextMate | `markdown/Highlighter.kt` | KMP highlighter library, or Shiki in the existing WebView infrastructure |
| No Prettier pre-formatting of fences | absent | No standalone JVM equivalent; likely stays absent |
| Inline math only in plain-text paragraphs | `markdown/Blocks.kt` → `ParagraphBlock` | Generate the escaped HTML from the full inline AST instead of flattened text |
| Remote images not fetched | `markdown/Blocks.kt` → `FigureBlock` | Gated on open question 1 |
| Flat inline-code pills | `markdown/Inlines.kt` → `inlineCodeStyle` | `InlineTextContent` with a custom-drawn rounded background |
| Streaming reconciliation absent | n/a | Intentional. No role in a local single-file reader |
| Table column widths are heuristic | `markdown/TableView.kt` | Compose has no auto table layout; a `SubcomposeLayout` measuring pass would be exact |

---

## 5. Not started

- **Tests.** The original carried 355; this has zero. Highest value first: `UrlPolicy.safeUrl` (it is the security boundary, and the original's test vectors port directly), `MarkdownParser.preprocessDisplayMath`, then the `DocumentSession` state machine.
- **Accessibility.** The web build met WCAG 2.2 AA with zero axe-core violations. Nothing equivalent has been checked: content descriptions, TalkBack traversal order, disabled-checkbox semantics, contrast in both themes.
- **Release signing.** No signing config ships; `assembleRelease` needs one.
- **Performance.** The original had explicit budgets (< 16 ms for a 2 KB document, CLS 0). Nothing has been measured here. Large documents parse and compose synchronously.

---

## 6. Ground rules to keep

- **The code wins over the docs.** `src/theme/tokens.css` and `src/` are the source of truth; `README.md`, `spec.md`, and `brand_guidelines.md` describe intent.
- **No new features, screens, or settings.** Scope discipline was explicit.
- **Do not "fix" these** — they are recorded decisions, not oversights: the theme-independent `#a84545` / `#3367d6` inline-code colors; the deliberate 15 px inline / 12 px block code size split; `clay-700` as the light-theme link (clay-600 measured 4.23:1 and failed AA); task checkboxes being non-interactive; raw HTML rendering as text with no override.
- **Security posture is not negotiable downward.** No raw HTML execution, allow-listed URL schemes only, and the WebViews must stay unable to reach anything outside the APK.
