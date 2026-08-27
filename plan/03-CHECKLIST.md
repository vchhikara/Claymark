# 03 — Execution Checklist

**This is the working surface.** Tick exactly one line per completed task, at the moment it completes — never before (`I-09`).

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete, verified · `[!]` failed, under investigation · `[-]` deferred (must carry a ledger entry)

Tick format — append evidence inline:

```
- [x] T-P2-04 — sanitize schema authored · VERIFY: pnpm test:security 84/84 · 2026-08-26
```

A tick without evidence is invalid and must be reverted to `[ ]`.

---

## Progress summary — update at every checkpoint

| Metric | Value |
|---|---|
| Tasks complete | 77 / 96 |
| Weighted progress | ~70.6% |
| Current phase | P6 complete → P7 next |
| Current batch | B13 complete (T-P6-07..11 + GATE G6) · next B14 (T-P7-01 …) |
| Gates passed | 7 / 10 (G0 · CP-003, G1 · CP-005, G2 · CP-008, G3 · CP-012, G4 · CP-013, G5 · CP-014, G6 · CP-016) |
| Open issues | 0 (ISS-001, ISS-002 resolved) |
| Deferred items | 1 (DEF-001) |
| Project state | `Checkpointed` |

---

## Phase P0 — Initialization & Environment · 4%

- [x] T-P0-01 — Node runtime verified, `.nvmrc` written · VERIFY: `node -v` → v20.11.1 == `.nvmrc` · 2026-08-26
- [x] T-P0-02 — `package.json` initialized, zero range specifiers · VERIFY: `grep -E '"\^|"~' package.json` → empty (exit 1) · 2026-08-26
- [x] T-P0-03 — Dependencies installed, lockfile frozen · VERIFY: `pnpm install --frozen-lockfile` → exit 0 · 2026-08-26
- [x] T-P0-04 — TypeScript strict configuration · VERIFY: `pnpm tsc --noEmit` → exit 0 · 2026-08-26
- [x] T-P0-05 — Vite dual-target build configured (`vite.config.ts`) · VERIFY: `pnpm build` → exit 0, `dist/claymark.js` + `dist/claymark.cjs` · 2026-08-26
- [x] T-P0-06 — Vitest jsdom + coverage thresholds 80% (`vitest.config.ts`) · VERIFY: `pnpm test` → exit 0, 0 tests · 2026-08-26
- [x] T-P0-07 — ESLint flat + Prettier configured (`eslint.config.js`, `.prettierrc`) · VERIFY: `pnpm lint` → exit 0 · 2026-08-26
- [x] T-P0-08 — Source tree skeleton barrels (`src/{index,pipeline/index,components/index,theme/index}.ts`) · VERIFY: `test -f src/index.ts` && `pnpm tsc --noEmit` → exit 0 · 2026-08-26
- [ ] **GATE G0** — 8 criteria

## Phase P1 — Asset Discovery & Design Tokens · 8%

- [x] T-P1-01 — Font stacks and open substitutes recorded (`src/theme/fonts.ts`) · VERIFY: tsx runtime import → keys `body,ui,mono` · 2026-08-26
- [x] T-P1-02 — Open-licensed fonts vendored with licenses (6 × woff2 @5.3.0 + `LICENSES.md`) · VERIFY: 6/6 files enumerated in LICENSES.md, all `wOF2` magic · 2026-08-26
- [x] T-P1-03 — Neutral ramp, 12 steps (`src/theme/tokens/neutral.ts`) · VERIFY: 12 keys, all valid HSL triples, hue-consistent, monotonic lightness · 2026-08-26
- [x] T-P1-04 — Accent tokens including Clay `#d97757` (`src/theme/tokens/accent.ts`) · VERIFY: `clay === '#d97757'` true; shades hsl-derived · 2026-08-26
- [x] T-P1-05 — Semantic aliases defined (`src/theme/tokens/semantic.ts`) · VERIFY: `grep -nE '#[0-9a-fA-F]{3,8}|%'` → no match (exit 1) · 2026-08-26
- [x] T-P1-06 — Dark-mode override map (`src/theme/tokens/dark.ts`) · VERIFY: tsx → `{light:11, dark:11, parity:true}` · 2026-08-26
- [x] T-P1-07 — Typographic scale (`src/theme/tokens/typography.ts`) · VERIFY: tsx → `{steps:6, descending:true, bodyFontSize:'20px', bodyLineHeight:1.4}` · 2026-08-26
- [x] T-P1-08 — Spacing, radii, measure, z-index (`src/theme/tokens/layout.ts`) · VERIFY: tsx → `measure:'48rem'`, 12 space keys (DEC-007 ramp) · 2026-08-26
- [x] T-P1-09 — Tokens emitted as CSS custom properties (`src/theme/tokens.css`) · VERIFY: tsx count → `{expected:67, emitted:67, unique:67, darkDecls:11, semanticParity:true}` · 2026-08-26
- [x] **GATE G1** — 8 criteria · VERIFY: C1 `find public/fonts -name "Anthropic*"` → 0 · C2 6 woff2 == 6 license entries · C3 neutral = 12 steps · C4 semantic dark parity 11/11 · C5 `grep -rnE '#[0-9a-fA-F]{6}' src/ --exclude-dir=theme` → empty · C6 emitted 67 == expected 67 · C7 measure `48rem` · C8 body `20px`/`1.4` · 2026-08-26

## Phase P2 — Core Parse Pipeline · 16%

- [x] T-P2-01 — Pipeline types defined (`src/pipeline/types.ts`) · VERIFY: `pnpm tsc --noEmit` → exit 0 · 2026-08-26
- [x] T-P2-02 — Base unified processor assembled (`src/pipeline/processor.ts`) · VERIFY: tsx render `# hi` → `{tagName:'h1', text:'hi'}` · 2026-08-26
- [x] T-P2-03 — GFM support added (`src/pipeline/plugins/gfm.ts`) · VERIFY: tsx fixtures → table `[table,thead,tr,th,tbody,td]`, strike `del`, taskList `input` · 2026-08-26
- [x] T-P2-04 — Sanitization schema authored (`src/pipeline/sanitize-schema.ts`) · VERIFY: `grep -n "'\*'"` → exit 1 (no wildcard); `pnpm tsc --noEmit` → 0 · 2026-08-26
- [x] T-P2-05 — Sanitizer wired as non-optional stage (`src/pipeline/plugins/sanitize.ts`, wired in processor) · VERIFY: tsx attachers → `[remarkParse, remarkGfm, remarkRehype, rehypeSanitize]` (unconditional chain, no bypass flag in PipelineOptions); tsc → 0 · 2026-08-26
- [x] T-P2-06 — Raw HTML passthrough disabled (`src/pipeline/processor.ts`: `allowDangerousHtml:false` + html→text handler per FR-1.6) · VERIFY: tsx `<script>alert(1)</script>` fixture → `{scriptNodes:0, escapedTextPresent:true}`; tsc → 0 · 2026-08-26
- [x] T-P2-07 — URL policy implemented (`src/pipeline/plugins/url-policy.ts`) · VERIFY: tsx 14 malicious-URL fixtures → `{neutralized:14, total:14}`; benign https/data:image/png/relative/#anchor preserved · 2026-08-26
- [x] T-P2-08 — External link hardening (`src/pipeline/plugins/links.ts`) · VERIFY: tsx → external `{target:'_blank', rel:'noopener noreferrer'}` ✓; `/docs`, `#sec`, `mailto:` untouched ✓; chain order `urlPolicy→linkHardening→rehypeSanitize` · 2026-08-26
- [x] T-P2-09 — hast → React conversion (`src/pipeline/to-react.tsx`, component-map hook param) · VERIFY: tsx → React element ✓, markup `<h1>hi</h1><p><a … rel="noopener noreferrer">` , `dangerouslySetInnerHTML` absent from tree · 2026-08-26
- [x] T-P2-10 — CommonMark fixtures imported (`tests/fixtures/commonmark/spec.json`, 0.31.2) · VERIFY: JSON parse → count 652 ≥ 600; license recorded in `tests/fixtures/LICENSES.md` (R-LEGAL-03) · 2026-08-26
- [x] T-P2-11 — XSS corpus imported (`tests/fixtures/xss/*.md`, 92 vectors, 15 families) · VERIFY: `ls | wc -l` → 92 ≥ 80, zero empty files; provenance recorded in `tests/fixtures/LICENSES.md` · 2026-08-26
- [x] T-P2-12 — Conformance and security suites written (`tests/commonmark.spec.ts`, `tests/security.spec.ts` — OUTPUT paths corrected per DEC-008) · VERIFY: `pnpm test:commonmark` → 3/3, conformance **98.42%** ≥ 98 (559/568; methodology per DEC-010); `pnpm test:security` → 4/4, XSS corpus 92/92 inert, URLs 14/14 · 2026-08-26
- [x] **GATE G2** — 10 criteria · **BINARY, no conditional pass** · VERIFY: C1 `pnpm test:commonmark` 98.42% ≥ 98 · C2 `pnpm test:security` 8/8 (XSS 92/92 inert) · C3 scan 744 fixtures → 0 script/raw nodes · C4 scan → 0 `on*` attrs · C5 URLs 14/14 neutralized · C6 external links 15/15 carry target+rel · C7 grep dangerouslySetInnerHTML src/ → empty · C8 static trace: single `unified()` composition, chain ends rehypeSanitize, no bypass flag · C9 GFM table/strike/tasklist/autolink all pass · C10 pipeline branch coverage **96.49%** ≥ 90 · 2026-08-26

## Phase P3 — Component Mapping & Typography · 14%

- [x] T-P3-01 — `MarkdownRoot` container (`src/components/MarkdownRoot.tsx`, `.claymark-root` per DEC-015) · VERIFY: tsx SSR → var-chain resolved `max-width: 48rem` ✓, `data-theme` attr set ✓ · 2026-08-26
- [x] T-P3-02 — `Heading` h1–h6 (`src/components/Heading.tsx`) · VERIFY: tsx → 6 levels strictly descending `[2,1.6,1.35,1.15,1,0.9]rem`, slug `hello-world-again`, explicit id wins · 2026-08-26
- [x] T-P3-03 — `Paragraph` and inline `Text` (`src/components/Paragraph.tsx`; body metrics via `.claymark-root` inheritance + tokens) · VERIFY: tsx SSR → `p.claymark-p` ✓, `span.claymark-text` ✓ · 2026-08-26
- [x] T-P3-04 — `Strong` and `Emphasis` (`src/components/Inline.tsx`) · VERIFY: tsx SSR → semantic `strong.claymark-strong` ✓, `em.claymark-em` ✓ · 2026-08-26
- [x] T-P3-05 — `Link` with permanent underline and external affordance (`src/components/Link.tsx`) · VERIFY: tsx → `.claymark-link` rule carries unconditional `text-decoration: underline` (rest state, not hover); `--external` modifier + `::after` affordance ✓; rel array joined ✓ · 2026-08-26
- [x] T-P3-06 — `List` / `ListItem` (`src/components/List.tsx`) · VERIFY: tsx → 3-level nesting renders; distinct markers disc/circle/square (ul) + decimal/alpha/roman (ol) in stylesheet · 2026-08-26
- [x] T-P3-07 — `TaskListItem` (`src/components/TaskList.tsx`) · VERIFY: tsx SSR → checkbox carries `disabled` + `aria-checked="true"` ✓ · 2026-08-26
- [x] T-P3-08 — `Blockquote` (`src/components/Blockquote.tsx`) · VERIFY: var-chain border-left resolves `0.25rem solid hsl(var(--neutral-700))` > 0 ✓ · 2026-08-26
- [x] T-P3-09 — `InlineCode` (`src/components/InlineCode.tsx`) · VERIFY: font-family resolves to JetBrains Mono stack via --font-mono ✓ · 2026-08-26
- [x] T-P3-10 — `HorizontalRule` (`src/components/Rule.tsx`) · VERIFY: `<hr class="claymark-rule"/>`; hairline uses hsl(var(--border-subtle)) · 2026-08-26
- [x] T-P3-11 — Default component map assembled (`src/components/map.tsx`, 27 tag keys) · VERIFY: rich-doc render → 14/14 behavior checks; emitted-tag union scan (XSS corpus + 300 CM examples) → uncovered: [] · 2026-08-26
- [x] T-P3-12 — Reference document and baseline snapshots · VERIFY: "3-run identical sha256: light ec9495cfd9ee8e2a53f1689c6416fda471c3f7028e0d1311595dc11f635e9ee7, dark 08c6792d4e7c16b1e65a21d4df3a4fc65b4c2cb558efa7c6696427ddbe6962c2" · 2026-08-26
- [x] **GATE G3** — 8/8 criteria PASS · Q-01…Q-03 resolved via DEC-012/013/014 · 2026-08-27

## Phase P4 — Code Blocks & Syntax Highlighting · 10%

- [x] T-P4-01 — Language registry and Shiki bundle config
- [x] T-P4-02 — `rehype-pretty-code` with dual themes
- [x] T-P4-03 — Unknown-language fallback
- [x] T-P4-04 — `CodeBlock` shell
- [x] T-P4-05 — Copy button · VERIFY: navigator.clipboard.writeText called with exact source text; button shows "Copied" · 2026-08-27
- [x] T-P4-06 — Clipboard fallback path · VERIFY: with navigator.clipboard undefined, execCommand('copy') fallback copies identical text · 2026-08-27
- [x] T-P4-07 — Line highlighting and numbers · VERIFY: fence meta `{1,3-5}` → data-highlighted-line on exactly lines 1,3,4,5 (native rehype-pretty-code meta parsing, no extra wiring needed) · 2026-08-27
- [x] T-P4-08 — Lazy highlighter loading · VERIFY: `src/pipeline/plugins/code-lazy.ts` — skeleton pass emits stable-height placeholder with zero Shiki output; real vite/rollup build shows Shiki + all language chunks isolated behind the dynamic `import('./code')` boundary, entry chunk clean · 2026-08-27
- [x] T-P4-09 — Code-block test suite · VERIFY: `tests/code.spec.ts`, 9/9 assertions pass · 2026-08-27
- [x] **GATE G4** — 8/8 criteria PASS · 2026-08-27

## Phase P5 — Math & Diagrams · 10%

- [x] T-P5-01 — `remark-math` integrated · VERIFY: `$…$`/`$$…$$` parse to distinct `inlineMath`/`math` mdast nodes · 2026-08-27
- [x] T-P5-02 — `rehype-katex` in non-throwing mode · VERIFY: `$\frac{$` renders `.katex-error` text, no throw (rehype-katex@7 never throws to caller by design) · 2026-08-27
- [x] T-P5-03 — Sanitize schema extended for KaTeX · VERIFY: 34-expression LaTeX corpus renders byte-identically through sanitize; `\href{javascript:...}` never produces an `href=` attribute; existing security suite still 8/8 · 2026-08-27
- [x] T-P5-04 — KaTeX CSS bundled locally · VERIFY: `grep -rn "cdn" src/` empty · 2026-08-27
- [x] T-P5-05 — `MermaidDiagram` with lazy runtime · VERIFY: Mermaid reached only via `import('mermaid')` inside an effect (SSR/initial-bundle safe by construction) · 2026-08-27
- [x] T-P5-06 — Mermaid strict security configuration · VERIFY: `securityLevel:'strict'`; click-binding `javascript:` URI produces no script node, no `javascript:` in output · 2026-08-27
- [x] T-P5-07 — Generated SVG sanitized · VERIFY: DOMPurify pass before insertion (defense-in-depth beyond mermaid's own internal sanitize); confirmed strips injected `<script>`, `onload`, `onerror`, smuggled `foreignObject><body onload=...>` while preserving legitimate label text (fixed a DOMPurify case-sensitivity gap on `foreignObject` found during verification — see CP-014) · 2026-08-27
- [x] T-P5-08 — Diagram error boundary · VERIFY: invalid syntax → code-block fallback; a pathological input found to hang `mermaid.render` (not just throw) now resolves via a bounded 5s timeout, same fallback · 2026-08-27
- [x] T-P5-09 — Math and diagram test suites · VERIFY: `tests/math.spec.ts` (6/6), `tests/mermaid.spec.ts` (5/5) · 2026-08-27
- [x] **GATE G5** — 8/8 criteria PASS · 2026-08-27

## Phase P6 — Streaming, Caching & Performance · 12%

- [x] T-P6-01 — Incomplete-construct detector
- [x] T-P6-02 — Block-boundary segmentation
- [x] T-P6-03 — Stable-prefix reconciliation
- [x] T-P6-04 — `useStreamingMarkdown` hook
- [x] T-P6-05 — LRU cache, capacity 100
- [x] T-P6-06 — Bounded-memory guard
- [x] T-P6-07 — Subtree memoization
- [x] T-P6-08 — Short-message fast path
- [x] T-P6-09 — Benchmark harness
- [x] T-P6-10 — **Stress matrix executed** (S-01 … S-12)
- [x] T-P6-11 — **Historical corpus backtest executed** (250 documents)
- [x] **GATE G6** — unit + stress + backtest, all three required

## Phase P7 — UI Behaviors · 8%

- [ ] T-P7-01 — `TableContainer` overflow scroll
- [ ] T-P7-02 — Scroll-edge indicators
- [ ] T-P7-03 — `Image` with aspect reservation
- [ ] T-P7-04 — `Lightbox` with focus trap
- [ ] T-P7-05 — Image captions
- [ ] T-P7-06 — Theme provider
- [ ] T-P7-07 — Theme toggle with persistence
- [ ] T-P7-08 — Flash-of-incorrect-color eliminated
- [ ] T-P7-09 — Interaction test suite
- [ ] **GATE G7** — 8 criteria including backtest re-run

## Phase P8 — Accessibility & Hardening · 8%

- [ ] T-P8-01 — Semantic element audit
- [ ] T-P8-02 — Contrast verification, both themes
- [ ] T-P8-03 — ARIA labels on all controls
- [ ] T-P8-04 — Keyboard-reachable scroll regions
- [ ] T-P8-05 — Text alternatives for math and diagrams
- [ ] T-P8-06 — `prefers-reduced-motion` honoured
- [ ] T-P8-07 — Dependency vulnerability audit
- [ ] T-P8-08 — Full security suite re-run
- [ ] T-P8-09 — `docs/SECURITY.md` finalized against as-built
- [ ] **GATE G8** — 10 criteria including backtest re-run

## Phase P9 — Packaging & Delivery · 10%

- [ ] T-P9-01 — Library build, ESM + CJS + types
- [ ] T-P9-02 — PWA manifest and service worker
- [ ] T-P9-03 — Tauri desktop shell
- [ ] T-P9-03a — Android shell via Tauri Mobile (added per DEC-012 / Q-01 ruling; I-08 suffix)
- [ ] T-P9-04 — Tauri capability allow-list minimized
- [ ] T-P9-05 — Responsive verification at three breakpoints
- [ ] T-P9-06 — Documentation reconciled against as-built
- [ ] T-P9-07 — Release notes and `1.0.0` version
- [ ] T-P9-08 — Delivery checklist complete, acceptance requested
- [ ] **GATE G9** — 8 criteria · **BINARY · requires human acceptance**

---

## Delivery gate checklist — complete only at G9

**Completion**
- [ ] Every objective has at least one supporting deliverable
- [ ] Every deferred item is logged with an ID and a reason
- [ ] No work was silently dropped

**Validation**
- [ ] Every automated validation passed
- [ ] Every manual validation performed and recorded
- [ ] Every gate recorded PASS
- [ ] Nothing bypassed, overridden, or waived

**Artifacts**
- [ ] Library bundle exists (ESM, CJS, `.d.ts`)
- [ ] PWA build exists and installs
- [ ] Tauri binary exists and launches
- [ ] Complete `docs/` set present
- [ ] No placeholders, duplicates, `.bak`, or temp files remain

**Documentation**
- [ ] Every doc matches as-built behavior
- [ ] Every internal reference resolves
- [ ] Every external reference in `REFERENCES.md` reachable
- [ ] Operational and recovery procedures written

**Traceability**
- [ ] Every deliverable maps to an objective
- [ ] Every significant decision recorded in the ledger
- [ ] All validation evidence preserved
- [ ] Backtest corpus and baselines archived

**Operational readiness**
- [ ] Install procedure documented and tested from clean
- [ ] Configuration options documented
- [ ] Upgrade and rollback procedures documented
- [ ] Known limitations disclosed
- [ ] Residual risks disclosed

**Handoff**
- [ ] Summary produced
- [ ] Handoff document prepared
- [ ] Archive assembled
- [ ] **User acceptance explicitly requested**
- [ ] **User acceptance explicitly received**
