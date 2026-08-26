# REFERENCES — Operations & Resource Index

**Authoritative registry of every external requirement, data input, and system resource.**

Nothing may enter the build that is not registered here. If a task requires something absent from this file, that is a `Dependency error` — stop and escalate (`plan/00 §7`). Do not add an entry unilaterally to unblock yourself; adding an entry is a decision and belongs in the ledger.

Reference ID scheme: `R-<CLASS>-<nn>`
Classes: `DEP` dependency · `ENV` environment · `DATA` data input · `SYS` system resource · `LEGAL` legal constraint · `LANG` language registry · `STD` standard · `NET` network

---

## R-LEGAL — Legal constraints · **read before P1**

| ID | Constraint | Consequence |
|---|---|---|
| **R-LEGAL-01** | **Anthropic's proprietary typefaces (Anthropic Serif, Anthropic Sans, Anthropic Mono) are not open-licensed.** They may not be downloaded, committed to this repository, bundled into a build artifact, or redistributed. | The default build ships open-licensed substitutes (`R-DEP-30`). A runtime `fontOverride` hook lets an end user point at fonts they are themselves licensed to use. Any plan step appearing to require acquiring these files is satisfied by recording **metrics only**: family name, weight set, cap height, x-height ratio, default tracking. |
| **R-LEGAL-02** | Visual imitation of a product's typographic system is generally permissible; reproduction of its trade dress, name, or logo is not. | `claymark` does not use Anthropic's name or marks in its UI, package name, icons, or marketing copy. The relationship is "in the idiom of," not "a copy of." |
| **R-LEGAL-03** | Every vendored font, theme, and fixture carries its own license. | `public/fonts/LICENSES.md` and `tests/fixtures/LICENSES.md` must enumerate every asset with its license and source. Verified at G1 and G9. |
| **R-LEGAL-04** | Shiki's bundled VS Code themes carry upstream licenses (typically MIT). | Record theme provenance in `docs/THEMING.md`. |

---

## R-ENV — Environment

| ID | Resource | Pinned value | Verify |
|---|---|---|---|
| R-ENV-01 | Node.js | 20.11.1 LTS | `node -v` |
| R-ENV-02 | Package manager | pnpm 9.1.0 | `pnpm -v` |
| R-ENV-03 | Rust toolchain (Tauri, P9 only) | stable 1.77+ | `rustc --version` |
| R-ENV-04 | Git | 2.40+ | `git --version` |
| R-ENV-05 | Platform | Linux x86_64 primary; macOS + Windows verified at P9 | — |
| R-ENV-06 | Browser targets | Chromium 120+, Firefox 121+, Safari 17+ | Browserslist |
| R-ENV-07 | Disk | ≥ 4 GB free (node_modules ≈ 900 MB, Rust target ≈ 2 GB) | `df -h` |

---

## R-DEP — Dependencies · pinned exactly, no range specifiers

> **ASM-001 applies to this entire section.** These versions were selected from model knowledge with a training cutoff and are **unverified**. At T-P0-03, resolve each against the registry, record the **actual** installed version, and log any deviation as an `Input error` before proceeding. Do not silently accept a different version (`I-03`).

**Runtime — core pipeline**

| ID | Package | Version | Role |
|---|---|---|---|
| R-DEP-01 | `unified` | 11.0.4 | Processor orchestration |
| R-DEP-02 | `remark-parse` | 11.0.0 | Markdown → mdast |
| R-DEP-03 | `remark-gfm` | 4.0.0 | Tables, strikethrough, task lists, autolinks |
| R-DEP-04 | `remark-rehype` | 11.1.0 | mdast → hast |
| R-DEP-05 | `remark-math` | 6.0.0 | `$…$` / `$$…$$` parsing |
| R-DEP-06 | `rehype-katex` | 7.0.0 | Math → HTML |
| R-DEP-07 | `rehype-sanitize` | 6.0.0 | Schema-based sanitization |
| R-DEP-08 | `rehype-pretty-code` | 0.13.2 | Shiki integration |
| R-DEP-09 | `shiki` | 1.6.0 | Syntax highlighting engine |
| R-DEP-10 | `hast-util-to-jsx-runtime` | 2.3.0 | hast → React elements |
| R-DEP-11 | `unist-util-visit` | 5.0.0 | AST traversal for custom plugins |
| R-DEP-12 | `katex` | 0.16.10 | Math typesetting + CSS |
| R-DEP-13 | `mermaid` | 10.9.1 | Diagram rendering (lazy) |
| R-DEP-14 | `dompurify` | 3.1.4 | SVG sanitization for Mermaid output |

**Runtime — application**

| ID | Package | Version | Role |
|---|---|---|---|
| R-DEP-20 | `react` | 18.3.1 | Peer dependency |
| R-DEP-21 | `react-dom` | 18.3.1 | Peer dependency |

**Assets**

| ID | Asset | License | Role |
|---|---|---|---|
| R-DEP-30 | Source Serif 4 | SIL OFL 1.1 | Body serif substitute |
| R-DEP-31 | Inter | SIL OFL 1.1 | UI sans substitute |
| R-DEP-32 | JetBrains Mono | SIL OFL 1.1 | Monospace substitute |

**Build & test**

| ID | Package | Version | Role |
|---|---|---|---|
| R-DEP-40 | `typescript` | 5.4.5 | Type system |
| R-DEP-41 | `vite` | 5.2.11 | Bundler, dual-target |
| R-DEP-42 | `vitest` | 1.6.0 | Unit test runner |
| R-DEP-43 | `@testing-library/react` | 15.0.7 | Component testing |
| R-DEP-44 | `playwright` | 1.44.0 | Visual snapshots, e2e |
| R-DEP-45 | `axe-core` | 4.9.1 | Accessibility audit |
| R-DEP-46 | `eslint` | 9.3.0 | Linting |
| R-DEP-47 | `prettier` | 3.2.5 | Formatting |
| R-DEP-48 | `vite-plugin-pwa` | 0.20.0 | Service worker, manifest |
| R-DEP-49 | `@tauri-apps/cli` | 2.0.0 | Desktop packaging |

**Prohibited dependencies** — do not install under any circumstance:

| Package | Reason |
|---|---|
| `marked`, `markdown-it` | Superseded by DEC-001. Two parsers means two security surfaces. |
| `react-syntax-highlighter` | Superseded by Shiki. Redundant weight. |
| `mathjax` | Superseded by KaTeX on size and performance grounds. |
| `remark-mermaidjs` | Requires Playwright at runtime; unacceptable for a client bundle. |
| `rehype-raw` | Re-enables raw HTML passthrough, contradicting DEC-005. |
| Anything unpinned | Violates `I-03`. |

---

## R-DATA — Data inputs

The system's raw ingestion surface. Every input class must have both a happy-path and an adversarial fixture.

| ID | Input | Source | Trust | Fixture location |
|---|---|---|---|---|
| R-DATA-01 | Static Markdown string | Caller | **Untrusted** | `tests/fixtures/basic/` |
| R-DATA-02 | Streamed Markdown chunks | Caller, incremental | **Untrusted** | `tests/fixtures/streaming/` |
| R-DATA-03 | CommonMark specification suite | `spec.commonmark.org` v0.31.2 | Trusted | `tests/fixtures/commonmark/` |
| R-DATA-04 | GFM extension fixtures | GitHub Flavored Markdown spec | Trusted | `tests/fixtures/gfm/` |
| R-DATA-05 | XSS attack corpus | OWASP XSS Filter Evasion Cheat Sheet + `cure53/DOMPurify` test suite | Trusted as fixtures | `tests/fixtures/xss/` |
| R-DATA-06 | Malicious URL set | Derived, 14 vectors | Trusted as fixtures | `tests/fixtures/urls/` |
| R-DATA-07 | Unicode adversarial set | RTL override, zero-width, combining, ZWJ emoji, homoglyphs | Trusted as fixtures | `tests/fixtures/unicode/` |
| R-DATA-08 | **Historical backtest corpus** | 250 real-world documents, composition fixed in `02-VERIFICATION-GATES.md §G6` | Trusted, **frozen** | `tests/corpus/` |
| R-DATA-09 | Baseline snapshots | Generated at the frozen baseline commit | Trusted, **immutable** | `tests/corpus/baselines/` |
| R-DATA-10 | Theme override object | End user | Semi-trusted — validated against the token schema | `tests/fixtures/themes/` |
| R-DATA-11 | Font override paths | End user | Semi-trusted — path-validated, no remote fetch | — |

**Corpus freeze rule.** Once `R-DATA-08` and `R-DATA-09` are captured, they are immutable for the life of the build. Modifying the corpus to make a backtest pass is the exact failure mode backtesting exists to prevent. If the corpus genuinely must change, that is a decision requiring a `DEC-` entry and human approval, and all baselines are regenerated together with a recorded rationale.

---

## R-LANG — Syntax highlighting language registry

Fixed at T-P4-01. The bundle includes exactly these grammars; anything else falls back to plain text (T-P4-03). Adding a language is a `DEC-` decision, not a task-level choice.

`bash` · `c` · `cpp` · `csharp` · `css` · `diff` · `dockerfile` · `go` · `graphql` · `html` · `ini` · `java` · `javascript` · `json` · `jsx` · `kotlin` · `lua` · `makefile` · `markdown` · `nginx` · `php` · `python` · `r` · `ruby` · `rust` · `scala` · `scss` · `sql` · `swift` · `toml` · `tsx` · `typescript` · `xml` · `yaml`

**Count: 34.** G4 criterion 2 verifies all 34 render.

---

## R-STD — Standards conformance

| ID | Standard | Version | Target | Gate |
|---|---|---|---|---|
| R-STD-01 | CommonMark | 0.31.2 | ≥ 98% suite pass | G2 |
| R-STD-02 | GitHub Flavored Markdown | Current spec | Tables, strikethrough, task lists, autolinks | G2 |
| R-STD-03 | WCAG | 2.2 Level AA | Full conformance | G8 |
| R-STD-04 | Semantic Versioning | 2.0.0 | All version strings | G9 |
| R-STD-05 | Keep a Changelog | 1.1.0 | `docs/CHANGELOG.md` format | G9 |
| R-STD-06 | Web Content Security Policy | Level 3 | No `unsafe-inline`, no `unsafe-eval` | G8 |

---

## R-SYS — System resources

| ID | Resource | Path | Purpose |
|---|---|---|---|
| R-SYS-01 | Source tree | `src/` | Product code |
| R-SYS-02 | Fixtures | `tests/fixtures/` | Unit and security inputs |
| R-SYS-03 | Backtest corpus | `tests/corpus/` | **Frozen.** Historical replay |
| R-SYS-04 | Baselines | `tests/corpus/baselines/` | **Immutable.** Expected output |
| R-SYS-05 | Benchmark results | `bench/results/` | Stress + backtest evidence |
| R-SYS-06 | Build output | `dist/` | Library + app artifacts |
| R-SYS-07 | Desktop shell | `src-tauri/` | Tauri project |
| R-SYS-08 | Archive | `.archive/` | Superseded files — **never `rm`**, always move here |
| R-SYS-09 | Plan artifacts | `plan/` | Mutated during the build |
| R-SYS-10 | Product docs | `docs/` | Reconciled at T-P9-06 |

---

## R-NET — Network access

The build requires network access only for dependency installation and fixture acquisition. **The product itself makes zero network requests at runtime** — verified at G5 criterion 4 (zero CDN references) and G8 criterion 8.

| ID | Endpoint class | When | Purpose |
|---|---|---|---|
| R-NET-01 | npm registry | P0, T-P0-03 | Dependency installation |
| R-NET-02 | CommonMark spec source | P2, T-P2-10 | Fixture acquisition |
| R-NET-03 | Font sources (open-licensed only) | P1, T-P1-02 | Asset vendoring |
| R-NET-04 | crates.io | P9, T-P9-03 | Tauri toolchain |

If the environment is network-restricted, these must be pre-provisioned. An unreachable endpoint is a `Dependency error`, not a reason to substitute an alternative package.

---

## R-CMD — Command index

Every command referenced by a `VERIFY` field. Run verbatim; do not paraphrase or add flags.

| Command | Purpose | Used by |
|---|---|---|
| `pnpm install --frozen-lockfile` | Reproducible install | G0 |
| `pnpm tsc --noEmit` | Type check | G0, per-task |
| `pnpm lint` | Lint | G0 |
| `pnpm build` | Production build | G0, G9 |
| `pnpm test` | Full unit suite | continuous |
| `pnpm test:commonmark` | Spec conformance | G2 |
| `pnpm test:security` | XSS corpus | G2, G5, G8 |
| `pnpm test:a11y` | axe-core audit | G8 |
| `pnpm test:contrast` | Contrast ratios | G8 |
| `pnpm test:visual` | Playwright snapshots | G3, G7 |
| `pnpm bench:stress` | Stress matrix S-01…S-12 | G6 |
| `pnpm bench:backtest` | Corpus replay | G6, G7, G8 |
| `pnpm audit --audit-level=high` | Vulnerability audit | G8 |
| `cargo tauri build` | Desktop binary | G9 |

---

## Source provenance

This plan derives from two inputs, both supplied by the user:

| Source | Role | Applied as |
|---|---|---|
| `deep-research-report.md` | Domain of record — what to build | Phases P1–P9 technical content, library selection, component mapping, packaging strategy |
| `SKILL__1_.md` (`vargr-build-rules` v1.0.0) | Process of record — how to build | Gate structure, absolute rules, decision hierarchy, batch discipline, error taxonomy, checkpoint schema, delivery checklist, reporting format |

**Deviations from the research report, with rationale:**

| Report recommendation | Plan decision | Rationale |
|---|---|---|
| Download Anthropic font binaries via `curl` | **Not performed.** Metrics recorded; open substitutes shipped. | R-LEGAL-01 |
| `remark-mermaidjs` with Playwright | **Rejected.** Client-side lazy Mermaid runtime instead. | Playwright at runtime is untenable in a browser bundle |
| `rehype-raw` for raw HTML | **Rejected.** Raw HTML disabled entirely. | DEC-005 |
| DOMPurify on the final HTML string | **Narrowed.** `rehype-sanitize` on the hast tree is primary; DOMPurify is used only for Mermaid-generated SVG. | Tree-level sanitization avoids the string round-trip and the `dangerouslySetInnerHTML` it implies |
| KaTeX CSS from CDN | **Rejected.** Bundled locally. | R-NET, R-STD-06, offline-first requirement |
