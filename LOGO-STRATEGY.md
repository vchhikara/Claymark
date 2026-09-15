# Claymark — logo design strategy

**Date: 2026-09-15**

Not a logo, not a decision — a strategy plus a working prompt set for
producing one. Grounded in `brand_guidelines.md` (currently only on
`defect-closure`; treat this document as portable to wherever it lands) and
in the fact, confirmed by opening the actual files, that **there is no logo
today**: `public/icon-512.png`, `public/icon-maskable-512.png`, and
`src-tauri/icons/icon.png` are all the identical flat clay-orange square —
per `T-P9-02`'s own session note, "hand-generated PNGs via a minimal
zlib-based encoder script, no image-processing dependency added." This is a
greenfield mark, not a redesign.

---

## 1. What the mark has to be true to

Pulled directly from `brand_guidelines.md`, not invented for this document:

| Constraint | Source | What it rules in / out |
|---|---|---|
| "Not loud." No saturated `clay-500` fills behind body text, no display typeface, no large filled CTAs anywhere in the product | §7 | Rules out a busy, high-contrast, "punchy startup logo" treatment. The mark should feel like it belongs next to quiet outline buttons, not a landing-page hero. |
| Warm, not cool — hue 60° neutral ramp, parchment-toned surface, clay/terracotta accent (`#d97757` core, `#c8542d` — the actual PWA `theme_color`) | §3 | Rules out blue/purple/teal "generic SaaS" palettes entirely. The accent is warm orange-red, full stop. |
| "The Claude visual idiom... a deliberate cousin of Anthropic's Claude, not a generic dark-mode dev tool" | §1 | Rules out cold, dark, neon-accented "hacker tool" aesthetics some markdown/dev apps lean into. |
| Editorial calm — the serif body text is "the loudest thing on the page" | §1 | The app's own hierarchy already says the *content*, not the chrome, should dominate. A logo that shouts undermines the product's actual promise. |
| Security by construction, fidelity, no silent degradation | §1 | Not a literal constraint on shape, but a tone constraint: precise, deliberate, considered — not playful/cartoonish. |
| Three radius steps only (4/8/12px), warm neutral ramp, no fourth radius, no ad-hoc color | §5 | If the mark is geometric, it should read as drawn from the same restrained shape vocabulary as the UI, not a separate "logo design" free-for-all. |

**The one AI-logo cliché to actively avoid:** a sculpted, glossy 3D
clay-blob mascot (fingerprint-in-wet-clay, a literal lump of modeling
clay with a face or a squished shape). This was an extremely common
AI-image-generator default for anything named "clay" or "claymorphism" in
generation cycles through 2024–2025, and it directly contradicts "not
loud"/"editorial calm" — it's a mascot logo, and Claymark doesn't read as a
mascot-logo brand anywhere else in the product. If a model defaults to this
without being told not to, that's the model doing pattern-matching on the
name, not reading the brand — every prompt set below includes an explicit
negative for it.

---

## 2. Candidate creative directions

Four distinct directions, each defensible from the guidelines above, meant
to be explored in parallel rather than committed to up front — pick after
seeing real output, not before.

**A. The soft rim-light tile.** A single rounded-square or circle tile in
the `clay-500`/`clay-600` family, carrying the *exact* soft-claymorphism
treatment already built in code (`Claymorphism.kt`'s `clayRaised`: a
diffuse drop shadow below-right, a light rim above-left, a shallow vertical
gradient) — literally the same visual language as the app's own buttons,
scaled up and simplified to a mark. Most "on-brand by construction" option
since it reuses a real, already-shipped effect rather than inventing a new
one.

**B. An abstracted document/heading mark.** A geometric reference to
Markdown itself — a stylized `#` (heading marker), a folded document
corner, or a horizontal-rule-and-text abstraction — rendered flat, warm,
single-accent-color. Speaks to "what the product actually is" (a Markdown
renderer) rather than to the brand name's material metaphor.

**A + B, materials-honest.** A door worth testing without over-committing:
a heading-mark or document-fold shape (direction B) *rendered with*
direction A's soft rim-light treatment — the two aren't mutually exclusive,
and testing the combination is cheap once both are being generated anyway.

**C. A clay-seal / stamp mark.** An impression-in-clay reference that's
tactile without being a blob-mascot — think an ancient seal/signet stamp
shape, a simple pressed geometric impression, or a rounded-square "tile"
with a subtly inset (not sculpted) mark — closer to `clayInset`'s pressed
treatment than `clayRaised`'s. Leans into the material metaphor honestly
without becoming a 3D character.

**D. A minimal wordmark-only lockup.** No separate icon symbol at all —
just "Claymark" set in Inter (per §2's rule that the in-app header wordmark
is already Inter, letter-spaced, uppercase, muted), possibly with one small
geometric accent (a single clay-colored dot, underline, or bracket). Lowest
risk, most consistent with the existing in-app treatment, but weakest as a
standalone app-icon/favicon mark since a full wordmark doesn't compress to
a 16px favicon or a home-screen icon at all — **this direction needs a
separate, simpler glyph for icon contexts even if chosen for the header/
marketing lockup.**

**Recommendation for what to actually generate first:** A and B (and their
combination) are the strongest candidates for an icon-shaped mark; C is
worth one exploratory pass; D should be produced regardless as the
*wordmark* lockup (used in marketing/README contexts) independent of
whichever icon wins.

---

## 3. Model roster — multi-model, role-based, not a single tool

Current (2026) research is consistent on one point: **no single model is
best at everything a logo needs** — mark aesthetics, exact text rendering,
and clean vector output are three different strengths spread across three
different tools. A documented working pattern from current professional
practice: spend a short session on a strong *aesthetic* model for
mark-direction exploration (ignoring text entirely), then take the winning
direction to a strong *text-accurate* model with the brand name included,
then finish in a *native-vector* tool for production output. That maps
directly onto the roster below.

| Role | Model | Why this one | Known weakness to route around |
|---|---|---|---|
| **Mark aesthetic exploration** (icon-only, no text, direction A/B/C above) | **Midjourney v7** | Strongest purely aesthetic/artistic mark generation of the current crop; use it to generate *shape and mood*, not final output. | Text rendering is still weak (~30–40% accuracy per current comparisons) — never ask it to render "Claymark" as a word. |
| **Text-accurate wordmark / lockup** (direction D, and any icon+wordmark combo) | **Ideogram 3 or 4** | Current best-in-class text rendering (~90–95% accuracy on short copy) — the only model in this roster worth trusting with the literal word "Claymark" rendered inside the image. | Aesthetic range for pure abstract marks is narrower than Midjourney's — don't use it for direction A/C's abstract shape exploration. |
| **Production vector output** | **Recraft (currently V4.1 Vector)** | The only tool in this roster with *native* SVG generation, not a raster image someone then traces — directly produces the scalable, edit-in-Figma/Illustrator asset a real icon needs. Also supports uploading a reference/style image to hold a specific look across a generated set, which matters once a direction is chosen and needs 5–10 clean variations. | Its own aesthetic default style is more "modern flat SaaS icon" than Midjourney's range — best used *after* a direction is chosen via A, to execute it cleanly, not to originate the concept. |
| **Brand-consistency / iterative refinement pass** | **Gemini 3 Pro Image ("Nano Banana Pro")** | Explicitly supports multiple reference images as input — the practical implication for Claymark: **feed it a screenshot of `tokens.css`'s actual swatches (or the hex values directly) alongside a chosen rough concept**, and ask it to hold to the exact palette across revisions, rather than approximating "a warm orange" from a text description. Useful for the final "make sure `clay-600` is really `#c8542d`, not close-enough" pass. | Not the first choice for originating a concept from nothing — best used once a direction/rough concept already exists to refine and hold consistent. |
| *(Not recommended for this task)* | GPT-Image-2 / DALL·E successor | Text accuracy is close behind Ideogram/Recraft but not ahead of either — no role here that another tool doesn't already cover better. Worth a spot-check only if Ideogram's specific output for direction D doesn't land. |

**Why not just pick one and iterate inside it:** the research consistently
finds each tool's strength doesn't transfer to the others' weak points —
picking Midjourney alone means fighting its text rendering for the
wordmark; picking Ideogram alone means a narrower aesthetic net for the
abstract-mark directions; picking neither and going straight to Recraft
means skipping the actual creative-exploration step Recraft isn't primarily
built for. The four-role pipeline costs more setup than "one tool, many
prompts," but produces a materially better and more on-brand result for
roughly the same total generation-and-review time.

---

## 4. The staged workflow

```
Stage 0 — Direction check (this document)
   ↓
Stage 1 — Mark aesthetic exploration (Midjourney v7)
   4 directions × 4 variations = ~16 images, icon-only, no text
   ↓  (pick 1–2 directions worth continuing)
Stage 2 — Text-accurate execution (Ideogram 3/4)
   Wordmark lockup (direction D) + any icon+wordmark combo lockups
   ↓
Stage 3 — Vector production (Recraft V4.1 Vector)
   Clean SVG redraw of the winning direction, 5–10 tight variations
   ↓
Stage 4 — Brand-consistency pass (Gemini 3 Pro Image / Nano Banana Pro)
   Feed exact tokens.css swatches; verify/correct hex accuracy across
   the surviving variations; generate the monochrome single-color cut
   ↓
Stage 5 — Technical adaptation (manual, in Figma/Illustrator or via Recraft)
   Every deliverable size/format in §6, contrast-checked per §3's
   "contrast is non-negotiable" rule
```

Nothing in Stage 1–2 needs to produce a "final" image — the point is
narrowing from four directions to one before any vector production work
starts, so the expensive/precise stages (3–5) only happen once.

---

## 5. Concrete prompts

Hex values below are the real tokens (`brand_guidelines.md` §3), not
approximations — always give a model the literal hex, never "a warm
orange" or "terracotta," since a text description of a color is exactly
the kind of imprecision Stage 4 exists to correct after the fact if skipped
here.

### Stage 1 — Midjourney v7 (mark exploration, no text)

Base parameters to append to every prompt: `--v 7 --style raw --ar 1:1`
(`--style raw` reduces Midjourney's tendency to add its own stylistic
flourishes on top of the brief, which matters more than usual here given
how specific the "not loud" brief is).

**Direction A — soft rim-light tile:**
```
minimal app icon, single rounded square tile, flat matte terracotta-orange
color #d97757, soft diffuse drop shadow to the bottom-right, subtle light
rim highlight along the top-left edge, gentle vertical gradient from
lighter to darker terracotta, no texture, no 3D sculpting, no character,
no face, clean geometric claymorphism, warm parchment-white background
#faf9f5, quiet and understated, editorial and calm, professional software
icon, vector-style flat illustration
--no 3D render, sculpted clay, mascot, character, face, glossy plastic,
gradient rainbow, blue, purple, teal, drop shadow ring, photorealistic
```

**Direction B — heading-mark / document abstraction:**
```
minimal geometric app icon, abstract mark referencing a markdown heading
symbol or a folded document corner, flat single color #c8542d on warm
parchment-white background #faf9f5, extremely simple, two or three shapes
maximum, generous negative space, rounded corners consistent with a small
4-12px radius design system, no gradient, no shadow, no texture, quiet and
precise, professional developer-tool icon, flat vector illustration style
--no 3D, mascot, character, blob, clay texture, realistic paper, skeuomorphic
shadow, gradient, multiple colors, busy detail, gothic or ornate lettering
```

**Direction A+B combined:**
```
minimal app icon, abstract markdown heading-mark shape rendered as a soft
raised clay tile, flat matte terracotta #d97757, soft diffuse shadow
bottom-right, subtle rim highlight top-left, single shape, generous
padding, warm parchment background #faf9f5, restrained and quiet,
professional software icon, flat vector illustration
--no photorealistic clay, sculpted 3D, mascot, face, character, glossy,
multiple accent colors, ornate detail, drop shadow ring
```

**Direction C — clay-seal / stamp:**
```
minimal app icon referencing an ancient stamp or signet seal, a single
simple geometric impression pressed into a flat rounded tile, flat matte
terracotta #d97757 tile with a subtly darker inset impression (not a
sculpted 3D dent), warm parchment background #faf9f5, extremely restrained,
no ornamentation, professional and quiet, flat vector illustration
--no 3D sculpting, realistic clay texture, mascot, character, ornate seal
detail, wax-seal red, multiple colors, gradient rainbow
```

### Stage 2 — Ideogram 3/4 (text-accurate wordmark + lockups)

**Direction D — wordmark only:**
```
Minimal wordmark logo reading "Claymark" in a clean modern humanist
sans-serif typeface (similar to Inter), all lowercase, letter-spacing
slightly tight, single color #1a1a1a on a transparent background. No icon,
no symbol, no decoration, no tagline. Quiet, precise, editorial —
not a bold startup wordmark, more like a well-set book imprint mark.
```

**Direction D variant — with a single accent mark:**
```
Minimal wordmark logo reading "claymark" in a clean humanist sans-serif
(similar to Inter), lowercase, dark neutral gray-brown #2a2420 text, with
one small solid circle in terracotta #d97757 replacing or positioned as
the dot above the "l" (a single quiet accent, not a separate icon), on
transparent background. Restrained, precise, no gradient, no shadow.
```

**Icon+wordmark horizontal lockup** (once a Stage-1 direction is chosen —
example using direction B's result described in words):
```
Horizontal logo lockup: on the left, a small flat geometric mark — [insert
exact description of the chosen Stage-1 shape here, e.g. "an abstract
markdown heading symbol as a simple two-shape flat icon in terracotta
#d97757"] — followed by the wordmark "claymark" in lowercase Inter-style
humanist sans-serif, dark neutral #2a2420, on transparent background.
Generous spacing between mark and wordmark, precise baseline alignment,
quiet and editorial, no shadow, no gradient, no decoration.
```

### Stage 3 — Recraft V4.1 Vector (production)

Recraft's workflow differs from a single text prompt: use its **image
reference / style-upload** feature with the winning Stage-1 output (or a
tight written description of it) as the style anchor, then generate 5–10
size/weight variations for production, e.g.:

```
Flat vector icon, single rounded-square tile, matte terracotta #d97757
fill, soft directional shadow bottom-right, subtle rim highlight top-left,
[chosen mark description], no gradient noise, no texture, clean scalable
vector shapes only, transparent background, optimized for small sizes
down to 16px.
```

Generate at minimum: the full-color version, a single-color/monochrome cut
(pure `#d97757` or pure dark-neutral, no shading at all — needed for
favicon and any single-ink context), and an outline-only cut (for contexts
needing a hairline mark, e.g. a watermark or letterhead).

### Stage 4 — Gemini 3 Pro Image / Nano Banana Pro (consistency pass)

Feed it, as reference images alongside the prompt: (1) the Stage-3 winning
output, (2) a screenshot or swatch strip of the real `tokens.css` colors
(`--clay-500 #d97757`, `--clay-600 #c8542d`, `--clay-700 #bd4d28`,
`--surface` light `48 45% 98%` / dark `0 0% 9.8%`).

```
Using the attached logo as the exact shape and composition to preserve,
and the attached color swatches as the exact and only palette allowed,
produce: (1) a version with the fill precisely matching swatch 1
(#d97757), (2) a version precisely matching swatch 2 (#c8542d) for use as
a favicon/theme-color match, (3) a dark-mode variant with the tile
background at the dark swatch (near-black, hue 60° warm-neutral, not pure
#000) and the mark itself in the light clay tone. Do not alter the shape,
proportions, shadow treatment, or composition — only the colors specified.
```

This is the stage that actually enforces "never pick a clay shade by eye"
(§3's own rule) — treat it as a required checkpoint, not an optional
polish pass.

---

## 6. Technical deliverable checklist

Every size/format this app's own build actually references, confirmed by
reading the real manifests/asset folders, not assumed:

| Deliverable | Spec | Where it's used |
|---|---|---|
| PWA icon | 192×192, 512×512 PNG, `purpose: any` | `public/manifest.json` |
| PWA maskable icon | 512×512 PNG, safe content within the inner ~80% (standard maskable-icon safe zone) | `public/manifest.json`, `purpose: maskable` |
| Desktop/Tauri icon | Multi-size `.png`/`.ico`/`.icns` (Windows tile sizes 30–310px, macOS/Linux `icon.png`) | `src-tauri/icons/` |
| **Android adaptive icon** | **Two separate 108×108dp layers** (foreground with transparency, background fully opaque) — foreground content must fit inside a **centered 66dp-diameter safe-zone circle** (confirmed current spec); anything outside it can be clipped by OEM launcher mask shapes | `src-tauri/icons/android/mipmap-*/ic_launcher_foreground.png` + background |
| Favicon-scale legibility | Must read as a recognizable mark at 16×16–32×32px, not just at 512px | Browser tab, PWA install prompt |
| Monochrome / single-ink cut | One flat color, no shading, no gradient | Anywhere the full-color version can't be used (embossing, single-color print, a dark-on-dark context) |
| Contrast against both surfaces | Must remain legible/on-brand against `--surface` light (`48 45% 98%`, warm off-white) **and** dark (`0 0% 9.8%`, near-black) — check both, not just one | Light/dark theme parity, per §3's non-negotiable contrast rule |
| Transparent background | Required for the wordmark and any lockup; the icon-tile versions are the one case where a filled square background is correct (it *is* the tile) | All contexts except the app-icon tile itself |

---

## 7. Evaluation — how to actually pick, not just eyeball

- **Squint test.** Blur the candidates or view them at thumbnail size —
  does the shape still read, or does it collapse into a smudge? This
  matters more than how it looks at full size, since most real-world
  views of an app icon are small (launcher grid, tab favicon, notification
  icon).
- **16px legibility test.** Actually scale a candidate down to 16×16 and
  look at it — don't infer from the 512px version. A shape with three or
  more distinct elements routinely fails this even when it looks clean
  large.
- **Both-theme test.** Render the icon-tile version against both the light
  parchment and dark near-black surface colors side by side — per §3, a
  design that only works on one background isn't done.
- **"Does this belong next to a quiet outline button" test.** Put the
  candidate mark next to a screenshot of the app's actual header (its own
  understated `ClayButton`s, muted wordmark). If the mark reads as louder
  or more "designed" than the product's own UI, it's off-brand regardless
  of how good it looks in isolation — this is the single most
  brand-specific check in this whole process and the easiest one to skip
  by accident.
- **Don't pick by eye on color.** Per Stage 4 — confirm the actual hex
  values sampled from the final export match the token values exactly,
  the same way `clay-700` exists specifically because `clay-600` measured
  4.23:1 and *looked* fine but wasn't AA-compliant. A logo isn't
  body text, so the AA requirement itself doesn't strictly apply to it —
  but the underlying lesson (measure, don't eyeball) does.

---

## 8. Explicit no-list

Restated as one place to check a candidate against before spending further
time on it:

- Sculpted 3D clay blob, mascot, character, or face of any kind
- Any color outside the warm clay/terracotta + warm-neutral-ramp family —
  no blue, purple, teal, or "generic tech gradient"
- Glossy/photorealistic rendering, drop-shadow rings, or bevel/emboss
  effects beyond the specific soft-rim-light treatment already defined in
  `Claymorphism.kt`
- A fourth radius value, or organic/blobby corners inconsistent with the
  product's 4/8/12px radius system
- A display/decorative typeface for any wordmark — Inter only, per §4
- Anything that would look more at home on a landing-page hero than next
  to the product's own quiet header chrome

---

## 9. Checkpoint — first generated round reviewed, 2026-09-15

A first Midjourney-style batch came back as a monogram concept: a capital
letterform in a rounded-square tile, with a small circle-and-stroke accent
device. Review findings, kept here so the next round doesn't repeat the
same misses:

- **Letter locked to "C"** (for Claymark, not "M" for Markdown — the batch
  reviewed used "M", ambiguous and not actually confirmed against either
  reading). Every prompt below uses "C".
- **The batch leaned straight into the exact cliché §1/§8 warn against**:
  visible sculpted clay/paper texture, thick embossed bevels, one
  saturated diagonal gradient fill, and one flat-design long-cast-shadow
  treatment (a dated ~2015 icon style, not "editorial calm"). None of
  these six is worth refining further — they came from a brief that read
  as "3D icon," not "flat, quiet UI chrome."
- **Colors drifted from the real tokens** — the batch's browns/chocolate
  tones read noticeably duller and more desaturated than the actual
  `clay-500 #d97757`/`clay-600 #c8542d`. Confirms §7's "don't pick by eye"
  point is a real, not theoretical, risk — restating the literal hex in
  every prompt (already the practice above) isn't sufficient on its own;
  the *style* instructions ("flat," explicit material negatives) matter
  just as much as stating the hex.
- **Kept from the batch:** the small-circle-accent device (a dot joined to
  the letterform) is worth carrying forward — same idea as this
  document's own wordmark-accent suggestion in §5 Stage 2, just applied to
  the icon mark instead. The rounded-square container shape is already
  correct (matches the three-radius-step system) and doesn't need
  revisiting.

### Refined prompt set — Direction E, "C" monogram, flat only

A shared negative clause, reused across all three variants below, made
more specific than §5's originals given what the first batch actually did
wrong:

```
--no 3D render, sculpted material, clay texture, paper grain, embossed
bevel, glossy plastic, inner shadow, long cast shadow, saturated diagonal
gradient, rainbow gradient, mascot, character, face, blob, photorealistic
material, blue, purple, teal, ornate or decorative lettering
```

**E1 — plain flat monogram, soft rim-light tile (direction A's treatment, corrected):**
```
minimal flat app icon, a single geometric capital letter "C" centered in a
rounded square tile, flat matte terracotta fill #d97757, a very soft
low-contrast diffuse shadow to the bottom-right only (subtle, not a hard
cast shadow), a thin subtle light rim highlight along the top-left inner
edge, a shallow vertical gradient from a barely-lighter terracotta at the
top to a barely-darker shade at the bottom with no visible banding, the
letterform in a clean geometric sans-serif shape with no serifs or
decoration, warm parchment-white background #faf9f5, quiet and
restrained, absolutely no texture or material simulation, professional
software icon, flat 2D vector illustration only
[+ the shared negative clause above]
```

**E2 — "C" with the dot-accent device kept from the reviewed batch:**
```
minimal flat app icon, a bold geometric capital letter "C" in a rounded
square tile, with one small solid circle positioned in the open gap of
the C like a period or anchor point, the C in flat matte terracotta
#d97757, the tile background in a slightly deeper terracotta #c8542d,
strictly two-tone flat design, no gradient noise, no texture, only a very
soft subtle bottom-right ambient shadow, warm parchment-white background
#faf9f5 outside the tile, quiet, editorial, precise, professional
developer-tool icon, flat vector illustration only
[+ the shared negative clause above]
```

**E3 — "C" built from a document/page-fold silhouette (ties the letter back to what the product actually is):**
```
minimal flat app icon, a capital letter "C" shape formed by a simplified
open-document or folded-page silhouette, single flat matte color
terracotta #d97757, warm parchment-white background #faf9f5, extremely
restrained, two or three shapes maximum, generous negative space, no
gradient, no shadow beyond the standard soft bottom-right ambient light
already used elsewhere in this brief, no texture, quiet and precise,
professional software icon, flat vector illustration only
[+ the shared negative clause above]
```

**Next step once one of E1–E3 lands closer to on-brand:** move it straight
to Stage 2 (Ideogram, for a "claymark" wordmark lockup using the same C)
and Stage 4 (Nano Banana Pro, fed the real `tokens.css` swatches) rather
than iterating further inside whichever tool produced it — per §3's own
reasoning, refining color/text accuracy inside an aesthetic-exploration
tool fights that tool's weak point instead of routing around it.

## 10. Checkpoint 2 — E-round reviewed, still fighting the same shadow, 2026-09-15

Second batch (six "C" variants) reviewed. Real progress on the two things
Checkpoint 1 flagged hardest: the letter is correctly "C" throughout, and
the color reads as actual clay-orange rather than the earlier
chocolate-brown drift. But one problem from round one is **still present
in all six images, unchanged**, plus one new one:

- **The long diagonal cast shadow (the dated ~2015 flat-icon-pack style)
  is on every single tile.** The E1–E3 prompts' "a very soft low-contrast
  diffuse shadow to the bottom-right only, subtle, not a hard cast shadow"
  language did not stop this. Generic negatives ("no long cast shadow")
  evidently aren't specific enough either, the same lesson Checkpoint 1
  already drew about "sculpted material" — the fix has to *name the style
  by its common name*, not just describe the unwanted geometry.
- **New:** a diagonal glossy highlight sweep across the tile fill on most
  variants — a materials/sheen effect, not the flat matte fill specified.
- **The dot-accent device (kept from round one) isn't working out.** Across
  two rounds it has landed as disconnected from the letterform, awkwardly
  grafted onto the stroke, or (in one variant) produced a stray vertical
  split through the C that reads as a rendering glitch rather than a
  deliberate mark. Verdict: **drop it.** It was worth one try; it's adding
  failure surface, not brand value, and a plain bold "C" (the batch's own
  top-left tile, its cleanest result by a clear margin once the shadow is
  removed) doesn't need it.
- One variant reintroduced an embossed inset bezel/frame — the
  carved-slab problem from round one, minus the visible texture this time.
  Confirms the "no bevel/emboss" instruction needs to stay in every prompt
  going forward, it wasn't a one-time fix.

### Direction F — plain "C", shadow/sheen explicitly named and forbidden

Single simplified prompt, dot dropped, and a much more aggressive negative
clause that names the exact styles being rejected rather than only their
geometry:

```
minimal flat 2D app icon, a single bold geometric capital letter "C"
centered in a rounded square tile, flat matte solid terracotta fill
#d97757, the letterform in warm parchment-white #faf9f5 cut out of the
fill (or the reverse: parchment tile with a solid terracotta C — generate
both), absolutely flat color with zero gradient, zero sheen, zero
highlight sweep, zero reflection, the tile sits with only a very faint,
barely-visible ambient shadow directly beneath it (like a sheet of paper
resting on a table, not a floating object) — no directional shadow, no
diagonal shadow, no long shadow, no shadow extending sideways at all,
completely matte and flat like a Swiss/international-style graphic design
poster, not a rendered 3D object
--no long shadow, no diagonal shadow, no cast shadow, no drop shadow
extending to one side, no flat-design long-shadow icon style, no
Material-Design-style long shadow, no glossy sheen, no diagonal highlight,
no specular highlight, no reflection, no gradient, no bevel, no emboss,
no inset frame, no carved or sculpted look, no 3D render, no material
texture, no paper grain, no mascot, no character, no face, no blob, no
photorealism, no blue, no purple, no teal
```

If this still produces a long shadow, that's a signal to stop iterating
the prompt further and instead generate the shadow-free flat shape alone
(no shadow instruction at all, positive or negative) and add the correct
subtle shadow afterward in a vector editor — per §3's own point, fighting
a model's strong stylistic default past a certain point costs more than
routing around it in a different tool.

## 11. Checkpoint 3 — Direction F landed, first genuinely on-brand result

Direction F's plain-C, shadow/sheen-explicitly-forbidden prompt produced
the first result across three rounds with none of the recurring problems:
no long diagonal shadow, no glossy sheen, no embossed frame/bezel, no
texture, and (correctly, per Checkpoint 2's call) no dot device. A bold
parchment "C" cut as negative space out of a solid terracotta rounded
square, with only a soft, mostly-contained shadow beneath the tile and a
subtle top-to-bottom tonal shift — close in spirit to `clayRaised`'s own
restrained treatment.

**Verdict: this is the strongest candidate so far and the one to carry
into Stage 3/4** — but not yet confirmed, not yet final. Per §7's own
evaluation criteria, still outstanding before treating it as done:

1. **Hex accuracy unconfirmed.** Reads as somewhere between `clay-500`
   (#d97757) and `clay-600` (#c8542d) by eye — exactly the "don't pick by
   eye" case §7 exists for. Resolve via Stage 4 (Nano Banana Pro, fed the
   real `tokens.css` swatches), not by looking harder at this one export.
2. **Only tested against the light parchment surface.** Needs the same
   render against the dark near-black surface before either theme can be
   called confirmed — a mark that only reads well on one background isn't
   done, per §3's contrast note and §7's both-theme test.
3. **Small-size legibility not yet checked.** Likely fine given how bold
   and simple the letterform is, but "likely fine" isn't the bar §7 sets —
   actually render it at 16px before trusting it.
4. **Shadow has a slight rightward bias**, not a true neutral bottom-only
   falloff. Minor, but worth resolving one way or the other during vector
   cleanup: either make it neutral, or commit fully to `clayRaised`'s
   specific bottom-right-ambient-plus-top-left-rim convention rather than
   landing between the two.
5. **Only one fill polarity came back** (terracotta tile / parchment
   letter) though the prompt asked for both. Generate the reverse
   (parchment tile / terracotta letter) for a side-by-side comparison
   before locking the direction — the two may not perform equally at
   small sizes or in the maskable-icon safe zone.

**Next step:** take this result into Stage 2 (a "claymark" wordmark lockup
using this same C, via Ideogram) and Stage 4 (the hex-accuracy and
dark-theme pass, via Nano Banana Pro) per the pipeline in §4 — not further
iteration inside whichever tool produced this one, consistent with how
this whole process has been run so far.

---

## Sources consulted

- [Best AI Logo Generators: Updated for 2026 — Designlab](https://designlab.com/blog/top-best-ai-logo-generators-a-review)
- [Best AI Logo Generators 2026 — Recraft, Ideogram, Looka — Rangy](https://rangy.ai/blog/best-ai-logo-generator-2026/)
- [Recraft Review 2026 — ToolJunction](https://www.tooljunction.io/ai-tools/recraft)
- [Recraft V3 SVG — Replicate](https://replicate.com/recraft-ai/recraft-v3-svg)
- [Ideogram 4.0 vs GPT Image 2 vs Midjourney — Runbase](https://runbase.net/blog/ideogram-4-vs-gpt-image-2-vs-midjourney)
- [Ideogram vs Midjourney 2026 — pxz.ai](https://pxz.ai/blog/ideogram-vs-midjourney-2026)
- [Nano Banana Pro — Google blog](https://blog.google/innovation-and-ai/products/nano-banana-pro/)
- [Nano Banana / Gemini Image — Google DeepMind](https://deepmind.google/models/gemini-image/)
- [Adaptive icons — Android Developers](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- Internal: `brand_guidelines.md` (on `defect-closure`), `public/manifest.json`, `public/icon-512.png`, `src-tauri/icons/icon.png`, `plan/04-STATE-LEDGER.md` (T-P9-02 icon-generation note)
