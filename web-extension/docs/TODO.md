# Claymark Web Extension — To-do

Status: v1.0.0 items complete (LEDGER X-030). Session 2 (2026-09-18) added the popup surface and content-script reader mode — see below.

Legend: [x] done · [~] in progress · [ ] open · [-] deferred

## P0 Intake
- [x] List & extract staging zip and screenshots
- [x] Read SPEC.md, README, package.json, url-policy.ts, toc.ts, theme CSS
- [x] Review all 13 desktop screenshots
- [x] Record gaps in ledger

## P1 Scaffold
- [x] package.json with versions pinned to desktop `package.json`
- [x] Vite config for multi-entry MV3 build
- [x] manifest.json + icons

## P2 Engine
- [x] Pipeline: remark-parse, gfm, math, raw-HTML-as-text, remark-rehype
- [x] rehype-sanitize schema + url-policy (reused verbatim)
- [x] KaTeX after sanitize
- [x] Heading ids + outline derivation
- [x] hast → React via hast-util-to-jsx-runtime

## P3 Components
- [x] CodeBlock: Shiki dual theme, Copy (byte-identical), language label
- [x] Inline code pill vs reference heuristic
- [x] Table scroll container + edge indicators
- [x] Image figure/figcaption + lightbox (FR-5.1 — desktop gap)
- [x] Task list checkboxes
- [x] Mermaid (lazy, strict, image-isolated)
- [x] Error boundary per block (NFR-5)

## P4 Theme
- [x] Port tokens.css / claymark.css, fix invalid `hsl(hex)` and `color-mix` bugs
- [x] @font-face for bundled OFL fonts
- [x] Theme: System / Light / Dark, AMOLED, text scale

## P5 App shell
- [x] Welcome screen
- [x] Drawer (Recent pot, icon row, version)
- [x] Reader header + Edit button
- [x] Edit mode: toolbar B/I/code/list/link, textarea, live preview
- [x] Outline dialog
- [x] Search bar (+ Replace in edit mode)
- [x] Discard-changes dialog
- [x] Settings / Help / About / Privacy pages
- [x] Scroll-to-top, keyboard shortcuts

## P6 Files & storage
- [x] Open via File System Access API, fallback `<input type=file>`
- [x] Drag-and-drop `.md`
- [x] Save / Save as / download fallback
- [x] Autosave
- [x] Recent files in IndexedDB
- [x] Crash-recovery draft

## P7 Extension glue
- [x] Service worker: action → open/focus tab
- [x] Context menu "Open selection in Claymark"
- [x] Keyboard command
- [x] CSP in manifest

## P8 Verify
- [x] Load unpacked in headless Chromium, zero console/CSP errors
- [x] XSS corpus renders inert
- [x] Zero network requests
- [x] Screenshots of every screen vs desktop

## P9 Package
- [x] Zip build + source + docs

## Deferred (post-v1)
- [-] Firefox build (manifest variant + testing)
- [-] Automated coverage for native pickers / context menu click / clipboard (manual checklist in README)
- [-] FR-6.2 / FR-6.3 token and font overrides (unimplemented on desktop too)
- [-] Chrome Web Store listing assets (screenshots, promo tiles)

## Session 2 — popup + reader mode (2026-09-18)
- [x] Fixed pre-existing `postbuild.mjs` path bug blocking any build in this checkout (X-033)
- [x] `popup.html`/`popup.tsx`: second entry reusing `App`, fixed 420×600, "Open in tab ↗" button
- [x] `manifest.json`: `action.default_popup`, renamed `_execute_action` → `open-full-tab` command
- [x] Content-script reader mode: `content/reader.ts`, matches `*.md`/raw GitHub/Gist hosts, activates only on `text/plain`/`text/markdown` raw-file views, closed-shadow-DOM rendering, View raw ↔ View rendered toggle
- [x] `postbuild.mjs`: bundles the content script, generates standalone `content/reader.css` (`:root` → `:host`)
- [x] `npm run build`/`typecheck`/`test` (engine, 40/40) all pass
- [x] Manual verification: popup, full tab, reader mode (Playwright unavailable this pass — see X-040/X-041)
- [ ] Write `tests/e2e.py` cases for the popup surface and reader mode (X-041 — blocked on Playwright not being installed in this checkout)
- [ ] Reader mode has no syntax highlighting/KaTeX/Mermaid (X-039) — flagged scope limit, not attempted

## Session 3 — shadcn/ui port + lucide icons (2026-09-18)
- [x] Ported Button/Dialog/Badge/Separator/Tooltip from `scratch/shadcn-prototype/` as `src/app/ui/pb/*.tsx` (real Radix primitives, hand-written CSS, no Tailwind/cva)
- [x] `Dialog.tsx` rewritten on top of Radix `Dialog` internals, same external prop API, zero call-site changes
- [x] Replaced every emoji/glyph icon with `lucide-react` icons across App.tsx, Drawer.tsx, SearchBar.tsx (X-044)
- [x] `npm run typecheck`/`npm run build`/`npm test` (40/40) all pass
- [x] Manual verification via browser pane: welcome, reader header (800px + 1200px, no overflow), edit toolbar, Drawer, Outline dialog, popup surface all confirmed working with new components/icons
- [x] Refreshed `claymark-extension/` (loadable unpacked folder) with the new build
- [ ] Reader-mode content script not re-verified this pass (untouched by the port, but not re-tested)
- [ ] `PortedTooltip`/`IconButtonTip` ported but unwired into any button (X-046)
- [ ] Bundle size regressed to 127.00 KB gz, over the 120 KB NFR-2 budget by ~7 KB (X-047) — not fixed
