# Claymark Web Extension — Implementation Plan

Source of truth: `SPEC.md` (claymark v1.0.0) + desktop screenshots 01–13.
Target: Manifest V3 extension for Chromium browsers (Chrome, Edge, Brave, Arc).

## 0. Scope (resolves staging README "§0 still open")

The extension is the desktop app re-hosted in a browser tab, plus two
browser-native entry points. It is a reader with an editor, as the desktop app
is (SPEC §6 flag: editing authorised for the app surface, not the engine).

| Surface | Behaviour |
|---|---|
| Toolbar icon / Alt+Shift+M | Opens (or focuses) the Claymark app tab |
| Right-click → "Open selection in Claymark" | Renders the selected page text as Markdown |
| App tab | Welcome · Drawer · Reader · Edit mode · Search/Replace · Outline · Settings · Help · About · Privacy |

Out of scope for v1: Firefox/Safari builds, fetching remote `.md` URLs
(would breach NFR-1.6), live LLM streaming (SPEC §6 non-goal).

## 1. Phases

| Phase | Goal | Exit criterion |
|---|---|---|
| P0 Intake | Audit staging assets, screenshots, spec | Ledger records every gap found |
| P1 Scaffold | Vite + React 18.3.1 + MV3 manifest, deps pinned to desktop package.json | `vite build` produces loadable dist/ |
| P2 Engine | Rebuild render pipeline (dist/ incomplete): remark → sanitize → url-policy → KaTeX → React; raw HTML shown as text | Security + GFM smoke tests pass |
| P3 Components | Headings, code block (Shiki dual theme + Copy), inline-code pill/ref, tables w/ edge shadows, figure + lightbox, task lists, Mermaid (image-isolated) | Sample renders like screenshot 07 |
| P4 Theme | Port tokens.css + claymark.css with bug fixes, bundled OFL fonts, light/dark/system, AMOLED, text scale | Visual match to screenshots |
| P5 App shell | Welcome, drawer, reader header, edit mode, toolbar, outline, search/replace, discard dialog, settings/help/about/privacy | All 13 screenshots reproduced |
| P6 Files & storage | Open (picker / input / drag-drop), Save, Save as, autosave, recent files (IndexedDB), crash-recovery draft | open→edit→save round-trip |
| P7 Extension glue | Service worker, action → tab, context menu, keyboard command, strict CSP | Loads unpacked, zero errors |
| P8 Verify | Headless Chromium with extension loaded: screenshots, XSS corpus, CSP errors, network requests = 0 | All checks PASS |
| P9 Package | Zip: unpacked build + source + docs | Download delivered |

## 2. Key architecture decisions (detail in LEDGER.md)

- Rendering: unified → hast → hast-util-to-jsx-runtime (no dangerouslySetInnerHTML, FR-2.1).
- Sanitize before trusted transforms (KaTeX, Shiki): their output isn't stripped, and user input never bypasses the allow-list.
- Shiki core + fine-grained 34-language registry, inlined WASM (needs 'wasm-unsafe-eval', not 'unsafe-eval').
- Mermaid lazy-loaded, securityLevel 'strict', displayed via `<img src="blob:">` so diagram SVG can never execute.
- CSP: `script-src 'self' 'wasm-unsafe-eval'; connect-src 'none'` → network blocked by the browser itself (NFR-1.6).
