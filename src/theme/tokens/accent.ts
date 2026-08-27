export const clay = '#d97757'

export const clay400 = '#e29981'

export const clay500 = clay

export const clay600 = '#c8542d'

// T-P8-02: clay-600 (light-theme default link) and clay-500 (light-theme
// hover/accent) both fail WCAG AA 4.5:1 as text color against the light
// theme's near-white surface (neutral-100, ~98% L) — measured 4.23:1 and
// 2.99:1 respectively. clay700 is the same hue/saturation, darkened to the
// lightness where the ratio clears 4.5:1 with margin (~4.73:1); used for
// both the light theme's --link and --accent-brand (see tokens.css) so
// neither the resting nor the hover state of a link regresses contrast.
export const clay700 = '#bd4d28'
