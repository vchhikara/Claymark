// Phase 2.5 — storage backend for the recent-files MRU list, kept separate
// from recentFiles.ts's list logic so that logic is unit-testable without
// touching real storage (same pattern as draftPersistence.ts).
export interface RecentFileEntry {
  path: string
  name: string
}

const KEY = 'claymark-recent-files'

export function readRecentFiles(): RecentFileEntry[] {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentFileEntry[]) : []
  } catch {
    return []
  }
}

export function writeRecentFiles(entries: RecentFileEntry[]): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Storage can throw — MRU degrades to "not remembered this session".
  }
}
