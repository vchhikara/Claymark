# HANDOFF — claymark v1.0.0

Prepared at T-P9-08, immediately before Gate G9 (final human acceptance). This document is the single entry point for a human reviewing the delivery.

---

## 1. What this is

`claymark` — a Markdown rendering engine for React, purpose-built for streamed, untrusted LLM output. See `SPEC.md §1` for the full product statement and `SPEC.md §7` for the acceptance criteria this delivery is measured against.

## 2. What shipped

See `CHANGELOG.md` `[1.0.0]` for the authoritative, as-built feature list. In summary: CommonMark + GFM parsing, streaming with monotonic partial rendering, KaTeX math, Mermaid diagrams, a 34-language Shiki highlighter, a fully overridable component map, a three-layer theme-token system, and three packaged artifacts (npm library, installable PWA, Tauri desktop binaries for macOS/Windows/Linux).

**Explicitly not shipped**, despite appearing in earlier planning drafts (`CHANGELOG.md`'s "Not included" section, `SPEC.md` FR-5.1/FR-6.2/FR-6.3): the image lightbox modal, the exported LRU cache API, and runtime token/font overrides. Each is disclosed rather than silently dropped, with the as-built gap noted at the exact requirement it fails to satisfy.

## 3. Verification evidence

| Area | Result | Where recorded |
|---|---|---|
| Type check | 0 errors | `plan/04-STATE-LEDGER.md` CP-034/CP-035, this session's `tsc --noEmit` runs |
| Lint | 2 known pre-existing errors (`DEF-004`), no regressions | `plan/04-STATE-LEDGER.md` DEF-004 |
| Unit + integration suite | 117/118 passing; 1 known-flaky stress assertion (`DEF-005`, S-01) | `plan/04-STATE-LEDGER.md` DEF-005, this session's `vitest run` output |
| Library build | `pnpm build` — `dist/claymark.js` (282.65 kB, gzip 71.75 kB), `dist/claymark.cjs` (176.91 kB, gzip 54.23 kB), `.d.ts` | this session |
| PWA build | `pnpm build:app` — `dist/app/*`, service worker present | this session |
| Desktop binary | `pnpm tauri build` re-run at version 1.0.0 (prior artifacts were stale at 0.1.0) | `desktop/target/release/bundle/` |
| Security | XSS corpus, sanitizer schema, CSP compatibility — `bench/results/security-final.json` | `SECURITY.md` |
| Backtest | 250-document corpus, `bench/results/backtest.json`, baselines in `bench/results/backtest-baseline/` | `SPEC.md §7.4` |
| Stress matrix | `bench/results/stress.json`, S-01…S-12 | `SPEC.md §7.5`, `DEF-005` |
| Gates | G0–G8 recorded PASS with evidence; G9 pending this handoff | `plan/03-CHECKLIST.md` |

## 4. Known limitations and residual risk

Full disclosure in `SECURITY.md §4` (KL-01 through KL-06) and `CHANGELOG.md`'s "Known limitations" / "Not included" / "Deferred" sections. Nothing here is hidden; every item has an owner (a decision ID, a deferred-work ID, or a target version).

## 5. Deferred work

All deferred items are logged with an ID, reason, and target in `plan/04-STATE-LEDGER.md`'s "Deferred work register" (`DEF-001` through `DEF-008`). Two categories:

- **Previously human-approved deferrals** (`DEF-005` via `DEC-019`, `DEF-007` via the G8 acceptance at `CP-026`).
- **Self-logged this delivery cycle** (`DEF-002`, `DEF-003`, `DEF-004`, `DEF-006`, `DEF-008`) — flagged explicitly for human review as part of this G9 acceptance request, since they were never previously put in front of a human as a formal deferral.

## 6. Operational readiness

Install, upgrade, and rollback procedures: `INSTALLATION.md §1–6`. Configuration: `INSTALLATION.md §5` (currently zero runtime configuration surface — see the as-built notes there and in `API.md`). Troubleshooting: `INSTALLATION.md §7`.

## 7. What acceptance means

Accepting this delivery at Gate G9 means accepting the product **as built and as disclosed above** — including the four not-included items and the two open deferrals not yet reviewed by a human. It does not require any of those to be fixed first; `SPEC.md §7.8` requires only that "a human explicitly accepts delivery," which this document exists to make an informed decision.
