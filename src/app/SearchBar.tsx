import { useState } from 'react'
import type { ReactElement } from 'react'
import { findMatches, replaceAll } from './searchMatches'

// Phase 4.1 (android-to-desktop-checklist.md §5): Ctrl+F opens this bar.
// Replace row is only shown while editing.
export interface SearchBarProps {
  source: string
  editing: boolean
  onClose: () => void
  onReplace: (nextSource: string) => void
}

export function SearchBar({ source, editing, onClose, onReplace }: SearchBarProps): ReactElement {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const matches = findMatches(source, query)

  return (
    <div
      data-testid="search-bar"
      className="pb-clay-inset"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
        background: 'hsl(var(--surface-raised))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input
          aria-label="Search"
          data-testid="search-input"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'hsl(var(--text-primary))' }}
        />
        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }} data-testid="search-count">
          {matches.length} match{matches.length === 1 ? '' : 'es'}
        </span>
        <button type="button" aria-label="Close search" data-testid="search-close" onClick={onClose}>
          ×
        </button>
      </div>
      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <input
            aria-label="Replace with"
            data-testid="replace-input"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            placeholder="Replace…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'hsl(var(--text-primary))' }}
          />
          <button
            type="button"
            data-testid="replace-all"
            disabled={matches.length === 0}
            onClick={() => onReplace(replaceAll(source, query, replacement))}
          >
            Replace all
          </button>
        </div>
      )}
    </div>
  )
}
