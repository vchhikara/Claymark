# 05 — Session Management & Context Thresholds

Context exhaustion is the primary cause of drift in long agentic builds. Degradation is gradual and self-invisible: precision decays before capacity is reached, and the agent does not notice. These thresholds are therefore **mechanical**, not judgment calls.

---

## Threshold table

| Level | Context used | Name | Required action |
|---|---|---|---|
| 🟢 | 0 – 50% | Nominal | Execute normally. Full batches of 6. |
| 🟡 | 50 – 65% | Advisory | Complete the current batch. Checkpoint. Do **not** start a new phase. Do **not** start a gate. |
| 🟠 | 65 – 75% | **Switch threshold** | Finish the current **task** only. Write the handoff block. End the session. |
| 🔴 | 75 – 85% | Hard stop | Abandon the in-flight task. Record it as partial with exact resumption state. Handoff immediately. |
| ⛔ | > 85% | Critical | Emit only the handoff block. Nothing else. Do not attempt reasoning about the task. |

**The switch threshold is 🟠 65%.** Do not push into 🔴 to "just finish one more." That is precisely how the last task of a session becomes the first defect of the next.

---

## Mandatory session boundaries

Switch sessions regardless of remaining context when **any** of these occurs:

| Trigger | Rationale |
|---|---|
| A gate returns PASS | Clean boundary; phase state is fully persisted |
| A gate returns FAIL | Failure investigation needs uncontaminated context |
| A phase completes | Phase artifacts are independent of prior working context |
| Any 🟠 threshold crossing | Mechanical rule |
| Three consecutive task failures | Context is likely poisoned by failed attempts |
| A hard stop condition fires (`plan/00 §6`) | Human input required anyway |
| Sixteen consecutive tool calls without a checkpoint | Runaway detection |

---

## Cost estimate per phase

Plan session boundaries against these. Estimates are for Sonnet 5 at low effort and should be corrected with actuals after P0.

| Phase | Est. context | Recommended sessions |
|---|---|---|
| P0 | Low | 1 |
| P1 | Low | 1 |
| P2 | **High** | 2 — split at T-P2-06 |
| P3 | Medium-high | 2 — split at T-P3-06 |
| P4 | Medium | 1 |
| P5 | Medium | 1 |
| P6 | **High** | 2 — split at T-P6-08, keep the stress matrix and backtest in their own session |
| P7 | Medium | 1 |
| P8 | Medium | 1 |
| P9 | Medium | 1 |

**Total: 13 sessions minimum.** Budget 15–16 with failure recovery.

---

## Handoff block — emit verbatim at every session end

```
════════════════════ SESSION HANDOFF ════════════════════
SESSION          : <n> → <n+1>
REASON           : threshold | gate | phase-complete | hard-stop | error
CONTEXT AT END   : <percentage>

COMPLETED THIS SESSION
  <task id> — <one line> — VERIFY PASS
  ...

IN FLIGHT (partial)
  TASK           : <id or none>
  DONE SO FAR    : <exact list of files written>
  NOT YET DONE   : <exact remaining steps>
  RESUME AT      : <precise instruction, e.g. "re-run T-P2-05 from scratch">

STATE
  PHASE          : P<n>  (<cumulative>% overall)
  BATCH          : B<nn> (<x>/6)
  TASKS          : <x>/96
  GATES PASSED   : <list>
  PROJECT STATE  : <state>

BLOCKERS
  <none | issue ids | open question ids | required human decision>

NEXT SESSION MUST
  1. Read plan/00-EXECUTION-PROTOCOL.md in full
  2. Read plan/04-STATE-LEDGER.md current-state header
  3. Verify disk matches the ledger (disk is truth)
  4. Begin at <task id>

DO NOT
  <specific traps discovered this session — e.g. "do not regenerate
   src/theme/tokens.css by hand; it is emitted by T-P1-09">
═════════════════════════════════════════════════════════
```

The `DO NOT` section is the highest-value part of the handoff. It carries the hard-won knowledge that would otherwise be lost with the context. Populate it seriously.

---

## Session resumption procedure

Fixed sequence. Never skip a step, never reorder.

```
1. READ    plan/00-EXECUTION-PROTOCOL.md — in full, including §8 anti-drift invariants
2. READ    plan/04-STATE-LEDGER.md — current-state header + last checkpoint
3. READ    plan/03-CHECKLIST.md — locate the first unticked task
4. VERIFY  disk against the ledger:
             - do the OUTPUT files of the last ticked task exist?
             - do the OUTPUT files of the first unticked task NOT exist?
5. BRANCH  match    → proceed to step 6
           mismatch → classify as State error; reconstruct from disk; log; then proceed
6. READ    the current phase's section of plan/01-ROADMAP.md — that phase only,
           not the whole file
7. READ    plan/REFERENCES.md §R-DEP if the next task installs or imports anything
8. RESUME  at the task named in the handoff block
```

**Do not read the entire bundle on resume.** Loading all 16 files consumes the context the session needs to do work. Read the four state files plus the single relevant phase section. That is sufficient by construction — the plan is written so that no task requires knowledge of a phase other than its own.

---

## Context conservation rules

| Rule | Detail |
|---|---|
| **C-01** | Read files in ranges, not wholesale, once a file exceeds ~200 lines |
| **C-02** | Never re-read a file already in context this session |
| **C-03** | Never echo file contents back in a response — reference the path |
| **C-04** | Suppress verbose command output; capture only pass/fail plus the metric |
| **C-05** | Do not restate the plan; the plan is on disk and does not need repeating |
| **C-06** | Use the reporting block in `plan/00 §5` — it exists to bound output size |
| **C-07** | Do not summarize completed work beyond the one-line TASK field |
| **C-08** | Search for a symbol rather than reading the file that contains it |

---

## Drift detection — self-check at every checkpoint

Answer these five questions honestly at each checkpoint. Any "no" is a `State error` and requires a session switch.

1. Can I state the current task ID without scrolling back?
2. Does every file I wrote this session appear in a task's `OUTPUT` field?
3. Have I run the literal `VERIFY` command for every task I ticked?
4. Is the checklist tick count equal to the ledger's completed count?
5. Have I introduced any dependency, token, or file not registered in `REFERENCES.md`?

If you cannot answer confidently, you are already drifting. Switch sessions.
