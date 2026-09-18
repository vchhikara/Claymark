/** Preferences: theme, AMOLED, text size, autosave. localStorage is used (not
 *  chrome.storage) because it is synchronous → no theme flash on load. */
import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export interface Prefs {
  theme: ThemePref
  amoled: boolean
  textScale: number
  autosave: boolean
}
export const DEFAULT_PREFS: Prefs = { theme: 'system', amoled: true, textScale: 1, autosave: true }
export const TEXT_STEPS = [0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5]
const KEY = 'claymark.prefs.v1'

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const p = { ...DEFAULT_PREFS, ...raw }
    if (!['system', 'light', 'dark'].includes(p.theme)) p.theme = 'system'
    if (!TEXT_STEPS.includes(p.textScale)) p.textScale = 1
    return p
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])
  // Keep multiple Claymark tabs in sync.
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === KEY && setPrefs(loadPrefs())
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])
  return [prefs, update] as const
}

export function useSystemDark() {
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
  const [dark, setDark] = useState(!!mq?.matches)
  useEffect(() => {
    if (!mq) return
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}
