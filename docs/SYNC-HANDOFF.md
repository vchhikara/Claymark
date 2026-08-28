# Sync handoff — rebase done, verify + decide next steps

Read this first, then `docs/UI-HANDOFF.md` for component/token/style
conventions if you need them. This file describes what the *previous* session
did and exactly what's still open — it supersedes the branch-conflict
situation described in earlier versions of this file (that conflict is now
resolved, see below).

## Where things stand right now

- Repo: `/home/vipul/My Projects/Claymark/claymark`
- Branch: **`ui-wip`**, working tree clean, `git status --short` empty.
- `ui-wip` has been **rebased onto `origin/master`** (tip `c61f3fa`). New tip:
  commit `5c53924` "WIP: UI theming, CopyButton updates, Alert/Button/Tooltip/
  Skeleton, shadcn prototype" (same message as before the rebase — content is
  the rebased/conflict-resolved version).
- **Not pushed anywhere.** Local branch only. Do not push or open a PR without
  asking the user first — see "What's still open" below.
- `master` locally is stale (`36467af`, 4 commits behind `origin/master`) —
  harmless, just hasn't been fast-forwarded locally. Not blocking anything.

## What the rebase merged

Two independent lines of work, now combined on `ui-wip`:

1. **This session's own UI-theming work** (originally committed as `078474a`
   before the rebase): `Alert.tsx`, `Button.tsx`, `Skeleton.tsx`, `Tooltip.tsx`
   (new components), `src/theme/claymark.css` theming, `CopyButton.tsx`
   (Button/Tooltip-based rewrite), `ThemeToggle.tsx`, pipeline plugin changes,
   plus an experimental `scratch/shadcn-prototype/` directory (not wired into
   the app — see its `FINDINGS.md`).
2. **Two already-merged `origin/master` PRs** (mermaid + copy-button wiring
   into the render pipeline) that had landed on `master` after `ui-wip`
   originally branched off it.

### Conflict resolution detail (for anyone auditing the merge)

Four files conflicted; all resolved by combining both sides, not picking one:

- **`src/hooks/useStreamingMarkdown.ts`** — kept origin/master's typed
  `DEFAULT_COMPONENTS as unknown as Components` cast (correct typing) *and*
  this session's `hydrateCodeHighlighting`/`hasPendingCode` background
  hydration logic (needed for the code-skeleton → Shiki swap). Both halves
  now coexist; `components` (the typed cast) is used in the `toReact` call
  inside the hydration-aware `useMemo`.
- **`src/components/map.tsx`** — `PreAdapter` now does both: the Mermaid
  short-circuit (`findMermaidSource(node)` → `<MermaidDiagram source={...}
  />`) from origin/master, falling through to a `pre` element that carries
  `data-code-pending`/inline `min-height` passthrough (from this session's
  skeleton-CLS-guard logic) wrapped in `<CodeBlock>`. Single `pre:` entry in
  `DEFAULT_COMPONENTS` now calls this merged `PreAdapter`.
- **`src/components/CopyButton.tsx`** — kept this session's `Button`/
  `Tooltip`-based version wholesale (strict superset of the plain-`<button>`
  version on origin/master — same `handleClick`/`legacyCopy` logic, better
  component wiring).
- **`src/theme/claymark.css`** — no actual rule conflicts, just adjacent
  insertions (this session's `.claymark-codeblock*`/`.claymark-copy-button*`
  rules concatenated with origin/master's Shiki light/dark token rules and
  `.claymark-code-figure`). Both blocks kept verbatim.

## Verification done this session

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint .` → **7 errors, all pre-existing/known, 0 new**:
  - `MermaidDiagram.tsx` `react/no-danger` — rule definition not found
    (eslint config gap, not a real violation). Appears 3x (main tree +
    2 stale `.claude/worktrees/*` copies).
  - `tests/useStreamingMarkdown.spec.tsx` `prefer-const` on `lengths` —
    pre-existing, confirmed via git stash A/B testing in an earlier session.
    Appears 3x (same reason as above).
  - `src/hooks/useStreamingMarkdown.ts` `react-hooks/exhaustive-deps` — rule
    definition not found (same eslint-plugin-not-registered class as the
    `react/no-danger` finding). **Verified pre-existing**: this exact
    `eslint-disable-next-line` comment was already present in the original
    `078474a` commit before the rebase (`git show 078474a:src/hooks/
    useStreamingMarkdown.ts` confirms), so the rebase didn't introduce it.
  - None of the three represent a real code defect — all three are eslint
    config/plugin-registration gaps in this repo's `eslint.config.*`, not
    violations of an active rule. Worth fixing the config at some point but
    out of scope for this rebase.
- Manual browser verification: **started but not completed** — see below.

## What's still open (do this next)

1. **Finish manual browser verification.** A previous attempt hit friction
   getting the Browser pane's `preview_start`/`navigate` tools to agree on a
   port (vite kept landing on its default `5173` instead of the configured
   `5190`, and stray vite processes from earlier sessions needed killing —
   see "Dev server notes" below). The app **did** load successfully at
   `http://localhost:5173` and rendered correctly (theming, code blocks with
   working Copy button, tables, all visibly correct in a screenshot). What's
   NOT yet confirmed: an actual `mermaid` fence rendering as a diagram (a
   paste was in progress into the editor textarea when this was interrupted
   — nothing broken, just unfinished). To finish: open the app, click "Paste
   your own Markdown", paste a ` ```mermaid ` fence, confirm it renders as a
   diagram (not raw text or an error), and check both light/dark theme via
   the moon/sun toggle in the header.
2. **Decide what to do with `scratch/shadcn-prototype/`** — exploratory,
   not wired into the app. Ask the user: keep it, delete it, or adopt parts
   of it. Not yet asked.
3. **Ask the user before pushing `ui-wip` or opening a PR.** Don't push
   straight to `master` even though `docs/UI-HANDOFF.md` describes a no-PR
   workflow — this session's prior work went through PRs (see the two merged
   PRs above) and the user hasn't said which pattern they want now.
4. Optionally: clean up the stale `.claude/worktrees/optimistic-sinoussi-*`
   and `.claude/worktrees/objective-sinoussi-*` directories — both PRs they
   correspond to are already merged into `origin/master`. Ask the user before
   removing (`git worktree remove`).

## Dev server notes (read before starting one)

- No `pnpm dev` script exists. Two ways to run it:
  - `npx vite --mode app --port <N>` directly via Bash.
  - The Browser pane's `preview_start` tool with `.claude/launch.json`
    (`configurations[0].name === "claymark-app"`, configured port `5190`,
    `autoPort: true`).
- **Known friction this session:** `preview_start({name: "claymark-app"})`
  sometimes reports success but the tab never actually navigates (shows a
  blank/non-http page); when that happens, check `ps aux | grep vite` — stray
  vite processes from earlier sessions/dev-server restarts pile up and cause
  port collisions (`autoPort` then silently falls back to vite's own default
  `5173` instead of the configured `5190`). Fix: `pkill -f "vite --mode app"`
  to clear everything, then retry `preview_start`; if the pane still shows a
  blank tab, use `preview_start({url: "http://localhost:<port from
  preview_logs>"})` directly against whatever port vite actually bound to
  (check via `preview_logs` on the serverId, or `ps aux`/`curl` from Bash).
- Do **not** run two vite processes on the same port at once.

## Reference

- `docs/UI-HANDOFF.md` — component/token/style conventions, how to run dev,
  verification commands. Still accurate.
- `docs/HANDOFF.md` — the original v1.0.0 delivery handoff (pre-UI-work,
  from an earlier phase of the project — P9/G9 gate acceptance). Historical;
  not about the current UI branch work.
- `docs/PROJECT-INDEX.md` — file-level import/export map, regenerate command
  included at the top of that file. Regenerated alongside this handoff.
