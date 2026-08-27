import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} })

const STORAGE_KEY = 'claymark-theme'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// T-P7-07: a manually-persisted choice (localStorage) always wins over the
// system preference; absent a stored choice, we fall back to the system
// preference, matching getSystemTheme's own default of 'light' when neither
// localStorage nor matchMedia is available (e.g. SSR).
function getStoredTheme(): Theme | undefined {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return undefined
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : undefined
  } catch {
    // Storage can throw (private browsing, disabled storage, etc.) — treat
    // as "no stored preference" rather than letting it break rendering.
    return undefined
  }
}

// T-P7-06: tracks `prefers-color-scheme` reactively via the MediaQueryList
// `change` event (not a poll), so a live OS theme switch propagates to every
// consumer through context — the provider component itself never remounts,
// only its `theme` context value changes, so consumers re-render in place.
export interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const stored = getStoredTheme()
  const [theme, setThemeState] = useState<Theme>(stored ?? getSystemTheme)
  const [manual, setManual] = useState(stored !== undefined)

  useEffect(() => {
    if (manual) return // an explicit manual choice overrides system changes
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent): void => {
      setThemeState(event.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [manual])

  const setTheme = (next: Theme): void => {
    setThemeState(next)
    setManual(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can throw — the in-memory choice still applies this session.
    }
  }

  // index.html's anti-FOUC script sets `<html data-theme>` once, synchronously,
  // before mount — `--surface`/`--text-primary` etc. (src/theme/tokens.css) key
  // off that attribute rather than `.claymark-root`'s own, so the page
  // background/global tokens are driven by `<html>`, not by this provider's own
  // div. Without this, a manual toggle (or a live OS-scheme change while
  // `manual` is false) only ever updated `.claymark-root`'s `data-theme` —
  // text color would flip to the new theme's palette while the background
  // token stayed stuck on whatever `<html>` was set to at load, producing
  // near-invisible low-contrast text. Keep `<html>` in sync on every change.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="claymark-root" data-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
