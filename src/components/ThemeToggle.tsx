import type { ReactElement } from 'react'
import { useTheme } from '../theme/ThemeProvider'

// T-P7-07: manual override of the detected theme, persisted via
// ThemeProvider (localStorage) so it survives a reload; setting it also
// marks the choice as manual there, so a later system-preference change no
// longer overrides it.
export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme()
  const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="claymark-theme-toggle"
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme(next)}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}
