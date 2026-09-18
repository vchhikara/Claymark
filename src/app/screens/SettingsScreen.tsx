import type { ReactElement } from 'react'
import { useTheme } from '../../theme/ThemeProvider'
import { TEXT_SCALE_STEPS, TEXT_SCALE_LABELS, type TextScaleStep } from '../../theme/tokens/textScale'
import { ScreenShell } from './ScreenShell'
import { Button } from '../ui/Button'

// Phase 3.2 (android-to-desktop-checklist.md §5): Settings screen. Wires
// Phase 1's AMOLED toggle (1.4) and text-size stepper (1.5) mechanisms to
// their first real UI controls.
export interface SettingsScreenProps {
  autosaveEnabled: boolean
  onAutosaveChange: (enabled: boolean) => void
  textScale: TextScaleStep
  onTextScaleChange: (scale: TextScaleStep) => void
  onOpenThemePicker: () => void
}

export function SettingsScreen({
  autosaveEnabled,
  onAutosaveChange,
  textScale,
  onTextScaleChange,
  onOpenThemePicker,
}: SettingsScreenProps): ReactElement {
  const { theme, amoled, setAmoled } = useTheme()
  const currentIndex = TEXT_SCALE_STEPS.indexOf(textScale)

  const row = (label: string, subtitle: string, control: ReactElement): ReactElement => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid hsl(var(--border-subtle))',
      }}
    >
      <div>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{subtitle}</p>
      </div>
      {control}
    </div>
  )

  return (
    <ScreenShell title="Settings">
      {row(
        'Enable autosave',
        'Files will be automatically saved.',
        <input
          type="checkbox"
          checked={autosaveEnabled}
          aria-label="Enable autosave"
          onChange={(e) => onAutosaveChange(e.target.checked)}
        />
      )}
      {row(
        'Theme',
        theme === 'light' ? 'Light' : 'Dark',
        <Button variant="outline" size="sm" onClick={onOpenThemePicker} data-testid="settings-theme-row">
          Change
        </Button>
      )}
      {row(
        'AMOLED Dark Theme',
        'Use a pure black background instead of the default.',
        <input
          type="checkbox"
          checked={amoled}
          aria-label="AMOLED Dark Theme"
          onChange={(e) => setAmoled(e.target.checked)}
        />
      )}
      {row(
        'Text size',
        TEXT_SCALE_LABELS[textScale],
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Decrease text size"
            disabled={currentIndex <= 0}
            onClick={() => onTextScaleChange(TEXT_SCALE_STEPS[currentIndex - 1]!)}
          >
            −
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Increase text size"
            disabled={currentIndex >= TEXT_SCALE_STEPS.length - 1}
            onClick={() => onTextScaleChange(TEXT_SCALE_STEPS[currentIndex + 1]!)}
          >
            +
          </Button>
        </div>
      )}
    </ScreenShell>
  )
}
