// android-to-desktop-checklist.md §6 — AMOLED theme: an exact copy of the
// dark theme, with only `surface` overridden to pure black. Deliberately a
// *partial* override object (not a full SemanticToken record) — surfaceRaised/
// surfaceCode must fall through to SEMANTIC_DARK's values, not be re-derived,
// so the elevation step reads more pronounced against true black.
export const AMOLED_OVERRIDE: { surface: string } = {
  surface: '0 0% 0%',
}
