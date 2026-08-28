# Sync handoff — two UI sessions need reconciling

Read this first. It supersedes nothing in `docs/UI-HANDOFF.md` (still valid for
"what is this project / how do I style things") but that file doesn't know
about the branch situation below — read this one first, then that one if you
need the component/token overview.

## The situation

Two separate Claude sessions did UI work on this repo in parallel, in two
different places, and they have not been reconciled:

**Session A — this session, in the main checkout** (`/home/vipul/My Projects/Claymark/claymark`)
- Did a large batch of uncommitted UI work directly in the working tree, then
  it got committed (by me, on request) to a new local branch **`ui-wip`**,
  commit `078474a`.
- Branched off `master` at `36467af` — **before** two other PRs landed on
  `master` (see Session B). `ui-wip` does NOT have those.
- Contents of `078474a`: `Alert.tsx`, `Button.tsx`, `Skeleton.tsx`,
  `Tooltip.tsx` (new components), `src/theme/claymark.css` theming (270-line
  diff), `src/app/main.tsx` changes, `CopyButton.tsx` edits, `ThemeToggle.tsx`
  edits, `map.tsx` edits, `useStreamingMarkdown.ts` edits, pipeline plugin
  changes, plus an experimental `scratch/shadcn-prototype/` directory (ported
  shadcn components, not wired into the app — read `scratch/shadcn-prototype/FINDINGS.md`
  for what that exploration concluded).
- **Not pushed anywhere.** Local branch only.

**Session B — a different session, in two now-merged git worktrees**
- `.claude/worktrees/optimistic-sinoussi-38bf13` → PR #1 "Wire CopyButton into
  CodeBlock for rendered code fences" (commit `4dbc049`) — merged to
  `origin/master`.
- `.claude/worktrees/objective-sinoussi-6193de` → PR #2 "Wire MermaidDiagram
  into the render pipeline" (commit `4ca408b`) — merged to `origin/master`.
- Both touch the same files Session A touched independently: `map.tsx`
  (the `pre` element adapter — CodeBlock wrapping AND Mermaid routing both
  live in `PreAdapter`), `MermaidDiagram.tsx`, `useStreamingMarkdown.ts`,
  `src/pipeline/plugins/code.ts`.
- Current `origin/master` / `master` tip: `c61f3fa` (merge of PR #2), which
  already contains both `4dbc049` and `4ca408b`.

## Why mermaid didn't render when tested on `ui-wip`

`ui-wip`'s `map.tsx` has **zero mermaid-routing code** — confirmed via
`git merge-base --is-ancestor 4ca408b ui-wip` → false. It's not a bug, it's a
missing feature: Session A's branch point predates Session B's mermaid PR.
Same risk applies to the CopyButton wiring inside `PreAdapter` — check before
assuming it's there.

## What needs to happen (do this)

1. `cd` into the **main checkout**, on `ui-wip` (`git branch --show-current`
   should say `ui-wip`, working tree should be clean — verify with
   `git status --short` before touching anything, only `.claude/` untracked is
   expected).
2. `git fetch origin`, then `git rebase origin/master`.
3. **Expect conflicts** in `src/components/map.tsx`,
   `src/components/MermaidDiagram.tsx`, `src/hooks/useStreamingMarkdown.ts`,
   `src/pipeline/plugins/code.ts` — both sides changed the same functions.
   Resolve by **merging both features**, not picking one side:
   - `PreAdapter` in `map.tsx` needs: the Mermaid short-circuit (checks
     `findMermaidSource(node)` first, returns `<MermaidDiagram source={...} />`)
     falling through to the `CodeBlock`-wrapped `Passthrough` path for
     everything else — that's the shape it already has on `origin/master`,
     so layer Session A's *additional* UI/styling changes on top of that
     shape rather than reverting it.
   - `useStreamingMarkdown.ts` on `origin/master` already has the correct
     typed fix (`DEFAULT_COMPONENTS as unknown as Components` passed to
     `toReact`) — keep that, merge in any of Session A's unrelated changes to
     the same file if there were any (check the diff; there may not be).
4. After resolving, run:
   ```bash
   npx tsc --noEmit
   npx eslint .
   ```
   Two pre-existing ESLint findings are known-unrelated (confirmed via git
   stash A/B testing in an earlier session): `MermaidDiagram.tsx` `react/no-danger`
   rule-not-found, and a `prefer-const` in `tests/useStreamingMarkdown.spec.tsx`.
   Anything beyond those two is new — fix it.
5. Manually verify in a browser: load `/home/vipul/Desktop/mermaid-examples.md`
   (or any ` ```mermaid ` fence) and confirm diagrams render, confirm the
   copy-button still appears on code fences, and check both light/dark theme
   with Session A's new styling.
6. Decide what to do with `scratch/shadcn-prototype/` — it's exploratory, not
   wired in. Ask the user whether to keep it, delete it, or actually adopt any
   of the ported components before finishing up.
7. Only after all the above is verified: ask the user before pushing `ui-wip`
   or opening a PR — don't push straight to `master` even though
   `docs/UI-HANDOFF.md` describes a no-PR workflow; this session's prior work
   went through PRs and the user hasn't said which pattern they want now.

## Dev server notes

- No `pnpm dev` script exists. Use `npx vite --mode app --port <N>` (see
  `docs/UI-HANDOFF.md` for the canonical port) or the Claude Code Browser
  pane's `preview_start` tool with a `.claude/launch.json` config — do **not**
  run two vite processes on the same port at once (happened earlier this
  session, caused a listener collision that needed manual `kill`).
- The worktrees under `.claude/worktrees/` are both already merged into
  `origin/master` — likely safe to `git worktree remove` once you've confirmed
  nothing in them is still needed, but ask the user first; don't assume.

## Reference

See `docs/UI-HANDOFF.md` for the actual UI/component/token/style guidance —
still accurate, just silent on the branch-reconciliation problem above.
