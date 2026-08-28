# D5 — Findings: hand-porting shadcn/ui onto Claymark tokens

Prototype scope: `scratch/shadcn-prototype/` — **Batch 1**: Button, Dialog, Table.
**Batch 2**: Tooltip, Badge, Alert, Sonner (toast), Skeleton, Separator, ScrollArea, Menubar.
Not integrated into the live app — see plan at `/home/vipul/.claude/plans/moonlit-crafting-pnueli.md`.

## Verdict summary — Batch 1

| Component | New CSS needed | Verdict |
|---|---|---|
| **Button** | Yes — `.pb-button` rules in `prototype.css`, built from `tokens.css` | **Clean port** |
| **Table** | Minor — reuses `.claymark-table`/`.claymark-th`/`.claymark-td` as the base, plus a small `.pb-table` override to switch from Claymark's full-grid borders to shadcn's horizontal-rules-only convention | **Clean port** — the existing classes did the heavy lifting; only the border pattern needed a UI-table-specific override |
| **Dialog** | Yes — `.pb-dialog-*` rules, mirrors the existing `.claymark-lightbox-*` pattern | **Clean port**, Radix behavior (focus trap, ESC, portal, focus return) fully intact after one fix (below) |

**Bottom line: yes, shadcn/ui components can be hand-ported onto Claymark's existing token system with no Tailwind added.** All three components pass full functional validation (see below). The styling layer is a straightforward transcription once two token quirks (below) are understood.

## Verdict summary — Batch 2

| Component | New CSS needed | Verdict |
|---|---|---|
| **Badge** | Yes — `.pb-badge` + 4 variant selectors | **Clean port** — no Radix primitive involved, pure markup/style transcription. `asChild` (link-as-badge) intentionally dropped as unused by this demo — see `ported-badge.tsx` comment. |
| **Alert** | Yes — `.pb-alert`/`.pb-alert-title`/`.pb-alert-description` + destructive variant | **Clean port** — no Radix primitive, `role="alert"` preserved for a11y |
| **Skeleton** | Yes — `.pb-skeleton` + `prefers-reduced-motion` guard | **Clean port** — trivial component, one pulse animation |
| **Separator** | Yes — `.pb-separator` (horizontal/vertical) | **Clean port**, real `Separator` Radix primitive kept. Deliberately given no shared styling with the existing `Rule.tsx` (a markdown `<hr>`) — different job (UI-chrome divider vs. prose rule). |
| **Tooltip** | Yes — `.pb-tooltip`/`.pb-tooltip-arrow` | **Clean port**, real `Tooltip` Radix primitive kept (hover delay, ESC-dismiss, positioning, portal). Reuses `--z-lightbox` (only z-index token in `tokens.css`) since no dedicated tooltip layer token exists. Verified live: hover trigger renders the portal content correctly. |
| **ScrollArea** | Yes — `.pb-scroll-area*` (root/viewport/scrollbar ×2 orientations/thumb) | **Clean port**, real `ScrollArea` Radix primitive kept. Explicitly *not* a replacement for `.claymark-table-scroll` (native overflow + CSS scroll-shadow) — different problem (custom scrollbar vs. directional-hint native scroll), kept as a distinct component. |
| **Menubar** | Yes — `.pb-menubar*` (root/trigger/content/item/checkbox-item/separator/shortcut) | **Clean port for the ported subset.** Only Root/Menu/Trigger/Portal/Content/Item/CheckboxItem/Separator/Shortcut were ported — Group/RadioGroup/RadioItem/Label/Sub/SubTrigger/SubContent were **not** (out of scope for the demo's needs). Verified live: trigger opens content with correct ARIA (`role="menu"`, `aria-expanded`), checkbox item toggles `aria-checked` and closes the menu on click (real Radix behavior). lucide-react's Check/ChevronRight/Circle icons swapped for plain glyphs (✓/›/●), matching the icon-avoidance call already made for Dialog's close button. |
| **Sonner (toast)** | Yes — `.pb-toast-viewport`/`.pb-toast` + 3 variants | **Not a port — a documented deviation.** shadcn's `sonner` wraps the standalone `sonner` npm package (its own animation/stacking engine) plus Next.js-specific `next-themes`; there is no Radix primitive to preserve, so the batch's "keep primitive, replace styling" recipe doesn't apply. Built `ported-toast.tsx` instead: a small React Context + `createPortal` + `setTimeout` auto-dismiss toast, exposing a sonner-like call API (`toast(msg)`/`.success()`/`.error()`) so call sites read the same. Verified live: clicking "Success toast" renders a `data-variant="success"` toast with the correct message via `document.querySelector`. |

**Bottom line for Batch 2: 7 of 8 components hand-port cleanly with the same recipe as Batch 1.** The one exception (Sonner/toast) isn't a fit at all for the recipe — it's the first component in either batch with no Radix behavior underneath the Tailwind styling, so it required a from-scratch minimal implementation rather than a "keep primitive, replace CSS" port. This is a structural finding, not a defect: any future shadcn component evaluation should first check whether it's Radix-backed before assuming the standard recipe applies.

## Findings on `tokens.css` (worth recording for anyone doing this again)

1. **Not all tokens are bare HSL triplets.** Most (`--surface`, `--text-primary`, `--border-default`, `--surface-code`, `--surface-raised`) are bare `H S% L%` triples meant to be wrapped: `hsl(var(--x))`. But `--accent-brand` is a **complete color** (`#d97757`, confirmed via `getComputedStyle`) and must be used bare — `var(--accent-brand)`, never `hsl(var(--accent-brand))`. Wrapping it produces invalid CSS (`hsl(#d97757)`) that silently resolves to `transparent`, which is exactly what happened to the Default button's background on first pass (screenshotted, diagnosed, fixed — see git history of `prototype.css`).
   - Practical implication: check each token's actual computed value before assuming the wrap convention; don't pattern-match blindly across the file.
2. For opacity variants of a pre-composed color token (e.g. a "brand at 90%" hover state), `hsl(var(--x) / 0.9)` doesn't work for the same reason. Use `color-mix(in srgb, var(--x) 90%, transparent)` instead.
3. No structural gaps found: Dialog's overlay/content pattern maps directly onto the existing `--z-lightbox` token and mirrors `.claymark-lightbox-backdrop`/`.claymark-lightbox` already in `claymark.css` — no new z-index or layering primitive was needed.
4. **`.claymark-table` draws a full grid** (`border: 1px solid` on every `.claymark-th`/`.claymark-td`) — correct for markdown content tables, but not shadcn's Table convention (horizontal rules only, no vertical borders, no rule under the last row). Confirmed against a reference screenshot the user provided. Fixed with a `.pb-table` modifier class that overrides `border-left`/`border-right` to `none` and drops the bottom rule on the last row, without touching the shared `.claymark-table` rule (which markdown rendering still depends on).

## Finding on component API design (not a tokens.css issue)

**`PortedButton` originally was not `forwardRef`-wrapped, which broke Radix's focus-return contract.** `DialogTrigger asChild` / `DialogClose asChild` use Radix's `Slot`, which needs a ref to the underlying DOM node to move focus back to the trigger after the dialog closes. A plain function component (no `forwardRef`) can't receive that ref, so on Escape-close focus silently fell back to `<body>` instead of the trigger button — a real accessibility regression, not a cosmetic one, and easy to miss without an explicit functional check (screenshots alone don't catch it).

**Fix applied:** wrapped `PortedButton` in `React.forwardRef` (see `ported-button.tsx`). Re-verified: focus now correctly returns to the "Open dialog" button after Escape-close.

**Implication for any future integration:** every Claymark component intended to be used as a Radix `asChild` target (buttons, trigger-like elements) must be built with `forwardRef` from the start, not retrofitted later.

## Validation performed (all PASS)

- `npx tsc --noEmit` on all 11 ported `.tsx` files (both batches) — zero type errors.
- Visual check, both themes (light/dark toggle) — no unstyled/black-on-black elements after the `--accent-brand` fix.
- Functional: dialog opens via click, closes via Escape, closes via overlay click — all confirmed via live browser automation (Claude Browser MCP), not just code inspection.
- Focus trap: Tab cycles Close → × → Close (wraps correctly, stays inside dialog) — confirmed.
- Focus return: after Escape-close, `document.activeElement` is the "Open dialog" trigger button — confirmed (after the `forwardRef` fix).
- DOM-wide sweep for Tailwind-style class names (`bg-`, `hover:`, `flex-`, `p-\d`, etc.) across every rendered element, including all Batch 2 components — zero matches, re-run after Batch 2 landed.
- `grep` for `tailwind`/`cva`/`clsx` in `ported-*.tsx` — zero references across both batches (confirmed at file-authoring time; re-checked here).
- Batch 2 functional checks via live browser automation: Menubar trigger opens content with correct ARIA (`role="menu"`, `aria-expanded`); Menubar checkbox item toggles `aria-checked` and closes the menu on click; toast button click renders a `data-variant`-tagged toast with the right message; zero console errors on a clean (non-HMR-stale) page load with all 8 new sections rendered.

## Recommendation

The approach (Option B: copy shadcn's real markup/Radix behavior, replace Tailwind/`cva` styling with hand-written CSS against `tokens.css`) is validated and low-risk. If/when integration into the live app is decided:
- Add `radix-ui` (already a `devDependency` here, `1.6.7`) as a real dependency for any component needing Radix behavior (Dialog, and later candidates like Tooltip/Popover/Select).
- Any new button-like/trigger-like Claymark component must be `forwardRef`-wrapped from the outset.
- Table needs no dependency at all — it's pure markup + existing classes.
- Before wrapping any token in `hsl()`, check its actual computed value; don't assume the convention holds repo-wide.

Integration itself (replacing `Lightbox.tsx`, wiring `PortedButton` into the toolbar, etc.) is **out of scope for this batch** per the approved plan and is a separate future decision.
