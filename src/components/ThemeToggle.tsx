import type { ReactElement } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { Button } from './Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip'

// T-P7-07: manual override of the detected theme, persisted via
// ThemeProvider (localStorage) so it survives a reload; setting it also
// marks the choice as manual there, so a later system-preference change no
// longer overrides it.
export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme()
  const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} theme`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="claymark-theme-toggle"
            aria-label={label}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme(next)}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
