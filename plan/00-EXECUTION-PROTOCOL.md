# 00 — Execution Protocol

**Binding on: Claude Sonnet 5, low reasoning effort.** Read this file in full before any other action. Derived from `vargr-build-rules v1.0.0`.

---

## 0. Prime directive

You are executing a **pre-decided plan**, not designing one. Every architectural decision in this bundle has already been made and recorded. Your job is mechanical: select the next task, execute it exactly as written, verify it with the stated command, record the result, checkpoint, repeat.

**Determinism over creativity.** If you find yourself inventing an approach, you have left the plan. Stop and report it as a `Requirement error`.

---

## 1. Absolute rules — violation is execution failure

1. **Never assume missing information.** Search the repo, derive it from `REFERENCES.md`, or stop and ask. Never fill a gap with a plausible guess.
2. **Never skip verification.** Every task carries a `VERIFY:` command. Run it. A task without a passing verify is not complete.
3. **Never destroy information without authorization.** Rename to `*.bak` or move to `.archive/`. Never `rm` a file you did not create in the current task.
4. **Never touch unrelated systems in one batch.** One batch = one coherent concern.
5. **Never silently change direction.** Present the deviation, wait for approval, then continue.
6. **Never continue after a failed verification.** Root-cause → correct → revalidate. Never mark FAIL and move on.
7. **Never lose execution state.** Checkpoint to `plan/04-STATE-LEDGER.md` after every batch.
8. **Never ignore contradictions.** Report both sides. Do not arbitrarily pick one.
9. **Never optimize unfinished work.** Correctness precedes performance. Phase 7 exists for this reason.
10. **Never claim completion without evidence.** Evidence = command output, test count, file path, or measured number.

---

## 2. Decision hierarchy

Highest authority wins:

```
latest user instruction
  > this protocol (plan/00)
    > docs/SPEC.md
      > plan/01-ROADMAP.md
        > docs/ARCHITECTURE.md
          > plan/REFERENCES.md
            > prior recorded decisions in plan/04-STATE-LEDGER.md
              > your default behavior
```

Two sources of **equal** priority conflict → **stop and ask.** Do not resolve it yourself.

---

## 3. Batch discipline

- **Batch size: 6 tasks.** (Reduced from the vargr default of 10 for low-effort execution — smaller batches shrink the blast radius of a mis-execution.)
- **One batch per turn.** Execute all six, verify all six, checkpoint once, then stop and report.
- A batch may never straddle a phase boundary. If a phase ends at task 4 of a batch, the batch ends at 4.
- A batch may never straddle a gate. Gates are executed alone.

---

## 4. Per-task execution cycle

Fixed sequence. Never reorder, never skip:

```
SELECT      → lowest unticked task ID whose DEPS are all ticked
UNDERSTAND  → read the task's OUTPUT and ACCEPTANCE fields
READINESS   → confirm every DEPS artifact exists on disk
EXECUTE     → produce exactly the files named in OUTPUT, nothing more
SELF-REVIEW → check for placeholders, TODOs, stub returns, unused imports
VALIDATE    → run the VERIFY command verbatim
RECORD      → tick the line in plan/03-CHECKLIST.md
CHECKPOINT  → append to plan/04-STATE-LEDGER.md (at batch end)
```

Task states: `Ready → Selected → Executing → Self-Review → Validation → Accepted`
On failure: `→ Investigation → Correction → Revalidation`

---

## 5. Output format — every turn during execution

Emit exactly this block per task, nothing else. No preamble, no summary paragraph, no restating your own work.

```
TASK <id> — <one line: what you did>
VERIFY — PASS | FAIL (<command output excerpt, ≤2 lines>)
PROGRESS — checked: <checklist line ticked>
NEXT — <next task id>
```

At the end of a batch, append one checkpoint block:

```
CHECKPOINT <n> — batch <b> complete (<x>/6)
PHASE — P<n> (<weight>% · <cumulative>% overall)
STATE — <project state>
ISSUES — <none | list>
NEXT — <task id>
```

**Prohibited in execution turns:** apologies, "Great!", restating the plan, explaining what you are about to do, summarizing what you just did beyond the one-line TASK field.

---

## 6. Hard stops — not judgment calls

Stop execution immediately and surface to the human when **any** of these is true:

| Condition | Action |
|---|---|
| A gate returns FAIL twice on the same cause | Stop. Report root cause + two attempted corrections. |
| An `Undecided` scope item blocks the next task | Stop. Cite the question ID from the ledger. |
| An instruction contradicts `docs/SPEC.md` | Stop. Present both. Do not choose. |
| An action is irreversible (publish, delete, force-push) | Stop. Request explicit authorization. |
| A required input from `REFERENCES.md` is unavailable | Stop. Classify as `Dependency error`. |
| Context utilization crosses the hard threshold | Stop. Execute the handoff in `plan/05`. |
| A dependency version differs from the pin | Stop. Classify as `Input error`. Do not silently accept. |

---

## 7. Error classification → recovery

| Type | Meaning | First move |
|---|---|---|
| Validation error | Output exists but fails a verify rule | Re-read ACCEPTANCE, diff actual vs expected |
| Execution error | Work could not complete (crash, missing tool) | Check `REFERENCES.md` for the resource |
| State error | Ledger and disk disagree | Reconstruct from disk; disk is truth |
| Dependency error | Required input/approval/prior task absent | Verify DEPS ticks; escalate if genuinely absent |
| Input error | Info missing, malformed, contradictory | Stop and ask — never infer |
| Output error | Artifact incomplete or corrupted | Regenerate from scratch, do not patch |
| Requirement error | Objective became ambiguous or changed | Stop. Replan is a human decision. |
| Human decision error | Competing priorities / irreversible choice | Stop and ask |

**Universal recovery procedure — fixed sequence, never skip a step:**

```
Detect → Stop execution → Preserve state → Classify → Collect evidence
  → Determine root cause → Select ONE recovery strategy → Apply ONE correction
  → Re-run the ORIGINAL validation → passed ? resume : repeat investigation
```

Applying two corrections at once destroys the causal signal. One at a time.

---

## 8. Anti-drift invariants

These exist specifically to survive long sessions at low reasoning effort. Re-read this section at the start of every session.

- **I-01** — Every file you write lands at a path explicitly named in a task's `OUTPUT` field. If you are about to create a file not named in the plan, stop.
- **I-02** — Never edit a file outside the current task's `OUTPUT` list. Cross-file drift is the primary failure mode.
- **I-03** — Dependency versions come from `REFERENCES.md §R-DEP`. Never from memory, never from `latest`.
- **I-04** — Design tokens come from `docs/THEMING.md`. Never invent a hex value inline.
- **I-05** — No `TODO`, `FIXME`, `throw new Error('not implemented')`, or empty function body may exist at a gate. `grep -rn "TODO\|FIXME\|not implemented" src/` must return empty.
- **I-06** — Sanitization is never bypassed, never made optional, never conditionally skipped for "trusted" input.
- **I-07** — If a task's ACCEPTANCE cannot be satisfied as written, the plan is wrong. Report it; do not weaken the acceptance criterion to make it pass.
- **I-08** — Task IDs are immutable. Never renumber. If a task is added, it gets a suffix (`T-P2-04a`).
- **I-09** — Record facts only after they happen. Never pre-tick a checklist line.
- **I-10** — Never overwrite ledger history. The ledger is append-only.

---

## 9. What "done" means

A task is done when: the `OUTPUT` files exist, the `VERIFY` command exits 0, the checklist line is ticked, and no invariant in §8 is violated.

A phase is done when: every task in it is done **and** its gate in `plan/02-VERIFICATION-GATES.md` records PASS with evidence.

The project is done when: G9 records PASS and the human has explicitly accepted.
