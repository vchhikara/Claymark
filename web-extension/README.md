# Claymark — web extension

Markdown reader and editor for streamed, untrusted LLM output, packaged as a
Manifest V3 extension for Chromium browsers (Chrome, Edge, Brave, Arc; 120+).

Three surfaces, as of the 2026-09-18 "Session 2" pass:
- **Popup** — click the toolbar icon for a quick 420×600 viewer/editor.
- **Full tab** — "Open in tab ↗" in the popup, the right-click context menu,
  or **Alt+Shift+M**, for the full-size experience.
- **Content-script reader mode** — visiting a raw `.md` URL (or
  `raw.githubusercontent.com`/`gist.githubusercontent.com`) auto-renders it
  in place, no click needed. Only activates on an actual raw-file view
  (`text/plain`/`text/markdown`), never on an HTML page that merely has
  `.md` in its URL. Has a **View raw** toggle; no syntax highlighting/KaTeX/
  Mermaid yet in this mode (`docs/LEDGER.md` X-039).

## Install (unpacked)

1. Unzip, then open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode**.
3. **Load unpacked** → select the `claymark-extension/` folder (the one containing `manifest.json`).
4. Pin Claymark and click its icon for the popup, or press **Alt+Shift+M** for the full tab.

## Use

- **Open file**, drag a `.md` onto the tab, or pick from **Recent** in the drawer (☰).
- Select text on any page → right-click → **Open selection in Claymark**.
- Visit a raw `.md` URL directly — reader mode activates automatically.
- `Ctrl+E` edit · `Ctrl+S` save · `Ctrl+Shift+S` save as · `Ctrl+F` search · `Ctrl+O` open
  (`Cmd` on macOS) — full-tab/popup surfaces only.

## Security model

| Layer | What it does |
|---|---|
| Parse | Raw HTML becomes literal text before HTML conversion (FR-1.6) |
| Sanitize | rehype-sanitize allow-list + reused `url-policy.ts` (NFR-1.1, 1.3) |
| Render | hast → React, no `dangerouslySetInnerHTML` (FR-2.1) |
| Diagrams | Mermaid runs in a sandboxed page; output shown as `<img>` |
| Images | Remote images not loaded (no tracking pixels / exfiltration) |
| CSP | `script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'none'` — no `unsafe-inline`, no `unsafe-eval`, network blocked by the browser |

## Build from source

```bash
cd source
npm install
npm run build        # → dist/  (vite + postbuild checks + sandbox bundle)
npm test             # engine: 40 checks
npm run test:e2e     # loads dist/ in Chromium: 32 checks (needs Python Playwright)
npm run typecheck
```

## Manual checks (native UI headless tests can't drive)

- [ ] Open file via the OS picker; edit; `Ctrl+S` asks for write permission once, then saves in place
- [ ] Autosave: with it on, edits to a disk file save ~1 s after typing stops
- [ ] Right-click a selection on a normal web page → Claymark tab opens with it, line breaks kept
- [ ] Copy button on a code block puts the exact source on the clipboard
- [ ] Close the tab mid-edit, reopen → "Restore unsaved draft?"

## Package layout

```
claymark-extension/   ← load this folder (built output)
source/               ← full source, tests, scripts (no node_modules)
docs/                 ← PLAN.md, LEDGER.md, TODO.md, SPEC.md
screenshots/          ← captured by the e2e run
```

See `docs/LEDGER.md` for every decision, deviation and bug (X-001 … X-041).

## Known gaps (this pass)

- No `tests/e2e.py` coverage yet for the popup surface or reader mode —
  Playwright isn't installed in this checkout, so this pass verified both
  manually instead (`docs/LEDGER.md` X-040/X-041) rather than skipping
  verification.
- Firefox build still not started (`docs/LEDGER.md` X-032, unchanged).
