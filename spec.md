# Claymark — specification (canonical summary)

This file is the project-root canonical spec required by the vargr-build-rules
executor protocol. It is a pointer + summary, not a replacement for the
detailed contract: **[docs/SPEC.md](docs/SPEC.md) remains the authoritative
functional/non-functional specification.** Where the two disagree, `docs/SPEC.md`
wins.

## What it is

`claymark` is a Markdown rendering engine for React, purpose-built to safely
render streamed, untrusted LLM output: CommonMark+GFM, syntax-highlighted
code, KaTeX math, Mermaid diagrams, and tables, under a strict sanitization
boundary (no raw HTML execution, allow-listed URL schemes, zero runtime
network requests). Ships as an npm library, an installable PWA, and Tauri
desktop binaries.

## Project history (two delivery phases)

1. **v1.0.0 core delivery** — executed under the plan-driven process in
   `plan/` (`00-EXECUTION-PROTOCOL.md` … `05-SESSION-MANAGEMENT.md`), tracked
   task-by-task in `plan/03-CHECKLIST.md` and `plan/04-STATE-LEDGER.md`.
   104/104 planned tasks complete, gates G0–G8 passed with recorded evidence.
   The one item never closed: **GATE G9, human acceptance** — see
   `docs/HANDOFF.md`. Disclosed gaps at that point: `plan/04-STATE-LEDGER.md`
   "Deferred work register", `DEF-001`…`DEF-008`.
2. **`ui-wip` UI-polish phase** (current) — a second, git-tracked phase on
   branch `ui-wip`, not merged to `master`/`origin`, not pushed. Adds
   shadcn/ui-derived primitives (`Alert`, `Button`, `Skeleton`, `Tooltip`),
   reworks `CopyButton`, wires Mermaid into the render pipeline, and iterates
   on the reader-app shell and type/color tokens. See `docs/SYNC-HANDOFF.md`
   and `docs/PROJECT-INDEX.md` for the file-level detail.

## Objective for this pass (this session, vargr-build-rules executor)

Bring the project to a **consistent, fully verified, evidence-backed state**
on `ui-wip` — dependency/build health, a green test/type/lint/build sweep,
and the outstanding uncommitted work reconciled into clean commits — and
produce the canonical `progress.md`/`ledger.md` this file accompanies.

**Scope — Included:** dependency/lockfile drift, TypeScript/build health,
committing the pre-existing working-tree changes, full verification sweep,
canonical-file authoring.

**Scope — Excluded (logged, not attempted, this pass):** integrating the
remaining shadcn-derived components (`Dialog`/`Table`/`Badge`/`Separator`/
`ScrollArea`/`Menubar`/`Toast`) sitting in `scratch/shadcn-prototype/`;
pushing `ui-wip` or opening a PR; `plan/03-CHECKLIST.md`'s GATE G9 human
acceptance of v1.0.0; closing `DEF-001/003/005/006/007/008`; macOS/Windows
desktop cross-builds; removing the stale `.claude/worktrees/*` copies; the
dark-mode/token-drift and typography-vs-`docs/SPEC.md` disclosures raised in
this session's `ledger.md`.

**Scope — Undecided:** whether the typography/color changes landed in this
session's "UI polish" commit should be reconciled into `docs/SPEC.md` (a
product-copy decision, not an engineering one) — flagged, not resolved.

## Delivery gate — status against the lock

| Requirement | Status |
|---|---|
| Completion | v1.0.0 substantially complete (see above); `ui-wip` polish ongoing, not itself a delivery unit |
| Validation | `pnpm tsc --noEmit` 0 errors · `pnpm lint` 7 known pre-existing errors, 0 new · `pnpm test` 355/355 · `pnpm build`/`build:app` exit 0 — see `ledger.md` |
| Artifacts | `spec.md`, `progress.md`, `ledger.md` (this triad) now present at root |
| Documentation | `docs/SYNC-HANDOFF.md`/`docs/PROJECT-INDEX.md` describe `ui-wip` as-built; `docs/SPEC.md`'s typography numbers are now stale against `ui-wip`'s token changes — disclosed, not fixed, in `progress.md` |
| Traceability | this session's changes recorded as two commits on `ui-wip`, each with rationale in the message; full detail in `ledger.md` |
| Operational readiness | unchanged from v1.0.0 (`docs/INSTALLATION.md`); no new configuration surface added |
| Handoff | `progress.md` lists exactly what remains and for whom (human decision vs. executable task) |
