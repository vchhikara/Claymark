import { useEffect, useRef } from 'react'
import { Logo } from './Logo'
import { PortedButton } from './pb/button'
import { PortedSeparator } from './pb/separator'
import { FolderOpen, FilePlus, Settings, HelpCircle, Info, Lock } from 'lucide-react'
import type { RecentEntry } from '../store/files'

function ago(t: number) {
  const s = (Date.now() - t) / 1000
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function Drawer(props: {
  recent: RecentEntry[]
  onClose: () => void
  onOpenFile: () => void
  onNew: () => void
  onOpenRecent: (r: RecentEntry) => void
  onClearRecent: () => void
  onNav: (v: 'settings' | 'help' | 'about' | 'privacy') => void
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [])
  return (
    <>
      <div className="cm-scrim" onClick={props.onClose} />
      <nav className="cm-drawer" aria-label="Claymark menu" ref={ref}>
        <div className="cm-drawer-brand">
          <Logo size={32} />
          <span>claymark</span>
        </div>
        <div className="cm-drawer-actions">
          <PortedButton variant="outline" className="cm-drawer-action" onClick={props.onOpenFile}>
            <FolderOpen size={16} aria-hidden="true" /> Open file
          </PortedButton>
          <PortedButton variant="outline" className="cm-drawer-action" onClick={props.onNew}>
            <FilePlus size={16} aria-hidden="true" /> New document
          </PortedButton>
        </div>
        <PortedSeparator className="cm-drawer-sep" />
        <section className="pb-clay-pot" aria-labelledby="cm-recent-h">
          <div className="cm-recent-inner">
            <h2 className="cm-recent-title" id="cm-recent-h">Recent</h2>
            {props.recent.length === 0 ? (
              <p className="cm-recent-empty">No recent files</p>
            ) : (
              <ul className="cm-recent-list">
                {props.recent.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="cm-recent-item" onClick={() => props.onOpenRecent(r)} title={r.name}>
                      <span className="cm-recent-name">{r.name}</span>
                      <span className="cm-recent-when">{ago(r.openedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <div className="cm-drawer-icons">
          <PortedButton variant="ghost" size="icon" aria-label="Settings" title="Settings" onClick={() => props.onNav('settings')}><Settings size={18} aria-hidden="true" /></PortedButton>
          <PortedButton variant="ghost" size="icon" aria-label="Help" title="Help" onClick={() => props.onNav('help')}><HelpCircle size={18} aria-hidden="true" /></PortedButton>
          <PortedButton variant="ghost" size="icon" aria-label="About" title="About" onClick={() => props.onNav('about')}><Info size={18} aria-hidden="true" /></PortedButton>
          <PortedButton variant="ghost" size="icon" aria-label="Privacy" title="Privacy" onClick={() => props.onNav('privacy')}><Lock size={18} aria-hidden="true" /></PortedButton>
        </div>
        <div className="cm-drawer-foot">
          <span>v1.0.0</span>
          {props.recent.length > 0 && <PortedButton variant="link" size="sm" onClick={props.onClearRecent}>Clear recent</PortedButton>}
        </div>
      </nav>
    </>
  )
}
