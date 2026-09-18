import type { ReactElement } from 'react'
import { BrandMark } from './BrandMark'
import { Button } from './ui/Button'
import { useRoute } from './routing'
import type { RecentFileEntry } from './document/recentFilesPersistence'
import './drawer.css'

// Phase 3.3 (android-to-desktop-checklist.md §4): 240px-cap drawer. Modal
// (scrim) below the 600px breakpoint, permanent two-pane above it — driven
// by CSS (a media query), not JS layout measurement, so it responds
// immediately to window resize without a ResizeObserver.
export interface DrawerProps {
  open: boolean
  onClose: () => void
  recentFiles: RecentFileEntry[]
  onOpenRecent: (path: string) => void
}

const APP_VERSION = '1.0.0'

export function Drawer({ open, onClose, recentFiles, onOpenRecent }: DrawerProps): ReactElement | null {
  const { navigate } = useRoute()

  if (!open) return null

  const go = (route: 'settings' | 'help' | 'about' | 'privacy'): void => {
    navigate(route)
    onClose()
  }

  return (
    <>
      <div
        data-testid="drawer-scrim"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'hsl(0 0% 0% / 0.4)',
          zIndex: 40,
        }}
        className="claymark-drawer-scrim"
      />
      <div
        data-testid="drawer"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '240px',
          maxWidth: '240px',
          background: 'hsl(var(--surface-raised))',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-4)',
          boxSizing: 'border-box',
          zIndex: 41,
        }}
        className="claymark-drawer"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <BrandMark size={26} showWordmark />
        </div>

        <div
          className="pb-clay-pot"
          style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-5)', flex: '0 0 auto' }}
        >
          <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>
            Recent
          </p>
          {recentFiles.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'hsl(var(--text-muted))' }}>No recent files</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {recentFiles.map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    onClick={() => onOpenRecent(entry.path)}
                    style={{
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      width: '100%',
                      padding: 'var(--space-1) 0',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: 'hsl(var(--text-primary))',
                    }}
                  >
                    {entry.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav style={{ display: 'flex', gap: 'var(--space-2)', flex: '0 0 auto' }}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            data-testid="drawer-nav-settings"
            onClick={() => go('settings')}
          >
            ⚙
          </Button>
          <Button variant="ghost" size="icon" aria-label="Help" data-testid="drawer-nav-help" onClick={() => go('help')}>
            ?
          </Button>
          <Button variant="ghost" size="icon" aria-label="About" data-testid="drawer-nav-about" onClick={() => go('about')}>
            ⓘ
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Privacy"
            data-testid="drawer-nav-privacy"
            onClick={() => go('privacy')}
          >
            🔒
          </Button>
        </nav>

        <p
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: 'hsl(var(--text-muted))',
          }}
        >
          v{APP_VERSION}
        </p>
      </div>
    </>
  )
}
