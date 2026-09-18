import type { ReactElement } from 'react'

// android-to-desktop-checklist.md §6 — brand mark / logo. Rounded-square
// tile (~18.75% corner radius, i.e. 96-unit radius on a 512 viewport),
// linear vertical gradient top #DD8562 -> bottom #C8542D, cream "C" cutout
// (#FAF9F5, same value as the light-theme surface token) rendered as a
// ring/arc segment rather than a literal glyph outline. Wordmark is live
// text (not rasterized), Inter SemiBold lowercase "claymark", letter-spacing
// -0.0125em (reproducing the source SVG's -2 tracking at font-size 160).
//
// No canonical brand SVG exists in this repo yet (see LOGO-STRATEGY.md) —
// #DD8562 is taken verbatim from the checklist; re-verify against a real
// canonical asset once one exists, per the checklist's own caveat that it's
// "close to but not identical" to the named Clay.c400 token (#E29981).
const VIEWBOX = 512
const CORNER_RADIUS = 96 // ~18.75% of 512

export interface BrandMarkProps {
  /** Rendered mark size in px. Drawer lockup uses 26. */
  size: number
  showWordmark?: boolean
}

export function BrandMark({ size, showWordmark = false }: BrandMarkProps): ReactElement {
  return (
    <span
      className="claymark-brand-lockup"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        role="img"
        aria-label="Claymark"
      >
        <defs>
          <linearGradient id="claymark-brand-tile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DD8562" />
            <stop offset="100%" stopColor="#C8542D" />
          </linearGradient>
          {/* Cream "C" cutout built as a mask (ring minus a wedge) instead
              of a hand-computed arc path — the earlier arc-sweep-flag
              version produced a solid blob rather than a "C" (caught via
              a real screenshot of the packaged app, not visible from the
              path source alone). A mask needs no sweep-flag guessing: a
              white ring (outer circle minus inner circle) on black, with a
              black wedge polygon punched through the right side to open it. */}
          <mask id="claymark-brand-c-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX} height={VIEWBOX}>
            <rect x="0" y="0" width={VIEWBOX} height={VIEWBOX} fill="black" />
            <circle cx="256" cy="256" r="150" fill="white" />
            <circle cx="256" cy="256" r="80" fill="black" />
            <polygon points="256,256 542.7,456.8 542.7,55.2" fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={VIEWBOX}
          height={VIEWBOX}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill="url(#claymark-brand-tile)"
        />
        <rect
          x="0"
          y="0"
          width={VIEWBOX}
          height={VIEWBOX}
          fill="#FAF9F5"
          mask="url(#claymark-brand-c-mask)"
        />
      </svg>
      {showWordmark ? (
        <span
          data-testid="brand-wordmark"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            fontSize: '1.25rem',
            letterSpacing: '-0.0125em',
            textTransform: 'lowercase',
            color: 'hsl(var(--text-primary))',
          }}
        >
          claymark
        </span>
      ) : null}
    </span>
  )
}
