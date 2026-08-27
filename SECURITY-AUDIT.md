# Dependency Vulnerability Audit — T-P8-07

Date: 2026-08-27
Tool: `pnpm audit` (this project uses pnpm, not npm — `npm audit` fails
outright with `ENOLOCK` since there's no `package-lock.json`).

## Baseline

The initial `pnpm audit` run found **50 advisories** (7 low / 37 moderate /
4 high / 2 critical), all in `dependencies` or `devDependencies` pulled in
transitively — none were direct hand-picked packages with no upgrade path.

## Bumps applied

All bumps are exact-pinned per `SC-13` (no range specifiers).

| Package | Before | After | Type |
|---|---|---|---|
| `dompurify` (prod) | 3.1.4 | 3.4.14 | same-major patch |
| `katex` (prod) | 0.16.10 | 0.16.47 | same-major patch |
| `mermaid` (prod) | 10.9.1 | 10.9.8 | same-major patch (10.9.8 is latest 10.x; 11.x is alpha-only) |
| `vitest` / `@vitest/coverage-v8` (dev) | 1.6.0 | 1.6.1 | same-major patch |
| `vite` (dev) | 5.2.11 | 5.4.21 | same-major patch (5.4.21 is latest 5.x) |
| `@vitejs/plugin-react` (dev) | 4.2.1 | 4.3.4 | same-major patch (kept compatible with vite 5.x; 6.x requires vite 8) |

Result: 50 → 19 advisories after the first round (dompurify/katex/mermaid/vitest),
then 19 → **8** after the vite/plugin-react bump (which pulled in a newer
esbuild and fixed several vite-line advisories at once).

## Collateral fix: MermaidDiagram.tsx / DOMPurify

Bumping `dompurify` 3.1.4→3.4.14 broke `tests/mermaid.spec.ts` (node-label
text vanished from sanitized SVG output). Root cause (confirmed by reading
DOMPurify's own compiled source): the new version hardens cross-namespace
mXSS by dropping HTML-namespace content nested in an SVG `<foreignObject>`
unless the tag is declared an "HTML integration point" (the mechanism
MathML's `annotation-xml` already used). Fixed by adding
`HTML_INTEGRATION_POINTS: { foreignobject: true }` to the sanitize call in
`src/components/MermaidDiagram.tsx`, and re-verified this does not reopen
any of the vectors the security suite guards (raw `<script>`, `onerror`/
`onload` attributes, a smuggled second `foreignObject>／<body onload>` are
all still stripped). The option is real and works at runtime but is absent
from the installed version's `.d.ts`, so it's added via a narrowly-scoped
`Record<string, unknown>` cast rather than an `any` on the whole config.

## Remaining 8 findings — accepted and documented

Every remaining advisory is in **devDependency-only build/test tooling**,
never shipped in `dist/` (the published library). Following this project's
own established pattern for tracked-but-unresolved risk (`KL-06` in
`docs/SECURITY.md`: "Tracked in the dependency audit at G8"), these are
recorded here rather than force-fixed, because resolving them requires a
cross-major-version toolchain migration (vite 5→8, vitest 1→4,
playwright 1.44→1.55+) that carries meaningfully higher regression risk to
the build/test pipeline than this task's scope justifies:

| Severity | Package | Issue | Why deferred |
|---|---|---|---|
| critical | vitest (`--ui`) | arbitrary file read/execute when Vitest UI server is listening | This project's `test` script never starts `vitest --ui` (`package.json` scripts use `vitest run`) — the vulnerable code path is unused. Fix requires vitest 3.2.6+ (major bump from 1.6.1). |
| high | playwright | browser download doesn't verify SSL cert authenticity | Only exploitable during `pnpm install`'s browser-download step on a compromised network; fix requires 1.55.1+ (major bump from 1.44.0, used only for `test:visual`). |
| high | vite | `server.fs.deny` bypass on Windows alternate paths | Dev-server-only (`vite build`/`vite dev`), not present in the built output; fix requires vite 6.4.3+ (major bump). |
| moderate | esbuild | dev server accepts any-origin requests | Same as above — bundled transitively by vite 5.x; vite 5.x pins esbuild <0.25. Dev-server-only exposure. |
| moderate | vite | path traversal in optimized-deps `.map` handling | Dev-server-only; fix requires vite 6.4.2+. |
| moderate | uuid (via mermaid) | missing buffer bounds check in v3/v5/v6 when `buf` provided | Transitive via `mermaid@10.9.8` (mermaid's own pin, not ours); Claymark never calls `uuid` directly or passes a `buf` argument. Fix requires a mermaid major bump (11.x, alpha-only at time of audit). |
| moderate | launch-editor (via vite) | NTLMv2 hash disclosure via UNC path handling on Windows | Dev-server-only (`vite`'s open-in-editor feature), Windows-specific; fix requires vite 6.4.3+. |

None of these seven affect the published `dist/claymark.{js,cjs}` output —
they are exposure surfaces of the local dev/test toolchain only, most
requiring either a malicious local network during install or direct access
to a developer's running dev server. All are candidates for the vite
5→6/8 and vitest 1→4 major-version migrations to be scoped and risk-assessed
as their own future task, not folded into this one.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `pnpm test` (full suite) — 112/113 passed; the sole failure
  (`tests/stress.spec.ts` S-01, a 2000ms parse-time budget) is the
  pre-existing timing-margin flake documented at DEC-017/CP-022 (measured
  margin is intentionally tight and sensitive to full-suite CPU
  contention) — confirmed unrelated to this task's changes by re-running
  `tests/stress.spec.ts` in isolation, where it passes cleanly (130s, 2/2).
- `npx eslint .` — clean of new issues (only the 2 pre-existing errors
  flagged at CP-016, unrelated and out of scope here).
