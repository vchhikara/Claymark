# Claymark Web Extension — Ledger

Chronological record of findings, decisions, deviations and bugs.
Types: FIND (discovered fact) · DEC (decision) · DEV (deviation from spec/desktop) · BUG (defect found/fixed) · TEST (verification evidence)

| ID | Type | Entry |
|---|---|---|
| X-001 | FIND | `dist/claymark.js` and `.cjs` only re-export from `./index-CJajjwyU.js` / `./index-BqiVwJU2.cjs`, which are **not in the staging folder**. `index.d.ts` references `./pipeline`, `./components`, `./theme`, also absent. The built library cannot be consumed. |
| X-002 | DEC | Consequence of X-001: rebuild the rendering engine inside the extension from the same pinned open-source dependencies listed in `docs/package.json` (unified 11.0.4, remark-parse 11.0.0, remark-gfm 4.0.0, remark-math 6.0.0, remark-rehype 11.1.0, rehype-sanitize 6.0.0, rehype-katex 7.0.0, katex 0.16.47, shiki 1.6.0, mermaid 10.9.8, hast-util-to-jsx-runtime 2.3.0, React 18.3.1). Exports named in `claymark.js` used as the feature checklist. When the real `index-*.js` chunk is recovered, `src/engine/` can be swapped for it. |
| X-003 | FIND | README references `web-extension-checklist.md` (§0–§3) and `ledger.md` L-023; neither was included. "Trap 2" inferred from the README text: the `color-mix()` fallback bug. |
| X-004 | BUG | `claymark.css` `.pb-clay-raised/.pb-clay-pot`: `color-mix(... white var(--clay-fill-lighten))` resolves to `white 0.035` — a unitless number, invalid in `color-mix()`. Whole `background-image` is dropped at computed-value time; only the `background-color` fallback survives (that is the "fix" the README mentions). Extension fixes the gradient properly with `calc(var(--clay-fill-lighten) * 100%)`. |
| X-005 | BUG | `claymark.css` uses `hsl(var(--accent-brand))` in `.cm-toolbar-btn:hover` and `.claymark-theme-toggle:hover`, but `--accent-brand` is a hex colour (`var(--clay-700)`) → invalid, hover border never shows. Same for `.claymark-button:focus-visible` is fine (uses bare var). Fixed in extension CSS. |
| X-006 | FIND | Desktop edit-mode screenshots (08–11) show the source textarea with newlines collapsed onto one line (`# claymark  A Markdown… ## What i…`). Treated as a desktop defect, not reproduced — extension textarea preserves line breaks. |
| X-007 | FIND | Help page says "Use **Open file** from the drawer", but drawer screenshots show no Open file control. Extension adds Open file / New document to the drawer to match the help text. |
| X-008 | DEC | Scope for §0 fixed in PLAN.md: Chromium MV3 only; app runs in a full tab; entry points = toolbar icon, keyboard command, context menu on selected text. |
| X-009 | DEC | Deps installed with npm (pnpm not present in build env); versions pinned exactly to desktop `package.json`. `rehype-pretty-code`, `dompurify`, `radix-ui`, Tauri packages not used — see X-011/X-012. |
| X-010 | DEC | Raw HTML (FR-1.6) is converted to mdast text **before** mdast→hast, so it is escaped by construction rather than filtered. Block HTML becomes a paragraph of literal text. |
| X-011 | DEC | Sanitize schema = rehype-sanitize `defaultSchema` + `math-inline`/`math-display` classes on `code` + `data:` for `src` (narrowed to png/jpeg/gif/webp by url-policy). KaTeX, heading ids, and link `rel` are added *after* sanitize. |
| X-012 | DEC | Outline built from the rendered hast (includes setext headings) rather than `toc.ts` alone, which only sees ATX headings and would misalign ids for setext docs. `toc.ts` kept verbatim for editor line-jumps. |
| X-013 | TEST | `npm test`: 40/40 PASS — GFM, math, mermaid fence, fence meta, 7 raw-HTML XSS payloads inert, 7 hostile URL schemes stripped (incl. `java%09script:`, `data:image/svg+xml`), 9 partial/pathological inputs no-throw, determinism, outline. |
| X-014 | BUG | (test) First XSS assertion flagged escaped text `&#x3C;svg onload=…` as live; regex tightened to attributes inside real tags. Engine behaviour was correct. |
| X-015 | DEC | Code highlighting is done in the React `CodeBlock` via Shiki `codeToTokens` (dual theme, `defaultColor:false`) instead of `rehype-pretty-code`. Tokens carry `--shiki-light/--shiki-dark`, so the existing `claymark.css` theme rule colours them unchanged. Styles set through React (CSSOM), which CSP permits. |
| X-016 | DEC | Shiki's Oniguruma WASM is inlined (`shiki/wasm`), so no fetch. Needs CSP `'wasm-unsafe-eval'` — this permits WebAssembly compilation only, not JS `eval`; NFR-1.5's "no unsafe-eval" still holds. |
| X-017 | DEC / DEV | Remote (`http/https`) images are **not loaded**; a placeholder shows the URL. Reason: NFR-1.6 (zero runtime network) and remote images in untrusted LLM output are a tracking / data-exfiltration channel. `data:` png/jpeg/gif/webp images render and open in the lightbox. |
| X-018 | DEC | Mermaid SVG is displayed via `<img src="blob:">`: an SVG in an image context cannot run script, handlers or fetch. |
| X-019 | DEC | Files: File System Access API (open, save in place, save as) with fallbacks — `<input type=file>` to open, `<a download>` to save. Drag-and-drop uses `getAsFileSystemHandle()` when available so dropped files can be saved in place. |
| X-020 | DEC | Recent files + crash-recovery draft in IndexedDB (stores `FileSystemFileHandle` by structured clone, plus a ≤2 MB content snapshot used if the file moved or permission is refused). Prefs in `localStorage` (synchronous → no theme flash). Selection hand-off uses `chrome.storage.session` (memory-only, cleared on browser exit). |
| X-021 | BUG | E2E found strict CSP (`style-src 'self'`) violations. Initial hypothesis Mermaid (inline `<style>`/`style=""` while measuring). |
| X-022 | DEC | Mermaid moved into a **sandboxed extension page** (`sandbox/mermaid.html`, opaque origin, own CSP allowing inline styles, `connect-src 'none'`, no extension APIs). Parent talks to it by `postMessage` and checks `event.source`. Bundled as a classic IIFE by esbuild (sandboxed pages can't reliably load ES module chunks). App page keeps `style-src 'self'` with no `unsafe-inline`. |
| X-023 | BUG | Violations persisted with identical hashes after X-022 → source was not Mermaid. Traced to the lazily loaded KaTeX chunk. |
| X-024 | DEC | NFR-2 budget: main bundle measured 468 KB gz (over the 120 KB core budget). Fixed by (a) moving Shiki behind a dynamic import (`lang-registry.ts` keeps the alias table in core) → 198 KB; (b) KaTeX loaded only when the source contains `$`, TeX shown muted until it arrives → **110.9 KB gz**. |
| X-025 | BUG / FIX | Root cause of X-023: `rehype-katex` → `hast-util-from-html-isomorphic` browser build parses KaTeX HTML with `DOMParser`; every `style=""` triggers a CSP report (styles still worked, React re-applied them via CSSOM). Vite alias to the package's pure-JS (`hast-util-from-html`/parse5) entry — identical tree, zero CSP reports. |
| X-026 | BUG | Search bar grid scrambled: `.cm-search > * {position:relative}` overrode `.sr-only {position:absolute}`, so hidden labels took grid cells. Selector changed to `:not(.sr-only)`. |
| X-027 | BUG | Last code block touched following paragraph: `.claymark-code-figure {margin:0}` (desktop CSS) cascades after `.claymark-codeblock` margin. Restored with a higher-specificity rule in `engine-ext.css`. |
| X-028 | DEV | AMOLED defaults to **on** to match the desktop reference screenshots; theme defaults to **System** per FR-5.3. |
| X-029 | DEV | Additions beyond desktop: Outline in reader header (desktop: edit mode only); "New document" on welcome + drawer; prev/next match buttons and single Replace; "Clear recent"; side-by-side editor/preview at ≥1400 px; image lightbox (FR-5.1, unwired on desktop); line numbers/highlights from fence meta (FR-4.4). |
| X-030 | TEST | `npm test` 40/40. `tests/e2e.py` **32/32** in Chromium with the unpacked extension: SW registers; welcome/drawer/sample; Shiki + KaTeX + Mermaid render; token colours resolve in both themes; outline jump; reader + editor search; replace-all; toolbar bold; XSS typed into editor inert (4 vectors) + `javascript:` href stripped; remote image blocked; discard dialog reverts; text scale; theme switch + persistence; no horizontal scroll at 400 px; drag-drop open; recent list via IndexedDB; save-as download fallback clears dirty state; selection hand-off; **0 external network requests; 0 console errors/warnings**. |
| X-031 | FIND | Not verified automatically (headless can't drive native pickers/menus): OS file-picker open, save-in-place permission prompt, the right-click menu item itself (its storage→tab path *is* tested), clipboard Copy, `Alt+Shift+M`. Manual checklist in README. |
| X-032 | FIND | Deferred: Firefox build (needs `background.scripts`, no File System Access → fallbacks already exist); FR-3 live token streaming (non-goal for the app surface); FR-6.2/6.3 token/font overrides (also unimplemented on desktop). |

## Session 2 — popup surface + content-script reader mode (2026-09-18)

Follow-up requested by the user after loading the v1.0.0 build: keep the
full-tab surface, add a popup surface alongside it, and add the
content-script reader mode that v1.0.0 shipped without (see build report's
own §0 gap — full-tab-only, no content script).

| ID | Type | Note |
|---|---|---|
| X-033 | BUG (pre-existing) | `npm run build` failed outright before any of this session's changes: `scripts/postbuild.mjs` resolved paths with `new URL(...).pathname`, which stays percent-encoded for a path containing spaces (this repo's own `.../My Projects/...`). Fixed with `fileURLToPath` instead of `.pathname`. Blocked any build in this checkout, not something this session introduced. |
| X-034 | DEC | Popup implemented as a second Vite HTML entry (`popup.html`/`popup.tsx`) reusing the same `App` component with a `popup` prop, not a separate codebase — avoids duplicating the editor/viewer logic. `action.default_popup` now opens it on left-click; the full-tab surface is reached via the popup's "Open in tab ↗" button, the context-menu action, or the renamed `open-full-tab` command (`Alt+Shift+M`, was `_execute_action` — a manifest with both `default_popup` and a listened `action.onClicked` can't have the click open a tab, since the popup pre-empts the click event). |
| X-035 | DEC | Popup viewport fixed at 420×600 via `html[data-popup='true']` CSS (a popup window's size is fixed by the page's own layout, not resizable by the user). |
| X-036 | DEC | Content-script reader mode matches `*.md`/`*.markdown` URLs plus `raw.githubusercontent.com`/`gist.githubusercontent.com`, and only actually activates when `document.contentType` is `text/plain`/`text/markdown` *and* the page looks like a raw-file view (single top-level `<pre>`) — an HTML page that merely has `.md` in its URL is left untouched. |
| X-037 | DEC | Rendered output goes into `attachShadow({ mode: 'closed' })` (checklist §2 Trap 1: the host page is untrusted and must not be able to reach in via CSS/DOM/event bubbling, and our styles must not leak out). hast is serialized to a string via `hast-util-to-html` and set as the shadow tree's `innerHTML` — it has already passed the same `rehype-sanitize` schema the app/popup use, so this is not a raw/unsanitized `innerHTML` write. |
| X-038 | DEC | Reader-mode CSS ports `tokens.css`/`claymark.css`/`engine-ext.css`/`fonts.css` standalone (the app's own stylesheet is Vite-chunked/hashed for `app.html`/`popup.html` and unreachable from a content script) with `:root` rewritten to `:host` — inside a shadow tree, a plain `:root` selector still matches the *page's* document root, not the shadow host, so token variables need to live on `:host` to cascade into the shadow content. Generated by `postbuild.mjs`, not committed as a duplicate file. |
| X-039 | DEV | Reader mode has no syntax highlighting/KaTeX/Mermaid (Shiki/KaTeX/Mermaid stay out of the content-script bundle to keep it small and avoid a second copy of those engines) — code fences render as plain `<pre><code>`, `$…$` renders as literal text. Flagged as a known v1 scope limit, not a bug; closing it is a separate follow-up if reader mode's fidelity needs to match the app surface exactly. |
| X-040 | TEST | `npm run build`/`npm run typecheck` clean. `npm test` still 40/40 (engine unchanged). Playwright not installed in this checkout (no venv/browser bundle survived from the prior session) so `tests/e2e.py` could not be re-run; verified manually instead: popup renders at 420×600 with the "Open in tab ↗" bar and no console errors (static-served `dist/`, `chrome.*` calls absent/guarded); `app.html` unaffected (no popup bar, same welcome/sample flow); reader mode manually verified against a local `text/plain`-served `.md` file — heading/bold/list/code fence all render correctly inside the closed shadow root, and the View raw ↔ View rendered toggle round-trips correctly. |
| X-041 | GAP | `tests/e2e.py` needs a new case for the popup surface and reader mode before this can be called equivalently verified to the v1.0.0 build's 32/32 — flagged, not written this pass (no Playwright available in this checkout to author against). |

### Decisions carried over, unresolved
Firefox build (X-032) is still not started — this pass only addressed the
popup + reader-mode scope gaps the user asked for next, not the browser
target gap from the original locked `web-extension-checklist.md` §0.

## Session 3 — shadcn/ui component port + lucide icons (2026-09-18)

User asked to "make it look pretty" using shadcn components, then clarified:
hand-port the existing `scratch/shadcn-prototype/` components (main repo,
outside this staging folder) rather than pull in Tailwind/cva, and replace
every emoji/glyph icon with lucide-react icons.

| ID | Type | Note |
|---|---|---|
| X-042 | DEC | Ported Button/Dialog/Badge/Separator/Tooltip from `scratch/shadcn-prototype/` as `src/app/ui/pb/*.tsx` — real Radix primitives (`radix-ui` 1.6.7, pinned to match the main repo's prototype) kept for behavior (focus trap, ESC-close, ARIA, portals), styling hand-written in `src/styles/pb.css` against the extension's own `tokens.css` (no Tailwind, no cva). `PortedButton` is `forwardRef`-wrapped so it works as a Radix `asChild`/`Slot` target (`DialogTrigger`/`DialogClose`). |
| X-043 | DEC | `Dialog.tsx` rewritten to wrap `PortedDialog`/`PortedDialogContent` internally while keeping its exact external prop API (`title`, `onClose`, `children`, `actions`, `labelledBy`) — every `App.tsx` call site needed zero changes. Old hand-rolled autofocus contract (`[data-autofocus]`) preserved via `onOpenAutoFocus` + `e.preventDefault()` to override Radix's own default-focus behavior. |
| X-044 | DEV | Replaced every emoji/glyph icon (`☰`, `←`, `<b>B</b>`, `<i>I</i>`, `</>`, `•`, `🔗`, `↑`, `−`/`+`, `✕`) with `lucide-react` icons across `App.tsx`, `Drawer.tsx`, `SearchBar.tsx`: `Menu, ArrowLeft, ExternalLink, ListTree, Pencil, Bold, Italic, Code2, List, Link2, ArrowUp, Minus, Plus, FolderOpen, FilePlus, Settings, HelpCircle, Info, Lock, ArrowDown, X`. |
| X-045 | DEV | Dirty-state/autosave indicators changed from bare `<span>` to `PortedBadge`; Drawer got a `PortedSeparator` between the action buttons and the Recent list. |
| X-046 | GAP | `PortedTooltip`/`IconButtonTip` (`src/app/ui/pb/tooltip.tsx`) were ported but never wired into any icon-only button — those buttons still rely on `aria-label`/`title` only, no visual tooltip on hover. Left unwired since the user's ask was icon replacement, not new interaction affordances; flagged as a follow-up if wanted. |
| X-047 | REGRESSION | Bundle size grew from 110.75 KB gz (X-024 baseline) to **127.00 KB gz** (408.41 KB raw) after adding `radix-ui` + `lucide-react`, exceeding NFR-2's 120 KB core budget by ~7 KB. Not addressed this pass (e.g. via dynamic-importing Dialog-only code) — flagged, not fixed. |
| X-048 | TEST | `npm run typecheck`/`npm run build` clean after every edit round. `npm test` 40/40 engine tests unaffected throughout. Playwright still unavailable in this checkout; verified manually via Claude's browser pane against a locally served static `dist/` (`python3 -m http.server`): welcome screen, full-tab reader header at 800px and 1200px width (no overflow at either — an earlier screenshot that looked cut off was a transient capture, not a real layout bug), edit-mode toolbar, Drawer, Outline dialog (Radix-backed, correct overlay/focus/close), and the popup surface (fixed 420×600, "Open in tab" bar) all render correctly with the new components/icons. Content-script reader mode (`content/reader.ts`) was **not** touched by this port and was not re-verified this pass — it doesn't consume any of the changed files. |

### Decisions carried over, unresolved
Firefox build (X-032) and the `tests/e2e.py` popup/reader-mode cases (X-041)
are both still outstanding. X-047 (bundle-size regression) and X-046
(unwired tooltips) are new gaps from this pass, not yet resolved.
