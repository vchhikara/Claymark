// Phase 2.5 (android-to-desktop-checklist.md §3): recent files (MRU).
// Cap 5, most-recent-first, reopening moves to front with no duplicate,
// only persisted-grant documents recorded, stale entries auto-removed.
import { describe, expect, it, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
vi.mock('../src/app/document/recentFilesPersistence', () => ({
  readRecentFiles: vi.fn(() => {
    const raw = store.get('list')
    return raw ? (JSON.parse(raw) as { path: string; name: string }[]) : []
  }),
  writeRecentFiles: vi.fn((entries: { path: string; name: string }[]) => {
    store.set('list', JSON.stringify(entries))
  }),
}))

import {
  addRecentFile,
  getRecentFiles,
  removeRecentFile,
} from '../src/app/document/recentFiles'

beforeEach(() => {
  store.clear()
})

describe('recent files MRU', () => {
  it('adds entries most-recent-first', () => {
    addRecentFile({ path: '/a.md', name: 'a.md' })
    addRecentFile({ path: '/b.md', name: 'b.md' })
    expect(getRecentFiles().map((e) => e.path)).toEqual(['/b.md', '/a.md'])
  })

  it('caps at 5, dropping the oldest', () => {
    for (const n of ['1', '2', '3', '4', '5', '6']) {
      addRecentFile({ path: `/${n}.md`, name: `${n}.md` })
    }
    const paths = getRecentFiles().map((e) => e.path)
    expect(paths).toHaveLength(5)
    expect(paths).toEqual(['/6.md', '/5.md', '/4.md', '/3.md', '/2.md'])
  })

  it('reopening an existing entry moves it to front with no duplicate', () => {
    addRecentFile({ path: '/a.md', name: 'a.md' })
    addRecentFile({ path: '/b.md', name: 'b.md' })
    addRecentFile({ path: '/a.md', name: 'a.md' })
    const paths = getRecentFiles().map((e) => e.path)
    expect(paths).toEqual(['/a.md', '/b.md'])
  })

  it('removeRecentFile drops a stale entry (reopen-failed case)', () => {
    addRecentFile({ path: '/a.md', name: 'a.md' })
    addRecentFile({ path: '/b.md', name: 'b.md' })
    removeRecentFile('/a.md')
    expect(getRecentFiles().map((e) => e.path)).toEqual(['/b.md'])
  })
})
