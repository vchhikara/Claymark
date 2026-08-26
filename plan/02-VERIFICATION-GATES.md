# 02 — Verification Gates

Every phase terminates in a gate. A gate is a **separate, isolated turn** — never bundled with implementation tasks.

---

## Gate outcomes

Exactly three outcomes exist. There is no fourth.

| Outcome | Meaning | Permitted action |
|---|---|---|
| **PASS** | All criteria met, evidence recorded | Proceed to the next phase |
| **CONDITIONAL PASS** | Minor deficiency only | Proceed **only if** the deficiency is documented in the ledger, a corrective task is created with an ID, and no downstream phase depends on the deficient part. Exceptional, not routine. |
| **FAIL** | A required output is missing or a validation failed | Do **not** proceed. Return to this or an earlier phase. |

**Gates G2 and G9 cannot return CONDITIONAL PASS.** G2 is the security boundary; G9 is release authorization. Both are binary.

---

## Gate execution procedure

```
1. Confirm every task in the phase is ticked in plan/03-CHECKLIST.md
2. Run the gate's verification commands, in order, verbatim
3. Capture output — actual numbers, not "looks good"
4. Compare each result against its threshold
5. Record the outcome block in plan/04-STATE-LEDGER.md
6. PASS → advance · CONDITIONAL → log deficiency + corrective task ID · FAIL → stop
```

**Gate outcome block format:**

```
GATE G<n> — <PASS|CONDITIONAL PASS|FAIL>
CRITERIA — <met>/<total>
EVIDENCE — <command>: <actual value> (threshold: <value>)
DEFICIENCIES — <none | id: description | corrective task id>
DECISION — <advance to P<n+1> | return to P<n> | halt for human>
```

---

## The three verification classes

Every gate draws from three distinct classes. They are **not** interchangeable and one never substitutes for another.

### Class 1 — Development unit checks
Fast, deterministic, per-task. Type-check, lint, unit tests, fixture assertions. Run continuously.
*Answers: does this unit behave as specified?*

### Class 2 — Stress testing
Adversarial and volumetric. Pathological input, resource exhaustion, concurrency, malformed data, sustained load.
*Answers: does it hold under conditions the author did not imagine?*

### Class 3 — Historical corpus backtesting
Replay of a frozen corpus of real historical documents against locked baseline snapshots. This is the analogue of financial backtesting: the corpus is the historical series, the snapshots are the expected returns, and any divergence is a regression that must be explained or reverted.
*Answers: has behavior on known-good real-world input changed without our intending it?*

---

## Gate definitions

### G0 — Initialization
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Runtime matches pin | `node -v` | Exact match with `.nvmrc` |
| 2 | Lockfile reproducible | `pnpm install --frozen-lockfile` | Exit 0 |
| 3 | Zero range specifiers | `grep -cE '"[\^~]' package.json` | 0 |
| 4 | Type-check clean | `pnpm tsc --noEmit` | Exit 0, 0 errors |
| 5 | Build succeeds | `pnpm build` | Exit 0 |
| 6 | Test runner operational | `pnpm test` | Exit 0 |
| 7 | Lint clean | `pnpm lint` | 0 errors, 0 warnings |
| 8 | Source skeleton present | `test -f src/index.ts` | Exit 0 |

**CONDITIONAL PASS allowed:** yes, for criterion 7 warnings only.

---

### G1 — Asset Discovery & Tokens
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Zero proprietary font binaries | `find public/fonts -name "Anthropic*"` | Empty |
| 2 | Every vendored font licensed | Compare `*.woff2` count to license entries | Equal |
| 3 | Neutral ramp complete | Token export count | Exactly 12 |
| 4 | Dark map total | Every semantic key has a dark counterpart | 100% |
| 5 | No orphan hex literals | `grep -rnE '#[0-9a-fA-F]{6}' src/ --exclude-dir=theme` | Empty |
| 6 | CSS var parity | Emitted var count vs token export count | Equal |
| 7 | Measure token correct | `measure` value | `48rem` |
| 8 | Body metrics correct | `body.fontSize`, `body.lineHeight` | `20px`, `1.4` |

---

### G2 — Core Pipeline · **SECURITY GATE · BINARY**
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | CommonMark conformance | `pnpm test:commonmark` | **≥ 98.0%** |
| 2 | XSS corpus | `pnpm test:security` | **100%** — no exceptions |
| 3 | No script nodes emitted | Scan output hast for `script` | 0 across all fixtures |
| 4 | No event-handler attributes | Scan output for `on*` attributes | 0 |
| 5 | URL policy enforced | 14 malicious-URL fixtures | 14/14 neutralized |
| 6 | External link hardening | `rel` on external anchors | `noopener noreferrer` on 100% |
| 7 | No `dangerouslySetInnerHTML` | `grep -rn "dangerouslySetInnerHTML" src/` | Empty |
| 8 | Sanitizer unbypassable | Static trace of all output paths | Every path traverses sanitize |
| 9 | GFM features | Table, strikethrough, task list, autolink fixtures | All pass |
| 10 | Coverage on pipeline | `pnpm test --coverage src/pipeline` | ≥ 90% branch |

**CONDITIONAL PASS: NOT AVAILABLE.** Any single failure is FAIL.

---

### G3 — Component Mapping
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Node coverage | Every emitted node type has a mapped component | 100% |
| 2 | Snapshot stability | Run visual snapshots 3× | Byte-identical |
| 3 | Dark parity | Snapshot both themes | Both stable |
| 4 | Measure enforced | Computed `max-width` on root | `48rem` |
| 5 | Heading scale monotonic | Computed sizes h1→h6 | Strictly descending |
| 6 | Body metrics | Computed on `p` | 20px / 28px |
| 7 | Nesting depth | 3-level list fixture | Distinct markers per level |
| 8 | **Open questions resolved** | `Q-01`, `Q-02`, `Q-03` in ledger | All marked RESOLVED |

Criterion 8 requires a **human decision**. The gate cannot pass without it.

---

### G4 — Code Blocks
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Highlight determinism | Same input, 3 runs | Identical token output |
| 2 | Language coverage | Every registry language renders | 100% |
| 3 | Unknown language | `notalanguage` fence | Plain `pre`, no throw |
| 4 | Copy fidelity | Clipboard content vs source | Byte-identical |
| 5 | Copy fallback | With `navigator.clipboard` undefined | Succeeds |
| 6 | Line highlighting | Meta `{1,3-5}` | Exactly lines 1,3,4,5 |
| 7 | Bundle boundary | Initial chunk manifest | Contains no Shiki chunk |
| 8 | No hydration shift | Measure CLS on code block | 0 |

---

### G5 — Math & Diagrams
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Inline + display math | Fixtures render | Both correct |
| 2 | Malformed TeX fails closed | `$\frac{$` | Error text, no throw |
| 3 | Security not regressed | Re-run G2 criterion 2 | Still 100% |
| 4 | Zero CDN references | `grep -rn "cdn\|https://unpkg\|jsdelivr" src/` | Empty |
| 5 | Mermaid strict mode | Config inspection | `securityLevel: 'strict'`, `htmlLabels: false` |
| 6 | SVG sanitized | SVG XSS fixture | Neutralized |
| 7 | Invalid diagram fails closed | Broken syntax | Renders as code block, no crash |
| 8 | Lazy boundary | Initial chunk manifest | Contains no Mermaid, no KaTeX |

---

### G6 — Streaming & Performance · **VALIDATION GATE**

Requires **all three verification classes**. Passing unit checks alone is not sufficient.

**Unit criteria**
| # | Criterion | Threshold |
|---|---|---|
| 1 | Partial-construct detection | 24/24 fixtures |
| 2 | Segment integrity | Never splits inside a fence |
| 3 | Tail reparse locality | ≤1 block reparsed per appended token |
| 4 | LRU eviction | Entry 101 evicts entry 1 |
| 5 | Cache hit identity | Returns identical reference |
| 6 | Fast path | Plain string bypasses processor |

**Stress matrix (Class 2)** — every cell must complete without crash, unhandled rejection, or budget breach.

| ID | Scenario | Input | Budget |
|---|---|---|---|
| S-01 | Large document | 5 MB Markdown | Parse < 2000 ms, no OOM |
| S-02 | Deep nesting | 500-level nested list | No stack overflow |
| S-03 | Pathological emphasis | 10k unmatched `*` | Parse < 500 ms |
| S-04 | Wide table | 1000 columns × 1000 rows | Renders, page has no horizontal overflow |
| S-05 | Fence bomb | 5000 code fences, mixed languages | Lazy load holds, no jank > 50 ms |
| S-06 | Streaming chaos | 1-char chunks, 100k chunks | Monotonic render, zero flicker |
| S-07 | Streaming truncation | Cut mid-fence, mid-table, mid-link | Degrades gracefully, no throw |
| S-08 | Rapid theme thrash | 1000 toggles in 10 s | No leak, no unmount storm |
| S-09 | Cache soak | 10k distinct documents | Memory stays under ceiling |
| S-10 | Unicode adversarial | RTL overrides, zero-width, combining marks, emoji ZWJ | No mojibake, no injection |
| S-11 | Concurrent renders | 50 simultaneous instances | No cross-instance state bleed |
| S-12 | Math bomb | 1000 display equations | Lazy load holds, < 3000 ms |

**Historical corpus backtest (Class 3)**

The corpus is a frozen set of **≥250 real-world Markdown documents** captured before implementation began and never modified thereafter. Composition is fixed:

| Segment | Count | Purpose |
|---|---|---|
| Long-form technical prose | 60 | Typography, measure, heading rhythm |
| Code-heavy documents | 50 | Highlighting breadth, copy behavior |
| Mathematical papers | 30 | KaTeX coverage |
| Diagram-bearing documents | 20 | Mermaid coverage |
| Table-heavy documents | 30 | Overflow and alignment |
| Mixed-content chat transcripts | 40 | Realistic composite load |
| Adversarial / malformed | 20 | Graceful degradation |

Procedure:
```
1. Render all 250 documents at the frozen baseline commit → store snapshots
2. Re-render at the current commit
3. Diff snapshot-by-snapshot
4. For every diff: classify as INTENDED (cite the task ID that caused it)
                            or REGRESSION (revert or correct)
5. PASS requires: zero unexplained diffs AND zero regressions
```

Backtest is re-run at **G6, G7, and G8**. A change that passes unit tests but shifts corpus output is exactly the class of defect this gate exists to catch.

---

### G7 — UI Behaviors & Optimization
| # | Criterion | Threshold |
|---|---|---|
| 1 | Table overflow contained | Page never gains horizontal scroll |
| 2 | Image CLS | 0 |
| 3 | Lightbox focus trap | Tab cycles within dialog; Escape restores focus to trigger |
| 4 | Theme propagation | System change without remount |
| 5 | Theme persistence | Survives reload; manual overrides system |
| 6 | No theme flash | Zero light frames on dark cold load |
| 7 | **No regression** | G2, G4, G5, G6 evidence all still valid |
| 8 | Backtest re-run | Zero unexplained diffs |

---

### G8 — Accessibility & Hardening
| # | Criterion | Command | Threshold |
|---|---|---|---|
| 1 | Automated a11y | `pnpm test:a11y` (axe-core) | 0 violations |
| 2 | Contrast, both themes | `pnpm test:contrast` | Body ≥ 4.5:1, large ≥ 3:1 |
| 3 | Accessible names | Every interactive control | 100% named |
| 4 | Keyboard reachability | Scrollable regions | All reachable |
| 5 | Text alternatives | Math + diagrams | 100% |
| 6 | Reduced motion | Query honoured | All transitions suppressed |
| 7 | Dependency audit | `pnpm audit --audit-level=high` | 0 unresolved |
| 8 | Security re-run | Full suite | 100%, no regression |
| 9 | Backtest re-run | Corpus replay | Zero unexplained diffs |
| 10 | Docs match as-built | Manual reconciliation | Every control has a passing test |

---

### G9 — Completion · **RELEASE GATE · BINARY · HUMAN AUTHORITY**

Organized by the vargr delivery-gate categories. Do not skip an item because it looks obvious — the checklist exists precisely to catch what looks obvious.

**Completion** — every objective has a supporting deliverable; deferred work is explicitly logged, never silently dropped.
**Validation** — every prior gate recorded PASS; nothing bypassed, overridden, or waived.
**Artifacts** — library bundle (ESM + CJS + types), PWA build, Tauri binary, docs set. Correctly named, no placeholders, no temp files, no `.bak` residue.
**Documentation** — every file in `docs/` matches as-built behavior; every reference resolves; operational and recovery procedures written down.
**Traceability** — every deliverable maps to an objective; every significant decision recorded in the ledger; all validation evidence preserved.
**Operational readiness** — install, configure, upgrade, and rollback procedures documented; known limitations and residual risks disclosed in writing.
**Handoff** — summary produced, handoff document prepared, archive assembled, **explicit user acceptance requested and received**.

| # | Criterion | Threshold |
|---|---|---|
| 1 | All gates G0–G8 | PASS recorded with evidence |
| 2 | All 96 tasks | Ticked with evidence |
| 3 | Placeholder scan | `grep -rn "TODO\|FIXME\|not implemented" src/` empty |
| 4 | Version consistency | `package.json`, `Cargo.toml`, `manifest.json`, `CHANGELOG.md` agree |
| 5 | Artifact set | All four build outputs exist and launch |
| 6 | Doc examples | Every documented example executes as written |
| 7 | Deferred work | Logged with IDs, not dropped |
| 8 | **Human acceptance** | Explicitly granted |

**Criterion 8 cannot be self-approved under any circumstance.**
