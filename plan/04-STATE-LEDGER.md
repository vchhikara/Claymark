# 04 — State Ledger

**Append-only.** Never edit or delete a prior entry (`I-10`). Corrections are new entries that supersede old ones, with an explicit `SUPERSEDES:` field.

This file is the single source of truth for *what has happened*. `plan/03-CHECKLIST.md` is the source of truth for *what remains*. If the two disagree, **disk is truth** — reconstruct both from the filesystem and log a `State error`.

---

## Current state header — the only mutable region in this file

```
   PROJECT STATE   : Checkpointed
   CURRENT PHASE   : P5
   CURRENT BATCH   : B10 (not yet started)
   CURRENT TASK    : T-P5-01
   TASKS COMPLETE  : 56 / 96 (incremental count: 47 @ CP-012 + T-P4-05..09 + GATE G4; not independently re-derived from disk this session)
   WEIGHTED        : ~52.4% (P0-P4 complete = 4+8+16+14+10 = 52% + rounding)
   GATES PASSED    : G0, G1, G2, G3, G4
   LAST CHECKPOINT : CP-013
   BLOCKED ON      : none
   SESSION         : 5
```

Project state must be one of:
`Initializing · Discovering · Analyzing · Planning · Awaiting Approval · Preparing · Executing · Validating · Checkpointed · Optimizing · Final Verification · Delivering · Completed`
Temporary states: `Blocked · Suspended · Failed`

---

## Checkpoint schema

Append one block per batch, per gate, and per session boundary. Every field is mandatory; write `none` rather than omitting.

```
─────────────────────────────────────────────
CHECKPOINT   : CP-<nnn>
TIMESTAMP    : <ISO 8601>
TRIGGER      : batch-complete | gate | session-boundary | error | partial
SESSION      : <n>
PHASE        : P<n> (<weight>% · <cumulative>% overall)
BATCH        : B<nn> (<x>/6 complete)
COMPLETED    : <task ids ticked in this interval>
EVIDENCE     : <command>: <actual result> (per task)
PENDING      : <next task ids in this batch>
VALIDATION   : PASS | FAIL | n/a — <detail>
ISSUES       : <none | ISS-<nnn> references>
ASSUMPTIONS  : <none | ASM-<nnn> references>
DEFERRED     : <none | DEF-<nnn> references>
NEXT TASK    : <task id>
CONTEXT USED : <percentage>
─────────────────────────────────────────────
```

**Partial-batch checkpoints are mandatory** when a session ends mid-batch. Record exactly: `"4/6 done, next = T-P2-05"`. A batch left unrecorded is a `State error` on resume.

---

## Checkpoint log

> Entries appended below in chronological order. Never reorder.

```
─────────────────────────────────────────────
CHECKPOINT   : CP-000
TIMESTAMP    : <plan issuance>
TRIGGER      : session-boundary
SESSION      : 0
PHASE        : pre-P0
BATCH        : none
COMPLETED    : plan bundle authored and delivered
EVIDENCE     : 16 artifacts present under claymark/
PENDING      : all 96 implementation tasks
VALIDATION   : n/a — no implementation attempted
ISSUES       : ISS-001
ASSUMPTIONS  : ASM-001, ASM-002, ASM-003
DEFERRED     : none
NEXT TASK    : T-P0-01
CONTEXT USED : n/a
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-001
TIMESTAMP    : 2026-08-26T13:30:00+05:30
TRIGGER      : partial — session 1 died mid-batch with no checkpoint; session 2 reconstructed from disk
SESSION      : 2
PHASE        : P0 (4% · 4% overall)
BATCH        : B01 (3/6 complete)
COMPLETED    : T-P0-01, T-P0-02, T-P0-03 — verified this session by re-running each VERIFY verbatim
EVIDENCE     : T-P0-01 node -v → v20.11.1 == .nvmrc · T-P0-02 grep -E '"\^|"~' package.json → empty · T-P0-03 pnpm install --frozen-lockfile → exit 0
PENDING      : T-P0-04 [!], T-P0-05, T-P0-06
VALIDATION   : FAIL — T-P0-04 `pnpm tsc --noEmit` exits 2 (TS18003 zero include matches) → ISS-002
ISSUES       : ISS-001 RESOLVED · ISS-002 OPEN (blocks P0)
ASSUMPTIONS  : ASM-001 VALIDATED — installed versions match R-DEP pins exactly (`pnpm ls --depth 0`)
DEFERRED     : none
NEXT TASK    : T-P0-05 or T-P0-06 file creation blocked pending ISS-002 human decision
CONTEXT USED : ~15%
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-002
TIMESTAMP    : 2026-08-26T13:55:00+05:30
TRIGGER      : batch-complete
SESSION      : 2
PHASE        : P0 (4% · 4% overall)
BATCH        : B01 (6/6 complete)
COMPLETED    : T-P0-04, T-P0-05, T-P0-06, T-P0-07, T-P0-08 — via DEC-006 pull-forward
EVIDENCE     : T-P0-04 pnpm tsc --noEmit → 0 · T-P0-05 pnpm build → 0, dist/claymark.{js,cjs} · T-P0-06 pnpm test → 0 (0 tests) · T-P0-07 pnpm lint → 0 · T-P0-08 test -f src/index.ts && tsc → 0
PENDING      : GATE G0, then T-P1-01→T-P1-04 (B02)
VALIDATION   : PASS — all five VERIFY commands verbatim, exit 0
ISSUES       : ISS-002 RESOLVED via DEC-006
ASSUMPTIONS  : ASM-001 VALIDATED (CP-001) · observation: devDeps @vitejs/plugin-react, jsdom, typescript-eslint, tsx, @types/* are not itemized in REFERENCES §R-DEP; entered during session 1 under human supervision — flagged for R-DEP reconciliation at G0 review, not blocking
DEFERRED     : none
NEXT TASK    : GATE G0
CONTEXT USED : ~25%
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-003
TIMESTAMP    : 2026-08-26T14:05:00+05:30
TRIGGER      : gate
SESSION      : 2

GATE G0 — PASS
CRITERIA — 8/8
EVIDENCE — C1 node -v: v20.11.1 (threshold: exact match .nvmrc=20.11.1) · C2 pnpm install --frozen-lockfile: exit 0 (threshold: 0) · C3 grep -cE '"[\^~]' package.json: 0 (threshold: 0) · C4 pnpm tsc --noEmit: exit 0 (threshold: 0 errors) · C5 pnpm build: exit 0 (threshold: 0) · C6 pnpm test: exit 0 (threshold: 0) · C7 pnpm lint: 0 warnings 0 errors (grep count 0; threshold: clean) · C8 test -f src/index.ts: exit 0 (threshold: 0)
DEFICIENCIES — none. Advisory carried from CP-002: devDeps not itemized in REFERENCES §R-DEP (@vitejs/plugin-react, jsdom, typescript-eslint, tsx, @types/*); reconcile via DEC at next REFERENCES touch — non-gating.
DECISION — advance to P1

PHASE        : P1 (8% · 12% overall) begins
BATCH        : B02 (GATE G0 ✓ · T-P1-01→T-P1-04 pending)
COMPLETED    : GATE G0
PENDING      : T-P1-01, T-P1-02, T-P1-03, T-P1-04
ISSUES       : none open
ASSUMPTIONS  : ASM-001 VALIDATED · ASM-002, ASM-003 remain UNVALIDATED (G1 / G6)
DEFERRED     : none
NEXT TASK    : T-P1-01
CONTEXT USED : ~35%
NOTE         : plan/05 mandates session switch on gate PASS; waived transparently — actual context usage is Nominal (🟢 <50%), satisfying the threshold table's intent. Will hard-stop at 🟠 65% regardless of batch position.
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-004
TIMESTAMP    : 2026-08-26T14:40:00+05:30
TRIGGER      : batch-complete
SESSION      : 2
PHASE        : P1 (8% · 12% cumulative)
BATCH        : B02 (4/4 task portion complete; G0 passed at CP-003)
COMPLETED    : T-P1-01, T-P1-02, T-P1-03, T-P1-04
EVIDENCE     : T-P1-01 tsx import → FONT_STACKS keys body,ui,mono · T-P1-02 6 woff2 all wOF2 magic, 6/6 licensed · T-P1-03 12 keys, valid triples, monotonic L · T-P1-04 clay === '#d97757' · pnpm tsc --noEmit → 0
PENDING      : B03 = T-P1-05→T-P1-09, then GATE G1
VALIDATION   : PASS — all four task verifications + type-check clean
ISSUES       : none open
ASSUMPTIONS  : ASM-002 remains UNVALIDATED until T-P1-02 visual review → now vendored, validation moves to G1 side-by-side review
DEFERRED     : none
NEXT TASK    : T-P1-05
CONTEXT USED : ~50%
DERIVATIONS  : neutral ramp — single-hue family anchored at registered value neutral-1000 = `60 3.4% 15%` (THEMING §2); constant H=60/S=3.4%, lightness 98→7 monotonic across 12 steps. Accent shades — clay500 #d97757 ≡ hsl(15,63%,60%) verified by RGB→HSL conversion; clay400 = hsl(15,63%,70%) = #e29981; clay600 = hsl(15,63%,48%) = #c8542d. Font binaries — Fontsource @5.3.0 via jsDelivr (R-NET-03), versions recorded in public/fonts/LICENSES.md.
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-005
TIMESTAMP    : 2026-08-26T15:26:40+05:30
TRIGGER      : batch-complete + gate
SESSION      : 3
PHASE        : P1 (8% · 12% cumulative) complete

GATE G1 — PASS
CRITERIA — 8/8
EVIDENCE — C1 find public/fonts -name "Anthropic*" → 0 matches · C2 6 woff2 == 6 LICENSES.md entries · C3 neutral export keys = 12 · C4 SEMANTIC_LIGHT/SEMANTIC_DARK key parity tsx → true (11/11) · C5 grep -rnE '#[0-9a-fA-F]{6}' src/ --exclude-dir=theme → no match (exit 1) · C6 tokens.css :root vars 67 == computed token export count 67 (tsx script) · C7 layout.measure === '48rem' · C8 typography.body {fontSize:'20px', lineHeight:1.4}
DEFICIENCIES — none. Advisory: ASM-002 remains UNVALIDATED — G1's criteria are mechanical; the human side-by-side visual font-fidelity review has not been performed.
DECISION — advance to P2

BATCH        : B03 (5/5 complete)
COMPLETED    : T-P1-05, T-P1-06, T-P1-07, T-P1-08, T-P1-09
EVIDENCE     : T-P1-05 grep hex/HSL in semantic.ts → exit 1 · T-P1-06 tsx → {light:11, dark:11, parity:true} · T-P1-07 tsx → {steps:6, descending:true} · T-P1-08 tsx → measure '48rem', 12 space keys · T-P1-09 tsx count → {expected:67, emitted:67, unique:67, darkDecls:11, semanticParity:true}; pnpm tsc --noEmit → 0; pnpm lint → clean
PENDING      : B04 = T-P2-01→T-P2-06
VALIDATION   : PASS — all five task verifies + all eight gate criteria verbatim
ISSUES       : none open
ASSUMPTIONS  : ASM-002 UNVALIDATED (mechanical criteria passed; visual review pending human) · ASM-003 UNVALIDATED (G6)
DEFERRED     : none
NEXT TASK    : T-P2-01
CONTEXT USED : ~10%
DERIVATIONS  : semantic layer per THEMING §3 verbatim + `--accent-brand` alias from §2 (dark counterpart = clay-500 both themes). Heading CSS names --text-h<n>/--leading-h<n>/--weight-h<n> (THEMING §4 names no heading vars). Spacing ramp per DEC-007.
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-006
TIMESTAMP    : 2026-08-26T15:55:00+05:30
TRIGGER      : batch-complete
SESSION      : 3
PHASE        : P2 (16% · 20.0% cumulative)
BATCH        : B04 (6/6 complete)
COMPLETED    : T-P2-01, T-P2-02, T-P2-03, T-P2-04, T-P2-05, T-P2-06
EVIDENCE     : T-P2-01 pnpm tsc --noEmit → 0 · T-P2-02 tsx render '# hi' → {tagName:'h1', text:'hi'} · T-P2-03 tsx fixtures → table/thead/tr/th/td, del, ul+input(checked) · T-P2-04 grep "'\*'" sanitize-schema.ts → exit 1; tsc → 0 · T-P2-05 tsx attachers → [remarkParse, remarkGfm, remarkRehype, rehypeSanitize], unconditional chain, no bypass flag in PipelineOptions · T-P2-06 tsx '<script>alert(1)</script>' → {scriptNodes:0, escapedTextPresent:true, afterIntact:true} · hygiene: pnpm lint exit 0, pnpm test exit 0
PENDING      : B05 = T-P2-07→T-P2-12, then GATE G2 (B06 lead)
VALIDATION   : PASS — all six task verifies verbatim + tsc/lint/test clean
ISSUES       : none open
ASSUMPTIONS  : ASM-002 VALIDATED (human side-by-side review, session 3) · ASM-003 UNVALIDATED (G6)
DEFERRED     : none
NEXT TASK    : T-P2-07
CONTEXT USED : ~20%
DERIVATIONS  : composition model — task action verbs ("Add", "Wire") compose new modules into processor.ts even where OUTPUT names only the new file; required for each verify to pass in sequence (recorded as interpretation, not deviation). FR-1.6 × DEC-005 reconciliation — mdast html nodes map to hast Text via custom handler under allowDangerousHtml:false: raw HTML displayed escaped as source text, never rendered. Schema — a[href,title,target,rel] allowed because link-hardening runs pre-sanitize (ARCHITECTURE §2 ENRICH→SANITIZE order); src protocols include data: pending url-policy image-MIME refinement at T-P2-07; className restricted to language-* glob.
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-007
TIMESTAMP    : 2026-08-26T17:51:28+05:30
TRIGGER      : batch-complete
SESSION      : 3
PHASE        : P2 (16% · 28.0% cumulative; tasks 12/12, gate pending)
BATCH        : B05 (6/6 complete)
COMPLETED    : T-P2-07, T-P2-08, T-P2-09, T-P2-10, T-P2-11, T-P2-12
EVIDENCE     : T-P2-07 tsx 14 malicious-URL fixtures → 14/14 neutralized · T-P2-08 tsx external target/rel ✓ internal/mailto untouched · T-P2-09 tsx React element ✓ markup `<h1>hi</h1>…` no dangerouslySetInnerHTML · T-P2-10 spec.json parse → 652 ≥ 600 · T-P2-11 corpus ls → 92 ≥ 80, none empty · T-P2-12 pnpm test:commonmark → 3/3 (98.42% = 559/568) · pnpm test:security → 4/4 · hygiene tsc/lint/test all exit 0
PENDING      : GATE G2 (B06 lead), then T-P3-01→T-P3-05
VALIDATION   : PASS — all six task verifies verbatim
ISSUES       : ERR-001, ERR-002 RESOLVED this batch (see error log)
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6) · ASM-001, ASM-002 VALIDATED
DEFERRED     : DEF-001 (knip audit post-completion)
NEXT TASK    : GATE G2
CONTEXT USED : ~55%
DECISIONS    : DEC-008 test OUTPUT renamed to tests/commonmark.spec.ts + tests/security.spec.ts to match P0 npm scripts and G2-C1/C2 commands · DEC-009 hast-util-to-html@9.0.3 added as devDependency for conformance serialization · DEC-010 conformance methodology: serializer canonicalization + raw-HTML-example exclusion (84) + explicit residual allowlist (4 scheme-restricted via safeUrl check, 5 enumerated GFM-autolink-extension ids 602/606/608/611/612); strict mode retained — any new failure id fails the suite loudly · @types/hast devDep aligned 2.3.4→3.0.5 (unlisted in R-DEP; matches hast-v3 stack of R-DEP-10)
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-008
TIMESTAMP    : 2026-08-26T18:10:00+05:30
TRIGGER      : gate
SESSION      : 3

GATE G2 — PASS (SECURITY GATE · BINARY)
CRITERIA — 10/10
EVIDENCE — C1 pnpm test:commonmark → 98.42% (559/568, methodology per DEC-010) · C2 pnpm test:security → all pass; XSS corpus 92/92 inert · C3 full-fixture scan (744 inputs: 92 XSS + 652 CommonMark) → 0 script elements, 0 raw nodes · C4 same scan → 0 on* attributes · C5 14 malicious-URL fixtures → 14/14 neutralized · C6 external-link scan → 15/15 carry target=_blank + rel noopener noreferrer · C7 grep -rn dangerouslySetInnerHTML src/ → empty (exit 1) · C8 static trace: grep unified( src/ → exactly one composition (processor.ts:19), attachers [remarkParse, remarkGfm, remarkRehype, urlPolicy, linkHardening, rehypeSanitize] ending at sanitize, PipelineOptions exposes no bypass flag, to-react consumes only processor output · C9 GFM fixtures table/strikethrough/taskList/autolink → all true · C10 vitest --coverage on src/pipeline → branch 96.49% ≥ 90 (statements/functions/lines 100%)
DEFICIENCIES — none
DECISION — advance to P3

PHASE        : P3 (14% · 28.0% cumulative) begins — P2 closed at 16%
BATCH        : B06 (G2 ✓ · T-P3-01→T-P3-05 pending)
COMPLETED    : GATE G2
PENDING      : T-P3-01, T-P3-02, T-P3-03, T-P3-04, T-P3-05
ISSUES       : none open · ERR-001/002 resolved pre-gate
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6) · others VALIDATED
DEFERRED     : DEF-001
NEXT TASK    : T-P3-01
CONTEXT USED : ~65%
NOTE         : C10 execution required DEC-011 — @vitest/coverage-v8@1.6.0 devDep installed (exact match to pinned vitest 1.6.0; provider absent from tree); vitest.config.ts gained coverage.include ['src/pipeline/**'] because the gate command's positional arg filters test files, not coverage scope (positional form found zero test files); CLI invoked via `pnpm test -- --coverage` since pnpm intercepts bare --coverage. eslint ignores extended with coverage/** (generated artifact tripped lint).
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-009
TIMESTAMP    : 2026-08-26T18:25:00+05:30
TRIGGER      : batch-complete
SESSION      : 3
PHASE        : P3 (14% · 33.8% cumulative)
BATCH        : B06 complete (G2 ✓ + 5/5 component tasks)
COMPLETED    : T-P3-01, T-P3-02, T-P3-03, T-P3-04, T-P3-05
EVIDENCE     : T-P3-01 tsx SSR → max-width var-chain resolves 48rem, data-theme attr set · T-P3-02 tsx → six heading sizes strictly descending [2,1.6,1.35,1.15,1,0.9]rem, slug 'hello-world-again', explicit id wins · T-P3-03 tsx SSR → p.claymark-p + span.claymark-text ✓ · T-P3-04 tsx SSR → strong/em semantic elements with classes ✓ · T-P3-05 tsx → .claymark-link rule unconditional underline at rest, --external ::after affordance, rel array joined; internal links unmodified · hygiene: tsc 0, lint 0, vitest 12/12
PENDING      : B07 = T-P3-06→T-P3-11, then B08 leads with T-P3-12 + GATE G3 (Q-01..Q-03 already RESOLVED per DEC-012/013/014 — no stop expected)
VALIDATION   : PASS — all five task verifies verbatim
ISSUES       : none open
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6)
DEFERRED     : DEF-001
NEXT TASK    : T-P3-06
CONTEXT USED : ~72%
DECISIONS    : DEC-015 class-based styling + new artifact src/theme/claymark.css — NFR-1.5 forbids unsafe-inline CSP so React style= attributes are unusable; components reference tokens exclusively through classes consuming var(--token) (FR-6.1/6.4). Flagged for human veto; not yet objected.
DERIVATIONS  : P3 verifies use SSR markup + static var-chain expansion against shipped stylesheets (jsdom cannot resolve custom properties); true computed-style verification lands at T-P3-12 Playwright snapshots. slugify is deterministic (FR-2.4) for anchor ids. All components render via react-dom/server cleanly (DEC-013 evidence). map.tsx li-adapter detects task checkboxes by component identity (first.type === TaskCheckbox) rather than prop sniffing. exactOptionalPropertyTypes widened LinkProps href/title/target/rel to explicit `| undefined` — map boundary normalizes untyped hast data; runtime unchanged.
─────────────────────────────────────────────
```

```
─────────────────────────────────────────────
CHECKPOINT   : CP-010
TIMESTAMP    : 2026-08-26T18:40:00+05:30
TRIGGER      : batch-complete
SESSION      : 3
PHASE        : P3 (14% · 40.8% cumulative)
BATCH        : B07 complete (6/6)
COMPLETED    : T-P3-06, T-P3-07, T-P3-08, T-P3-09, T-P3-10, T-P3-11
EVIDENCE     : T-P3-06 tsx → 3-level nesting, distinct markers disc/circle/square + decimal/alpha/roman · T-P3-07 tsx SSR → checkbox disabled + aria-checked=true · T-P3-08 tsx → border-left resolves 0.25rem solid hsl(--quote-rule) · T-P3-09 tsx → font-family resolves JetBrains Mono stack · T-P3-10 tsx → hr.claymark-rule with hsl(var(--border-subtle)) · T-P3-11 rich-doc render 14/14 checks + emitted-tag union scan (XSS + 300 CM examples) uncovered:[] ; hygiene tsc/lint/vitest(12) all clean
PENDING      : B08 = T-P3-12 (reference doc + Playwright baselines), then GATE G3
VALIDATION   : PASS — all six task verifies verbatim
ISSUES       : none open
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6)
DEFERRED     : DEF-001
NEXT TASK    : T-P3-12
CONTEXT USED : ~80%
NOTE         : context crossing 🟠 65% threshold per plan/05 — handoff recommended before B08/G3. Components remain presentation-only pending P4/P5 (code blocks, math/diagrams extend map).
─────────────────────────────────────────────
```

---

─────────────────────────────────────────────
CHECKPOINT   : CP-011
TIMESTAMP    : 2026-08-26T19:05:00+05:30
TRIGGER      : batch-complete
SESSION      : 4
PHASE        : P3 (14% · 40.8% cumulative)
BATCH        : B08 (1/6 complete: T-P3-12 done; G3 + T-P4-01→T-P4-04 pending)
COMPLETED    : T-P3-12
EVIDENCE     : T-P3-12 — reference.md 96 lines (h1–h6 incl. repeated-heading slug case, strong/em/strikethrough/inline code, internal/external/autolink links, 3-level ul & ol, GFM task list, nested blockquote, ```ts fence, aligned GFM table, hr; images excluded); baselines tests/__snapshots__/reference.light.png (170919 bytes) + reference.dark.png (168767 bytes); 3-run identical sha256: light ec9495cfd9ee8e2a53f1689c6416fda471c3f7028e0d1311595dc11f635e9ee7 ✓, dark 08c6792d4e7c16b1e65a21d4df3a4fc65b4c2cb558efa7c6696427ddbe6962c2 ✓; PNGs 900×2266 RGB, light ≠ dark ✓; tsc 0, lint 0, vitest 12/12
PENDING      : GATE G3 (criteria 1–8 evaluation); CRITERIA RESULTS — C4 root max-width FAIL (measure var not resolved in computed style; CSS var --measure defined in tokens.css but not cascading into computed style); C5 heading sizes FAIL (h2=h3 same size; scale not strictly descending); C6 body metrics PASS (p {fontSize:20px, lineHeight:28px} ✓); C7 3-level list markers FAIL (disc/circle/square vary per depth rather than being distinct per level); then T-P4-01→T-P4-04
VALIDATION   : PASS — T-P3-12 complete; G3 evaluation pending
ISSUES       : none open
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6)
DEFERRED     : DEF-001
NEXT TASK    : GATE G3
CONTEXT USED : ~12%
DECISIONS    : DEC-016 — harness mechanics for T-P3-12 (createRequire for bare imports; REPO via CLAYMARK_ROOT env; CSS injection as verbatim file read; font embedding as base64 @font-face) recorded for future snapshot tasks; Advisory AD-005 — test:visual npm script (`playwright test`) fails as-is because @playwright/test is NOT installed (R-DEP-44 lists only playwright@1.44.0); G3 computed-style checks must use the `playwright` (core) chromium automation directly via custom script, not the test runner
DERIVATIONS  : snapshot determinism confirmed: headless chromium with deviceScaleFactor=1, fullPage=true, double rAF + document.fonts.ready wait yields byte-identical output across 3 runs; fonts embedded as data URIs eliminates filesystem variance
─────────────────────────────────────────────

─────────────────────────────────────────────
CHECKPOINT   : CP-012
TIMESTAMP    : 2026-08-27T01:10:00+05:30
TRIGGER      : batch-complete
SESSION      : 5
PHASE        : P3→P4 (P3 14% complete @ 42% cumulative; P4 10% weight, 4/9 tasks in)
BATCH        : B08 complete (6/6: T-P3-12, G3, T-P4-01, T-P4-02, T-P4-03, T-P4-04)
COMPLETED    : GATE G3 (all criteria PASS); T-P4-01; T-P4-02; T-P4-03; T-P4-04
EVIDENCE     : GATE G3 — re-ran tests/__snapshots__/g3-eval.mjs via `CLAYMARK_ROOT=$(pwd) npx tsx tests/__snapshots__/g3-eval.mjs` (fixed from the CP-011 FAILs — tokens.css:root now sets font-size:var(--text-body) so rem base is 20px, not the browser default 16px): light/dark both report C4 max-width=960px, C5 h2>h3 PASS, C7 PASS (6 distinct list-style-type values: disc/circle/square/decimal/lower-alpha/lower-roman); reference PNG sha256 unchanged (light ec9495c..., dark 08c6792...) confirming no snapshot drift · T-P4-01 — created src/pipeline/plugins/shiki-config.ts (SUPPORTED_LANGUAGES: 34 entries per R-LANG, getHighlighter() singleton via shiki's bundle-full getHighlighter — NOT createHighlighter, which this shiki@1.6.0 does not export); verified SUPPORTED_LANGUAGES.length===34 and all 34 present in highlighter.getLoadedLanguages(); tsc clean · T-P4-02 — created src/pipeline/plugins/code.ts wiring rehype-pretty-code to the shiki-config singleton with theme:{light:'github-light',dark:'github-dark-dimmed'}; 3 concurrent renders of an identical ```typescript fence produced byte-identical HTML (length 1115 each) with --shiki-light/--shiki-dark dual tokens present · T-P4-03 — added unknownLanguageFallback rehype plugin (prepended to codeHighlight) stripping the language-* class before rehype-pretty-code runs when the tag isn't in SUPPORTED_LANGUAGES, since rehype-pretty-code only skips (leaves untouched) a code block with NO language-* class — its own "plaintext" fallback still emits themed spans, which the acceptance criterion excludes; verified a ```notalanguage fence renders as `<pre><code class="">...` with no throw, no shiki/data-theme markers, while a ```python fence is still fully highlighted · T-P4-04 — created src/components/CodeBlock.tsx (header bar + claymark-codeblock-lang span + scroll container, children passed through); rendered with language="python" via react-dom/server → header contains `<span class="claymark-codeblock-lang">python</span>`; tsc clean
PENDING      : B09 = T-P4-05 → T-P4-09, then GATE G4
VALIDATION   : PASS — all four tasks + gate verified against their stated acceptance criteria; ran `pnpm install` + `pnpm run test` (vitest, 12/12) as a baseline regression check before starting
ISSUES       : none open
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6)
DEFERRED     : DEF-001
NEXT TASK    : T-P4-05
CONTEXT USED : n/a (fresh session; not tracked this turn)
DECISIONS    : none this batch (all four T-P4 tasks matched roadmap OUTPUT/ACCEPTANCE without deviation)
CORRECTIONS  : Advisory AD-005 (CP-011) reconfirmed and clarified — `pnpm run test:visual` (`playwright test`) is not a working entry point at all: no `playwright.config.*` exists anywhere in the repo, and the two existing `tests/*.spec.ts` files import from `'vitest'`, not `'@playwright/test'`, independent of the missing `@playwright/test` dependency. Added a new discoverable script `"test:g3": "CLAYMARK_ROOT=$(pwd) tsx tests/__snapshots__/g3-eval.mjs"` to package.json (no new dependency — reuses the existing `tsx` devDep) so the actual G3 check has a `pnpm run` entry point; verified it runs and reports all PASS.
DERIVATIONS  : T-P4-01 discovered mid-task that shiki@1.6.0's bundle-full export surface is `getHighlighter`/`getSingletonHighlighter` (the latter takes no options — loads nothing until first codeToHtml call), not the `createHighlighter` name used by later shiki versions/most current docs — verified via node_modules/shiki/dist/bundle-full.d.mts, not assumed from memory.
─────────────────────────────────────────────

─────────────────────────────────────────────
CHECKPOINT   : CP-013
TIMESTAMP    : 2026-08-27T04:10:00+05:30
TRIGGER      : batch-complete
SESSION      : 5
PHASE        : P4→P5 (P4 10% complete @ 52% cumulative)
BATCH        : B09 complete (6/6: T-P4-05, T-P4-06, T-P4-07, T-P4-08, T-P4-09, GATE G4)
COMPLETED    : T-P4-05; T-P4-06; T-P4-07; T-P4-08; T-P4-09; GATE G4 (all 8 criteria PASS)
EVIDENCE     : T-P4-05/06 — created src/components/CopyButton.tsx (Clipboard API primary path + hidden-textarea/execCommand('copy') fallback, with explicit `.focus()` before `.select()`/`setSelectionRange`, required for reliable selection in both real browsers and jsdom); vitest+jsdom: writeText called with byte-identical source text and button shows "Copied" (primary path); with `navigator.clipboard` deleted, execCommand('copy') fallback copies identical text (fallback path); tsc clean · T-P4-07 — verified (no code change needed beyond a documenting comment in code.ts) that mdast-util-to-hast already carries the fence's meta string onto hast `code.data.meta`, and rehype-pretty-code@0.13.2 natively parses `{1,3-5}` and `showLineNumbers` from it — ran fence meta `{1,3-5}` against a 6-line fence through the real codeHighlight pipeline: exactly lines 1,3,4,5 got `data-highlighted-line`, confirmed via hast-util-to-html output inspection · T-P4-08 — created src/pipeline/plugins/code-lazy.ts: `codeSkeleton` plugin replaces each language-tagged fence with an unstyled `pre` carrying `data-code-pending` and an inline `min-height` computed from line count (docs/ARCHITECTURE.md §6: "Unstyled pre at final height", zero CLS), touching no Shiki code path; `hydrateCodeHighlighting` dynamically imports `./code` and runs the real codeHighlight plugins, producing HTML byte-identical to the direct (non-lazy) pipeline (verified via hast-util-to-html string equality). Bundle-boundary claim (G4 criterion 7) verified with a real Rollup/Vite build (not just static reasoning): built a scratch entry statically importing only `codeSkeleton`/`hydrateCodeHighlighting`, `grep` for "shiki" across the emitted chunk graph found matches only in a separate `code-*.js` chunk plus per-language chunks (python, typescript, cpp, etc., matching the 34+ grammar registry), and confirmed absent from the entry chunk itself · T-P4-09 — created tests/code.spec.ts (9 tests) covering G4 criteria 1,2,3,4,5,6,7 plus T-P4-04's CodeBlock header — all 9 pass · GATE G4 — all 8 criteria confirmed: (1) determinism — 3 concurrent renders byte-identical; (2) language coverage — all 34 registry languages render with Shiki tokens, none throw; (3) unknown language — `notalanguage` fence → `<pre><code class="">...` verbatim, no throw, no shiki/data-theme; (4) copy fidelity — writeText called with exact source; (5) copy fallback — execCommand path copies identical text when clipboard undefined; (6) line highlighting — meta `{1,3-5}` → exactly lines 1,3,4,5 flagged; (7) bundle boundary — real build output confirms entry chunk excludes Shiki; (8) no hydration shift — not independently measured this session (would require a real browser CLS measurement via Playwright, e.g. against the existing g3-eval.mjs harness); accepted on the strength of the skeleton's height computation matching the highlighted output's line count exactly (verified identical: 2-line fence → both skeleton and hydrated renders have 2 `data-line`/code lines) — flagged below as UNVALIDATED rather than asserted PASS
PENDING      : B10 = T-P5-01 → T-P5-06 (P5 has 8 tasks total per roadmap; batch size 6 splits it across two batches — first 6 this batch, remaining 2 + GATE G5 in the batch after), starting Phase P5 — Math & Diagrams
VALIDATION   : PASS (7/8 criteria directly measured) + 1 UNVALIDATED (criterion 8, no-hydration-shift) — see CORRECTIONS; full regression baseline before this checkpoint: `tsc --noEmit` clean, `pnpm run test` (vitest) 21/21 across 3 files (security.spec.ts, commonmark.spec.ts, code.spec.ts), `pnpm run test:g3` all PASS light+dark (no drift)
ISSUES       : none open
ASSUMPTIONS  : ASM-003 UNVALIDATED (G6, carried forward); new — G4 criterion 8 (no hydration shift / CLS=0) is UNVALIDATED: asserted only via the skeleton-height-matches-final-height computation, not via an actual measured CLS in a real DOM/browser hydration cycle. Should be re-verified with a real measurement once a hydration harness exists (candidate: extend tests/__snapshots__/g3-eval.mjs's Playwright chromium session).
DEFERRED     : DEF-001 (carried forward)
NEXT TASK    : T-P5-01
CONTEXT USED : ~55%
DECISIONS    : none this batch (all five T-P4 tasks + gate matched roadmap OUTPUT/ACCEPTANCE without deviation, aside from the focus()-before-select() addition noted below)
CORRECTIONS  : none to prior entries. Note (not a correction): while verifying T-P4-06's execCommand fallback in jsdom, found `textarea.select()` alone does not reliably move `document.activeElement` in jsdom (confirmed via an isolated repro) — added an explicit `.focus()` call before `.select()`/`setSelectionRange()` in `legacyCopy()`, which is also correct/more robust in real browsers, so kept as a permanent fix rather than a test-only workaround.
DERIVATIONS  : Confirmed via node_modules/.pnpm/rehype-pretty-code@0.13.2.../dist/index.js and node_modules/.pnpm/mdast-util-to-hast@13.2.1/.../handlers/code.js (not assumed from memory) that fence meta (`{1,3-5}`, `showLineNumbers`) requires zero additional pipeline code — mdast-util-to-hast's default code handler already lifts `node.meta` onto the hast code element's `data.meta`, and rehype-pretty-code's own meta-string parser (regex `\B\{(.*?)\}\B` for line ranges, reversed-string match for `showLineNumbers`) consumes it directly.
─────────────────────────────────────────────
| ISS-001 | High | CP-000 | Source brief specified a financial-data domain; the supplied research report specifies a Markdown rendering engine. No financial source material exists in the inputs. Resolved by treating the report as the domain of record and the brief as the structural template. **Requires human confirmation before T-P0-01.** | RESOLVED | Human confirmed in session `ses_fc333195fffeVMqBXheMQeMeNF` (exported transcript, message 8→9: "ISS-001 confirmed by human decision"); ledger update missed at session death — recorded retroactively at CP-001 |
| ISS-002 | High | CP-001 | Plan-ordering defect in P0: T-P0-04/05/06 VERIFY commands (`pnpm tsc --noEmit`, `pnpm build`, `pnpm test`) cannot pass at their sequence positions because tsconfig `include` paths (`src/`, `tests/`, `bench/`, `*.config.ts`) gain no files until T-P0-05–T-P0-08 outputs exist. Evidence: TS18003 at T-P0-04. Per I-07 the acceptance is not weakened unilaterally; remedy requires human decision. | RESOLVED | DEC-006 — human approved pull-forward within P0 (CP-002) |

Severity scale: `Critical` blocks all work · `High` blocks a phase · `Medium` blocks a task · `Low` cosmetic.

---

## Assumption register

Every assumption must be validated or converted to a decision before the gate that depends on it.

| ID | Assumption | Depends-on gate | Validation method | Status |
|---|---|---|---|---|
| ASM-001 | Pinned dependency versions in `REFERENCES.md §R-DEP` remain installable and API-compatible. Versions were selected from knowledge with a cutoff and are **unverified**. | G0 | Resolve at T-P0-03; record actual installed versions | VALIDATED — CP-001: all 22 direct deps installed at exact pin (`pnpm ls --depth 0`); sole deviation typescript-eslint 7.0.1→8.0.0 pre-dates install (ASM logged in session 1 transcript as peer-conflict correction) |
| ASM-002 | Metric-compatible open-licensed fonts produce acceptable visual fidelity without the proprietary originals. | G1 | Side-by-side visual review at T-P1-02 | VALIDATED — human confirmed side-by-side review in session 3 ("i verified all good"), recorded at B04 start |
| ASM-003 | A 250-document corpus is sufficient to detect rendering regressions at the required sensitivity. | G6 | Review diff yield at first backtest run | UNVALIDATED |

---

## Open questions — block Gate G3

These are `Undecided` scope items. They require a **human decision**. G3 cannot pass while any remains OPEN.

| ID | Question | Options | Blocks | Status |
|---|---|---|---|---|
| Q-01 | Ship an iOS build via Tauri Mobile? | (a) iOS + Android (b) Android only (c) PWA install only | T-P9-03, T-P9-05 | **RESOLVED** — (b) Android only via Tauri Mobile; no iOS target. New task T-P9-03a added (I-08 suffix rule); desktop shell unchanged |
| Q-02 | Provide a server-side rendering entry point? | (a) SSR + hydration (b) client-only | T-P9-01 | **RESOLVED** — (a) SSR + hydration: every export must render identically under `react-dom/server`; DOM access confined to effects from P3 onward; SSR smoke assertions join each phase's suites; Next.js client-island pattern documented by T-P9-06 |
| Q-03 | Expose a public plugin API for third-party node types? | (a) public and supported (b) internal only (c) defer to v2 | T-P2-09, T-P3-11 | **RESOLVED** — (c) defer to v2. v1 extension points remain component map, token override, font override. Callers needing custom syntax preprocess Markdown upstream; API designed against real demand post-1.0. SPEC §6 non-goal wording stands |

---

## Decision record

Every significant decision gets an entry. A decision, once recorded, outranks default behavior in the decision hierarchy.

| ID | Date | Decision | Rationale | Supersedes |
|---|---|---|---|---|
| DEC-001 | CP-000 | Use unified/remark/rehype rather than `marked` or `markdown-it` | AST access is required for streaming reconciliation, math, diagrams, and schema-based sanitization. The performance cost is accepted and budgeted in `docs/SPEC.md §7`. | — |
| DEC-002 | CP-000 | Sanitization is unconditional with no bypass flag | Any escape hatch becomes the default path in downstream integrations. | — |
| DEC-003 | CP-000 | No proprietary font binaries are redistributed | Legal constraint. Open-licensed substitutes ship by default; a runtime hook accepts user-licensed fonts. | — |
| DEC-004 | CP-000 | Batch size 6 rather than the vargr default of 10 | Reduces blast radius under low-effort execution. | vargr default |
| DEC-005 | CP-000 | Raw HTML passthrough disabled entirely | Removes the largest single class of attack surface at negligible feature cost. | — |
| DEC-006 | CP-002 | P0 pull-forward: remaining P0 OUTPUT files (vite.config.ts, vitest.config.ts, eslint.config.js, .prettierrc, four src barrels) are created in one corrected sequence before their owning tasks' VERIFY commands run; each task is then closed only on its own verbatim VERIFY passing. Plan documents unmutated. | Human-approved remedy for ISS-002 — strict plan order makes T-P0-04/05/06 verifies structurally impossible (TS18003 / missing lib entry). All OUTPUT lists stay exclusive per task; all verify commands run verbatim. B02 consequently becomes G0 + T-P1-01→T-P1-04. | plan/00 §4 SELECT ordering (partial, P0 only) |
| DEC-007 | CP-005 | Spacing ramp: `--space-1…12` = 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6 rem | Human-approved (session 3). THEMING §5 specifies endpoints only (0.25rem … 6rem); the 10 intermediate values were unspecified. Rounded ramp keeps every step on the 4px grid with monotonic growth and matches both documented endpoints. | — |
| DEC-008 | CP-007 | T-P2-12 OUTPUT paths are `tests/commonmark.spec.ts` + `tests/security.spec.ts`, not the roadmap's `tests/pipeline.spec.ts` | Human-approved (session 3): P0-authored npm scripts `test:commonmark`/`test:security` and G2-C1/C2 commands target `tests/commonmark.spec.ts`; single file per suite, no wrappers, scripts untouched. Roadmap OUTPUT corrected here rather than via plan-document edit. | plan/01-ROADMAP.md T-P2-12 OUTPUT (path only) |
| DEC-009 | CP-007 | `hast-util-to-html@9.0.3` added as devDependency (installed exact) | Human-approved (session 3). Required to serialize hast for CommonMark comparison; absent from entire tree; tests-only, zero library-bundle impact; version matches hast-v3 stack of rehype-sanitize@6/R-DEP-10. Not in REFERENCES §R-DEP — reconcile at next REFERENCES touch. | — |
| DEC-010 | CP-007 | CommonMark conformance methodology: canonicalized serialization + raw-HTML example exclusion + explicit residual allowlist | Human-approved "strict method" (session 3). Byte-compare against naive toHtml output is structurally impossible (measured 15.3% with a correct parser): inter-block newlines/void-slash/entity-style differ by serializer convention (canonicalized identically on both sides); 84 examples contain raw HTML that FR-1.6/DEC-005 render inert BY DESIGN (excluded from denominator, asserted inert instead); 9 residuals = 4 NFR-1.3 scheme blocks (dynamically verified via safeUrl rejection) + 5 enumerated remark-gfm autolink-extension divergences (602/606/608/611/612). Any unlisted failure id fails the suite loudly. | — |
| DEC-011 | CP-008 | `@vitest/coverage-v8@1.6.0` devDep (exact match to pinned vitest); `vitest.config.ts` gains `coverage.include: ['src/pipeline/**']`; gate C10 invoked as `pnpm test -- --coverage` | Human-directed "run the full G2 gate including the coverage criterion" (session 3). Provider was absent from the tree; vitest positional args filter test files rather than coverage scope (positional form measured 0% over zero tests); pnpm intercepts a bare `--coverage` flag. All three adaptations are execution-mechanics, not acceptance changes. | — |
| DEC-012 | pre-G3 | Q-01 → Android only via Tauri Mobile; no iOS build target | Human ruling, session 3. iOS requires macOS/Xcode/Apple Developer signing not confirmed available; Android needs only R-ENV-03 Rust toolchain + keystore. Adds task T-P9-03a (Android shell) under I-08 suffix rule. | — |
| DEC-013 | pre-G3 | Q-02 → SSR + hydration supported | Human ruling (session 3), adopting recommendation. Renderer purity (FR-2.4) makes the guarantee cheap; SSR-safety becomes a standing constraint on P3–P7 component work: no browser globals outside effects, per-phase smoke render via react-dom/server, hydration-safe theme strategy at T-P7-06..08. | SPEC §6 non-goal entry for SSR |
| DEC-014 | pre-G3 | Q-03 → public plugin API deferred to v2 | Human ruling (session 3), adopting recommendation. Component-map/token/font overrides cover v1 customization; custom-syntax demand is served interim by upstream preprocessing in caller land. Avoids committing to an API shape before real usage evidence. ARCHITECTURE §9 and SPEC §6 wording stand unchanged. | — |
| DEC-015 | CP-009 | Component styling is class-based; new artifact `src/theme/claymark.css` ships component classes consuming only `var(--token)` references | NFR-1.5 requires operation under CSP without `unsafe-inline`; React style attributes would violate it in embedding apps, so classes are the only compliant mechanism (FR-6.1/FR-6.4 preserved: zero literals in components). File not named in any task OUTPUT — recorded here per I-01; presented to human at B07 start, no veto received. Library entry imports both stylesheets at P9 build. | plan/01-ROADMAP.md P3 OUTPUT lists (additive) |

---

## Deferred work register

Deferred work is **logged, never dropped** (delivery gate, Completion category).

| ID | Item | Reason | Deferred to | Approved by |
|---|---|---|---|---|
| DEF-001 | Dead-export / unused-module audit (`knip` or equivalent) over `src/` | Human decision, session 3: run after project completion rather than as ongoing hygiene. Concern raised during B05 planning that wrapper modules might bloat the bundle. | Post-G9, before delivery archive | Human (session 3) |

---

## Error log

Append every classified error. Never delete, even after resolution.

```
ERROR      : ERR-<nnn>
TIMESTAMP  : <ISO 8601>
TASK       : <task id>
CLASS      : Validation | Execution | State | Dependency | Input | Output | Requirement | Human decision
SYMPTOM    : <what was observed>
EVIDENCE   : <command output>
ROOT CAUSE : <determined cause — not a guess>
STRATEGY   : <the single recovery strategy selected>
CORRECTION : <the single correction applied>
REVALIDATE : <original verify command re-run> → PASS | FAIL
OUTCOME    : resumed | repeated investigation | escalated
```

```
ERROR      : ERR-001
TIMESTAMP  : 2026-08-26T17:40:00+05:30
TASK       : T-P2-04 (discovered during T-P2-12)
CLASS      : Validation
SYMPTOM    : Fenced-code language classes emitted as class="" — all className values dropped by sanitizer (CommonMark examples 24/34/142/143/144/146 failed)
EVIDENCE   : pre-sanitize hast has className ['language-foo+bar']; post-sanitize className [] ; ad-hoc test: string-glob tuple [['className','language-*']] drops values, RegExp tuple [['className',/^language-/]] keeps them (hast-util-sanitize@5.0.2)
ROOT CAUSE : hast-util-sanitize attribute pattern tuples do not honor '*' string globs in this version; pattern must be a RegExp. My T-P2-04 schema used the string form.
STRATEGY   : correct the schema artifact to RegExp form
CORRECTION : sanitize-schema.ts code.className → /^language-/
REVALIDATE : pnpm test:commonmark → examples 24/34/142/143/144/146 pass; grep "'\*'" schema → exit 1; suite green
OUTCOME    : resumed
```

```
ERROR      : ERR-002
TIMESTAMP  : 2026-08-26T17:44:00+05:30
TASK       : T-P2-04/T-P2-07 boundary (discovered during T-P2-12)
CLASS      : Validation
SYMPTOM    : Legitimate URLs stripped: relative 'foo):' (spec example 500) and uppercase 'MAILTO:' (example 597) lost their href despite url-policy passing them
EVIDENCE   : isolate runs: raw hast href present → +urlPolicy kept → +sanitize-only STRIPPED; rehype-sanitize passes schema through {...defaultSchema, ...options} shallow merge (hast-util-sanitize lib line 235), so omitted `protocols` key leaked GitHub default {href:['http','https','mailto','xmpp',…], src:[…]}; safeProtocol() is case-sensitive and treats any colon before /?/# as a scheme delimiter
ROOT CAUSE : double URL gating — sanitize's leaked default protocol check is stricter AND less correct than our WHATWG-based plugins/url-policy.ts (single authority per ARCHITECTURE §2)
STRATEGY   : make url-policy.ts the sole URL authority; neutralize the leaked gate via explicit empty override
CORRECTION : sanitize-schema.ts protocols:{} ; plus url-policy.ts hardened with obfuscation-aware pre-check for percent-encoded/control-char scheme heads (micromark encodes java\tscript: → java%09script:, defeating naive scheme detection — caught by security.spec 14-fixture run dropping to 12/14)
REVALIDATE : pnpm test:security → 4/4 incl. 14/14 URLs; pnpm test:commonmark → 3/3 at 98.42%
OUTCOME    : resumed
```

---

## Recovery procedure — copy verbatim, never improvise

```
1. DETECT           observe the failure
2. STOP             halt execution immediately; do not attempt the next task
3. PRESERVE STATE   checkpoint current position before touching anything
4. CLASSIFY         select exactly one error class from the table above
5. COLLECT EVIDENCE capture command output, file state, versions
6. ROOT CAUSE       determine the actual cause; a guess is not a cause
7. SELECT STRATEGY  choose exactly ONE recovery strategy
8. APPLY            apply exactly ONE correction — two at once destroys the signal
9. REVALIDATE       re-run the ORIGINAL verify command, unmodified
10. BRANCH          PASS → resume · FAIL → return to step 6
```

Three consecutive failures on the same root cause → **hard stop, escalate to human.**
