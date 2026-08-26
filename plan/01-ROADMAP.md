# 01 — Phased Implementation Roadmap

**96 atomic tasks · 10 weighted phases · 16 batches of 6**

Task IDs are immutable (`I-08`). Weights sum to 100 and represent share of total build effort, used for progress reporting. A phase's gate must record PASS before the next phase begins.

| Phase | Name | Weight | Cumulative | Tasks | Gate |
|---|---|---|---|---|---|
| P0 | Initialization & Environment | 4% | 4% | 8 | G0 |
| P1 | Asset Discovery & Design Tokens | 8% | 12% | 9 | G1 |
| P2 | Core Parse Pipeline | 16% | 28% | 12 | G2 |
| P3 | Component Mapping & Typography | 14% | 42% | 12 | G3 |
| P4 | Code Blocks & Syntax Highlighting | 10% | 52% | 9 | G4 |
| P5 | Math & Diagrams | 10% | 62% | 9 | G5 |
| P6 | Streaming, Caching & Performance | 12% | 74% | 11 | G6 |
| P7 | UI Behaviors | 8% | 82% | 9 | G7 |
| P8 | Accessibility & Hardening | 8% | 90% | 9 | G8 |
| P9 | Packaging & Delivery | 10% | 100% | 8 | G9 |

**Column semantics.** `Outputs` = the complete and exclusive set of files the task may write (invariant `I-01`). `Deps` = task IDs that must be ticked first. `Verify` = the literal command; exit code 0 is PASS.

---

## Phase P0 — Initialization & Environment (4%)

**Objective:** A reproducible, pinned toolchain that builds and tests an empty app.
**Exit condition:** `pnpm build` and `pnpm test` both succeed on a scaffold containing zero product code.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P0-01 | Verify Node runtime matches the pin in `REFERENCES.md §R-DEP-01`; write `.nvmrc` | `.nvmrc` | — | `node -v` matches `.nvmrc` exactly |
| T-P0-02 | Initialize `package.json` with `"type":"module"`, exact-pinned deps only, no range specifiers | `package.json` | T-P0-01 | `grep -E '"\^\|"~' package.json` returns empty |
| T-P0-03 | Install dependencies and freeze the lockfile | `pnpm-lock.yaml` | T-P0-02 | `pnpm install --frozen-lockfile` exits 0 |
| T-P0-04 | Configure TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` all true | `tsconfig.json` | T-P0-03 | `pnpm tsc --noEmit` exits 0 |
| T-P0-05 | Configure Vite with library + app dual build targets | `vite.config.ts` | T-P0-04 | `pnpm build` exits 0 |
| T-P0-06 | Configure Vitest with jsdom environment and coverage thresholds at 80% | `vitest.config.ts` | T-P0-05 | `pnpm test` exits 0 with 0 tests |
| T-P0-07 | Configure ESLint + Prettier; add `lint` and `format:check` scripts | `eslint.config.js`, `.prettierrc` | T-P0-06 | `pnpm lint` exits 0 |
| T-P0-08 | Create the source tree skeleton with barrel files only | `src/index.ts`, `src/pipeline/index.ts`, `src/components/index.ts`, `src/theme/index.ts` | T-P0-07 | `test -f src/index.ts` and `pnpm tsc --noEmit` exits 0 |

> **GATE G0** — see `02-VERIFICATION-GATES.md §G0`. Do not proceed on FAIL.

---

## Phase P1 — Asset Discovery & Design Tokens (8%)

**Objective:** A complete, legally clean token layer: typography scale, color ramps, spacing, radii, light and dark modes.
**Exit condition:** Every visual value used anywhere in the product resolves to a CSS custom property defined in this phase.

> **Legal constraint (`R-LEGAL-01`).** Proprietary font binaries are **not** downloaded, committed, or redistributed. The build ships open-licensed fallbacks. A runtime hook allows an end user to point at fonts they are themselves licensed to use. Any task below that appears to require fetching a proprietary font is satisfied by recording *metrics* (family name, weights, cap height, x-height ratio) — never by acquiring the file.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P1-01 | Record the target font stack and metric-compatible open substitutes in the token source | `src/theme/fonts.ts` | T-P0-08 | File exports `FONT_STACKS` with `body`, `ui`, `mono` keys |
| T-P1-02 | Vendor open-licensed fallback fonts (WOFF2) plus their license files | `public/fonts/*.woff2`, `public/fonts/LICENSES.md` | T-P1-01 | Every `.woff2` has a corresponding license entry |
| T-P1-03 | Define the neutral ramp as 12 HSL steps, light mode | `src/theme/tokens/neutral.ts` | T-P1-01 | Exports exactly 12 keys, all valid HSL triples |
| T-P1-04 | Define accent tokens including the Clay primary `#d97757` | `src/theme/tokens/accent.ts` | T-P1-03 | Exports `clay` equal to `#d97757` |
| T-P1-05 | Define semantic aliases (`--surface`, `--text-primary`, `--border-subtle`, …) mapping onto the ramps | `src/theme/tokens/semantic.ts` | T-P1-04 | No raw hex or HSL literal appears in this file |
| T-P1-06 | Define the dark-mode override map | `src/theme/tokens/dark.ts` | T-P1-05 | Every semantic key in `semantic.ts` has a dark counterpart |
| T-P1-07 | Define the typographic scale: body 20px/1.4, six heading steps, mono 16px | `src/theme/tokens/typography.ts` | T-P1-01 | Exports 6 heading steps in strictly descending size |
| T-P1-08 | Define spacing, radii, measure (`48rem`), and z-index tokens | `src/theme/tokens/layout.ts` | T-P1-07 | Exports `measure` equal to `48rem` |
| T-P1-09 | Emit all tokens as CSS custom properties under `:root` and `[data-theme="dark"]` | `src/theme/tokens.css` | T-P1-08 | Generated CSS var count equals token export count |

> **GATE G1** — inventory complete, tokens exhaustive, zero proprietary binaries present.

---

## Phase P2 — Core Parse Pipeline (16%)

**Objective:** Untrusted Markdown in, sanitized hast out. This is the load-bearing phase; it carries the highest weight.
**Exit condition:** The pipeline passes the CommonMark specification suite at ≥98% and the full XSS corpus at 100%.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P2-01 | Define pipeline types: `PipelineOptions`, `PipelineResult`, `RenderMode` | `src/pipeline/types.ts` | T-P1-09 | `pnpm tsc --noEmit` exits 0 |
| T-P2-02 | Assemble the base unified processor: `remark-parse` → `remark-rehype` | `src/pipeline/processor.ts` | T-P2-01 | Unit test renders `# hi` to an `h1` hast node |
| T-P2-03 | Add `remark-gfm` for tables, strikethrough, task lists, autolinks | `src/pipeline/plugins/gfm.ts` | T-P2-02 | Table, `~~s~~`, and `- [x]` fixtures each render correctly |
| T-P2-04 | Author the sanitization schema: strict allow-list, no `style`, no `on*`, no `srcset` | `src/pipeline/sanitize-schema.ts` | T-P2-03 | Schema contains no `*` wildcard attribute entry |
| T-P2-05 | Wire `rehype-sanitize` as a **non-optional, non-final-position-dependent** stage | `src/pipeline/plugins/sanitize.ts` | T-P2-04 | No code path reaches output without traversing this stage |
| T-P2-06 | Disable raw HTML passthrough (`allowDangerousHtml: false`) and document why | `src/pipeline/processor.ts` | T-P2-05 | `<script>alert(1)</script>` fixture emits zero `script` nodes |
| T-P2-07 | Implement URL policy: block `javascript:`, `data:` (except `image/png\|jpeg\|gif\|webp`), and `vbscript:` | `src/pipeline/plugins/url-policy.ts` | T-P2-06 | All 14 malicious-URL fixtures are neutralized |
| T-P2-08 | Add external-link rewriting: `target="_blank"` + `rel="noopener noreferrer"` | `src/pipeline/plugins/links.ts` | T-P2-07 | External link fixture carries both attributes; internal link carries neither |
| T-P2-09 | Implement hast → React conversion via `hast-util-to-jsx-runtime` with a component map hook | `src/pipeline/to-react.tsx` | T-P2-08 | Renders a React element tree without `dangerouslySetInnerHTML` |
| T-P2-10 | Import the CommonMark spec suite as fixtures | `tests/fixtures/commonmark/*.json` | T-P2-09 | Fixture count ≥ 600 |
| T-P2-11 | Import the XSS attack corpus as fixtures | `tests/fixtures/xss/*.md` | T-P2-10 | Fixture count ≥ 80 |
| T-P2-12 | Write the pipeline conformance and security test suites | `tests/pipeline.spec.ts`, `tests/security.spec.ts` | T-P2-11 | CommonMark ≥98% pass; XSS 100% pass |

> **GATE G2** — the security gate. A single XSS fixture failure is an automatic FAIL with no conditional pass available.

---

## Phase P3 — Component Mapping & Typography (14%)

**Objective:** Every Markdown node type maps to a styled React component matching the visual spec.
**Exit condition:** Visual snapshot of the reference document is stable across three consecutive runs in both themes.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P3-01 | Build the `MarkdownRoot` container: measure clamp, padding, theme attribute | `src/components/MarkdownRoot.tsx` | T-P2-12 | Computed `max-width` equals `48rem` |
| T-P3-02 | Build `Heading` (h1–h6) with the serif scale and anchor slugs | `src/components/Heading.tsx` | T-P3-01 | Six levels render with strictly descending computed font-size |
| T-P3-03 | Build `Paragraph` and inline `Text` with body metrics | `src/components/Paragraph.tsx` | T-P3-02 | Computed `font-size:20px`, `line-height:28px` |
| T-P3-04 | Build `Strong` and `Emphasis` | `src/components/Inline.tsx` | T-P3-03 | Renders semantic `strong` / `em` elements |
| T-P3-05 | Build `Link` with permanent underline and external affordance | `src/components/Link.tsx` | T-P3-04 | `text-decoration` is `underline` at rest, not only on hover |
| T-P3-06 | Build `List` / `ListItem` for ordered, unordered, and nested cases | `src/components/List.tsx` | T-P3-05 | Three-level nesting renders with distinct markers |
| T-P3-07 | Build `TaskListItem` with a disabled, accessible checkbox | `src/components/TaskList.tsx` | T-P3-06 | Checkbox has `disabled` and `aria-checked` |
| T-P3-08 | Build `Blockquote` with the left rule and muted color | `src/components/Blockquote.tsx` | T-P3-07 | `border-left-width` > 0 |
| T-P3-09 | Build `InlineCode` with mono stack and subtle background | `src/components/InlineCode.tsx` | T-P3-08 | Computed font-family resolves to the mono stack |
| T-P3-10 | Build `HorizontalRule` | `src/components/Rule.tsx` | T-P3-09 | Renders `hr` with a subtle border token |
| T-P3-11 | Assemble the default component map and export it | `src/components/map.tsx` | T-P3-10 | Map covers every node type emitted in T-P2-12 output |
| T-P3-12 | Author the reference document and capture baseline visual snapshots (light + dark) | `tests/fixtures/reference.md`, `tests/__snapshots__/reference.*` | T-P3-11 | Three consecutive runs produce byte-identical snapshots |

> **GATE G3** — planning-and-mapping gate. All `Undecided` scope items (`Q-01`…`Q-03`) must be resolved by human decision before PASS.

---

## Phase P4 — Code Blocks & Syntax Highlighting (10%)

**Objective:** VS Code–grade highlighting with dual themes, a copy affordance, and a bounded language set.
**Exit condition:** Highlighting is deterministic and the highlighter is not in the initial bundle.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P4-01 | Pin the supported language set (see `REFERENCES.md §R-LANG`) and build the Shiki bundle config | `src/pipeline/plugins/shiki-config.ts` | T-P3-12 | Exported language list length equals the registry count |
| T-P4-02 | Integrate `rehype-pretty-code` with paired light/dark themes | `src/pipeline/plugins/code.ts` | T-P4-01 | Same input yields identical token output across 3 runs |
| T-P4-03 | Implement the unknown-language fallback to plain text (never throw) | `src/pipeline/plugins/code.ts` | T-P4-02 | Fence tagged `notalanguage` renders as unstyled `pre` |
| T-P4-04 | Build the `CodeBlock` shell: header bar, language label, scroll container | `src/components/CodeBlock.tsx` | T-P4-03 | Header displays the fence's language string |
| T-P4-05 | Implement the copy button using the Clipboard API with a success state | `src/components/CopyButton.tsx` | T-P4-04 | Click writes exact source text, excluding line numbers |
| T-P4-06 | Add the Clipboard API fallback path for insecure contexts | `src/components/CopyButton.tsx` | T-P4-05 | Copy succeeds when `navigator.clipboard` is undefined |
| T-P4-07 | Support line highlighting and line-number metadata on the fence | `src/pipeline/plugins/code.ts` | T-P4-06 | Fence meta `{1,3-5}` highlights exactly lines 1,3,4,5 |
| T-P4-08 | Lazy-load the highlighter via dynamic import with a stable-height skeleton | `src/pipeline/plugins/code-lazy.ts` | T-P4-07 | Initial bundle contains no Shiki chunk |
| T-P4-09 | Write the code-block test suite | `tests/code.spec.ts` | T-P4-08 | All assertions pass; no layout shift on hydration |

> **GATE G4** — highlighting deterministic, bundle boundary enforced.

---

## Phase P5 — Math & Diagrams (10%)

**Objective:** KaTeX math and Mermaid diagrams that fail closed, never crash the render, and never bloat first paint.
**Exit condition:** Malformed input in either subsystem degrades to visible source text, not a thrown error.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P5-01 | Add `remark-math` for `$…$` and `$$…$$` delimiters | `src/pipeline/plugins/math.ts` | T-P4-09 | Inline and display math parse to distinct node types |
| T-P5-02 | Add `rehype-katex` in `throwOnError: false` mode | `src/pipeline/plugins/math.ts` | T-P5-01 | Malformed `$\frac{$` renders error text, does not throw |
| T-P5-03 | Extend the sanitize schema to permit KaTeX's required class and MathML nodes — and nothing else | `src/pipeline/sanitize-schema.ts` | T-P5-02 | Math renders intact; XSS suite from T-P2-12 still 100% |
| T-P5-04 | Bundle KaTeX CSS locally; remove all CDN references | `src/theme/katex.css` | T-P5-03 | `grep -rn "cdn" src/` returns empty |
| T-P5-05 | Build the `MermaidDiagram` component with a lazy runtime import | `src/components/MermaidDiagram.tsx` | T-P5-04 | Mermaid absent from the initial chunk graph |
| T-P5-06 | Configure Mermaid with `securityLevel: 'strict'` and `htmlLabels: false` | `src/components/MermaidDiagram.tsx` | T-P5-05 | Diagram source containing a script tag produces no script node |
| T-P5-07 | Sanitize generated SVG before insertion | `src/components/MermaidDiagram.tsx` | T-P5-06 | SVG XSS fixture is neutralized |
| T-P5-08 | Implement the diagram error boundary: invalid syntax falls back to a plain code block | `src/components/MermaidDiagram.tsx` | T-P5-07 | Invalid diagram source renders as a code block, no crash |
| T-P5-09 | Write the math and diagram test suites | `tests/math.spec.ts`, `tests/mermaid.spec.ts` | T-P5-08 | All assertions pass |

> **GATE G5** — both subsystems fail closed; security suite has not regressed.

---

## Phase P6 — Streaming, Caching & Performance (12%)

**Objective:** Render partial Markdown arriving token-by-token without flicker, reflow, or unbounded memory.
**Exit condition:** All published performance budgets are met under the stress matrix.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P6-01 | Implement the incomplete-construct detector (unclosed fence, table, emphasis, link) | `src/pipeline/streaming/detect.ts` | T-P5-09 | All 24 partial-construct fixtures classified correctly |
| T-P6-02 | Implement block-boundary segmentation of the input buffer | `src/pipeline/streaming/segment.ts` | T-P6-01 | Segments never split inside a fenced block |
| T-P6-03 | Implement stable-prefix reconciliation: reparse only the mutated tail | `src/pipeline/streaming/reconcile.ts` | T-P6-02 | Appending one token reparses ≤1 block |
| T-P6-04 | Build the `useStreamingMarkdown` hook | `src/hooks/useStreamingMarkdown.ts` | T-P6-03 | Hook renders monotonically; no content flicker |
| T-P6-05 | Implement the LRU cache, capacity 100, keyed by content hash | `src/pipeline/cache.ts` | T-P6-04 | Entry 101 evicts entry 1; hit returns identical reference |
| T-P6-06 | Add a bounded-memory guard that trims the cache above a byte ceiling | `src/pipeline/cache.ts` | T-P6-05 | 10k-render soak stays under the ceiling |
| T-P6-07 | Memoize component subtrees by node identity | `src/pipeline/to-react.tsx` | T-P6-06 | Unchanged blocks do not re-render on tail append |
| T-P6-08 | Implement the short-message fast path (no Markdown syntax → single paragraph, no parse) | `src/pipeline/fast-path.ts` | T-P6-07 | Plain string bypasses the processor entirely |
| T-P6-09 | Build the benchmark harness with the budgets from `docs/SPEC.md §7` | `bench/index.ts` | T-P6-08 | Harness emits a machine-readable result file |
| T-P6-10 | Execute the stress matrix (see `02-VERIFICATION-GATES.md §Stress`) | `bench/results/stress.json` | T-P6-09 | All budgets met; zero crashes |
| T-P6-11 | Execute the historical corpus backtest (see `§Backtest`) | `bench/results/backtest.json` | T-P6-10 | Zero unexplained snapshot regressions |

> **GATE G6** — validation gate. Stress **and** backtest must both PASS; neither substitutes for the other.

---

## Phase P7 — UI Behaviors (8%)

**Objective:** The interaction layer — theming, lightbox, table affordances, keyboard control.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P7-01 | Build `TableContainer` with horizontal overflow scroll | `src/components/Table.tsx` | T-P6-11 | Wide table scrolls; page does not gain horizontal scroll |
| T-P7-02 | Add scroll-edge shadow indicators to the table container | `src/components/Table.tsx` | T-P7-01 | Indicator appears only when content overflows |
| T-P7-03 | Build the `Image` component: lazy loading, max-width clamp, aspect-ratio reservation | `src/components/Image.tsx` | T-P7-02 | Cumulative layout shift equals 0 on image load |
| T-P7-04 | Build the `Lightbox` overlay with `role="dialog"` and focus trap | `src/components/Lightbox.tsx` | T-P7-03 | Tab cycles within the dialog; Escape closes and restores focus |
| T-P7-05 | Render image captions from the Markdown title attribute | `src/components/Image.tsx` | T-P7-04 | `![alt](src "title")` renders a visible caption |
| T-P7-06 | Build the theme provider with `prefers-color-scheme` detection | `src/theme/ThemeProvider.tsx` | T-P7-05 | System theme change propagates without remount |
| T-P7-07 | Add the manual theme toggle with persisted preference | `src/components/ThemeToggle.tsx` | T-P7-06 | Preference survives reload; manual choice overrides system |
| T-P7-08 | Eliminate the theme flash-of-incorrect-color with a blocking init script | `index.html` | T-P7-07 | No light flash on dark-mode cold load |
| T-P7-09 | Write the interaction test suite | `tests/interaction.spec.ts` | T-P7-08 | All assertions pass |

> **GATE G7** — optimization/integrity gate. No regression in G2–G6 evidence.

---

## Phase P8 — Accessibility & Hardening (8%)

**Objective:** WCAG 2.2 AA conformance and a documented, tested threat posture.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P8-01 | Audit and correct semantic element usage across all components | `src/components/*` | T-P7-09 | axe-core reports zero violations on the reference document |
| T-P8-02 | Verify contrast ratios for every token pair in both themes | `tests/contrast.spec.ts` | T-P8-01 | All text pairs ≥ 4.5:1; large text ≥ 3:1 |
| T-P8-03 | Add ARIA labels to every interactive control | `src/components/*` | T-P8-02 | No control lacks an accessible name |
| T-P8-04 | Make scrollable regions keyboard-reachable (`tabindex="0"` on overflow containers) | `src/components/CodeBlock.tsx`, `src/components/Table.tsx` | T-P8-03 | Code and table regions are keyboard scrollable |
| T-P8-05 | Add screen-reader fallbacks for math and diagram content | `src/components/MermaidDiagram.tsx` | T-P8-04 | Each diagram exposes a text alternative |
| T-P8-06 | Honour `prefers-reduced-motion` in all transitions | `src/theme/motion.css` | T-P8-05 | Animations disabled when the query matches |
| T-P8-07 | Run the dependency vulnerability audit and resolve or document every finding | `SECURITY-AUDIT.md` | T-P8-06 | Zero unresolved high or critical advisories |
| T-P8-08 | Re-run the full security suite from T-P2-12 against the completed build | `bench/results/security-final.json` | T-P8-07 | 100% pass, no regression |
| T-P8-09 | Finalize `docs/SECURITY.md` against as-built behavior | `docs/SECURITY.md` | T-P8-08 | Every documented control has a corresponding passing test |

> **GATE G8** — delivery-readiness gate.

---

## Phase P9 — Packaging & Delivery (10%)

**Objective:** Four shippable artifacts and a complete handoff.

| ID | Action | Outputs | Deps | Verify |
|---|---|---|---|---|
| T-P9-01 | Configure the library build: ESM + CJS, type declarations, React as a peer dependency | `vite.config.ts`, `package.json` | T-P8-09 | Consumer project imports and type-checks cleanly |
| T-P9-02 | Configure the PWA: manifest, icon set, offline service worker | `public/manifest.json`, `src/sw.ts` | T-P9-01 | Lighthouse PWA category passes |
| T-P9-03 | Scaffold the Tauri desktop shell pointing at the built web assets | `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` | T-P9-02 | `cargo tauri build` produces a binary |
| T-P9-04 | Lock down the Tauri allow-list to the minimum required capability set | `src-tauri/capabilities/default.json` | T-P9-03 | No filesystem or shell capability is enabled |
| T-P9-05 | Verify mobile installability and responsive layout at 320px, 768px, 1024px | `tests/responsive.spec.ts` | T-P9-04 | No horizontal overflow at any breakpoint |
| T-P9-06 | Reconcile every file in `docs/` against as-built behavior | `docs/*` | T-P9-05 | Every documented example executes as written |
| T-P9-07 | Write the release notes and version the package at `1.0.0` | `docs/CHANGELOG.md`, `package.json` | T-P9-06 | Version consistent across all manifests |
| T-P9-08 | Complete the delivery checklist and request explicit human acceptance | `plan/03-CHECKLIST.md` | T-P9-07 | Every delivery-gate item ticked with evidence |

> **GATE G9** — completion gate. Requires every prior gate PASS **and** explicit human acceptance. This gate cannot be self-approved.

---

## Batch schedule

Sixteen batches of six. Batches never straddle a phase boundary or a gate.

| Batch | Tasks | Phase(s) |
|---|---|---|
| B01 | T-P0-01 → T-P0-06 | P0 |
| B02 | T-P0-07 → T-P0-08, **G0**, T-P1-01 → T-P1-04 | P0→P1 |
| B03 | T-P1-05 → T-P1-09, **G1** | P1 |
| B04 | T-P2-01 → T-P2-06 | P2 |
| B05 | T-P2-07 → T-P2-12 | P2 |
| B06 | **G2**, T-P3-01 → T-P3-05 | P2→P3 |
| B07 | T-P3-06 → T-P3-11 | P3 |
| B08 | T-P3-12, **G3**, T-P4-01 → T-P4-04 | P3→P4 |
| B09 | T-P4-05 → T-P4-09, **G4** | P4 |
| B10 | T-P5-01 → T-P5-06 | P5 |
| B11 | T-P5-07 → T-P5-09, **G5**, T-P6-01 → T-P6-02 | P5→P6 |
| B12 | T-P6-03 → T-P6-08 | P6 |
| B13 | T-P6-09 → T-P6-11, **G6**, T-P7-01 → T-P7-02 | P6→P7 |
| B14 | T-P7-03 → T-P7-09 minus one, **G7** | P7 |
| B15 | T-P8-01 → T-P8-06 | P8 |
| B16 | T-P8-07 → T-P8-09, **G8**, T-P9-01 → T-P9-08, **G9** | P8→P9 |

Batch 16 exceeds six tasks and **must** be split at execution time. Record the split in the ledger.
