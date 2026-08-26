# claymark

**A pixel-faithful, security-hardened Markdown rendering engine in the Claude visual idiom — web, desktop, and mobile from one codebase.**

Version: `0.1.0-plan` · Status: **Pre-implementation (Gate G0 not yet passed)** · Protocol: `vargr-build-rules v1.0.0`

---

## What this bundle is

This repository contains **two separable things**. Do not confuse them.

| Directory | Contains | Audience |
|---|---|---|
| `plan/` | The deterministic build plan — roadmap, gates, checklist, state ledger, session rules, references | The executing agent (Claude Sonnet 5, low effort) |
| `docs/` | Documentation of the **finished product as it will ship** — spec, architecture, install, user guide, API, theming, security | End users, integrators, maintainers |

`plan/` is consumed and mutated during the build. `docs/` is the contract the build is measured against. When they disagree, **`docs/SPEC.md` wins** and `plan/` is corrected (Decision hierarchy: project spec > templates).

---

## Read order for the executing agent

Strictly sequential. Do not skip.

1. **`plan/00-EXECUTION-PROTOCOL.md`** — non-negotiable operating rules, output format, determinism constraints. Read fully before any other file.
2. **`plan/REFERENCES.md`** — every external requirement, data input, pinned dependency, and system resource. Nothing may be introduced that is not registered here.
3. **`plan/01-ROADMAP.md`** — 10 weighted phases, 96 atomic tasks with stable IDs.
4. **`plan/02-VERIFICATION-GATES.md`** — the exact pass criteria for each gate. A phase is not complete until its gate records PASS with evidence.
5. **`plan/03-CHECKLIST.md`** — the tickable ledger of every task. This is the working surface.
6. **`plan/04-STATE-LEDGER.md`** — checkpoint schema and the append-only state log.
7. **`plan/05-SESSION-MANAGEMENT.md`** — context thresholds and the handoff procedure.

Then, and only then, begin at task `T-P0-01`.

---

## Read order for a human evaluating the product

1. `docs/SPEC.md` — what it does and what it explicitly does not do
2. `docs/ARCHITECTURE.md` — how it is put together
3. `docs/INSTALLATION.md` — getting it running
4. `docs/USER-GUIDE.md` — using it
5. `docs/API.md` — integrating it
6. `docs/THEMING.md` — restyling it
7. `docs/SECURITY.md` — threat model and disclosure policy

---

## The one-paragraph version

`claymark` ingests untrusted Markdown (including streamed, partial Markdown arriving token-by-token) and emits a sanitized React tree styled to match Claude's chat surface: serif body type on a constrained measure, syntax-highlighted code with copy affordances, KaTeX math, lazily-hydrated Mermaid diagrams, responsive tables, image lightboxes, and a light/dark token system. It ships as an embeddable React component, a standalone PWA, a Tauri desktop binary, and an installable mobile web app.

---

## Scope declaration

Per `vargr-build-rules`, scope is never implicit. Every item is Included, Excluded, or Undecided.

**Included** — Markdown parse pipeline · sanitization · component mapping · typography and color tokens · syntax highlighting · math · diagrams · streaming render · LRU caching · copy buttons · image lightbox · table containers · light/dark theming · accessibility conformance · PWA packaging · Tauri desktop packaging · golden-corpus regression harness.

**Excluded** — Markdown *editing* or WYSIWYG authoring · any network client for a chat backend · authentication · server-side persistence · MDX/JSX execution · arbitrary raw HTML passthrough · redistribution of Anthropic's proprietary font binaries (see `plan/REFERENCES.md` §R-LEGAL-01) · native React Native rewrite.

**Undecided** — iOS App Store submission via Tauri Mobile (blocked on `Q-01`) · server-side rendering entry point (blocked on `Q-02`) · plugin API for third-party node types (blocked on `Q-03`). All three are logged in `plan/04-STATE-LEDGER.md §Open Questions` and must be resolved by human decision before Gate G3.

---

## Non-negotiable constraints

1. **No proprietary font binaries are redistributed.** The default build ships open-licensed fallbacks. Proprietary fonts may only be loaded from a path the *end user* supplies at runtime. This is a legal constraint, not a stylistic one.
2. **All rendered output is sanitized.** There is no configuration flag that disables sanitization. None will be added.
3. **No task is "complete" without a passing verification command and recorded evidence.**
4. **Dependency versions are pinned exactly.** No range specifiers (`^`, `~`) anywhere in `package.json`.

---

## Bundle manifest

```
claymark/
├── README.md                      ← you are here
├── plan/
│   ├── 00-EXECUTION-PROTOCOL.md   operating rules for the executing agent
│   ├── 01-ROADMAP.md              10 phases · 96 atomic tasks · weights
│   ├── 02-VERIFICATION-GATES.md   G0–G9 pass criteria, stress + backtest specs
│   ├── 03-CHECKLIST.md            tickable execution checklist
│   ├── 04-STATE-LEDGER.md         append-only checkpoint log + open questions
│   ├── 05-SESSION-MANAGEMENT.md   context thresholds + handoff protocol
│   └── REFERENCES.md              external requirements, inputs, resources
└── docs/
    ├── SPEC.md                    functional + non-functional specification
    ├── ARCHITECTURE.md            module boundaries, data flow, decisions
    ├── INSTALLATION.md            install + build + troubleshooting
    ├── USER-GUIDE.md              end-user documentation
    ├── API.md                     component and hook reference
    ├── THEMING.md                 design token system
    ├── SECURITY.md                threat model, hardening, disclosure
    └── CHANGELOG.md               release history (Keep a Changelog)
```
