import { createContext, useContext } from 'react'
export interface ThemeInfo {
  effective: 'light' | 'dark'
}
export const ThemeContext = createContext<ThemeInfo>({ effective: 'light' })
export const useThemeInfo = () => useContext(ThemeContext)
