// Phase 2.5 (android-to-desktop-checklist.md §3): recent files (MRU).
// Cap 5, most-recent-first, reopening an existing entry moves it to front
// with no duplicate, stale entries (reopen fails) removed explicitly by the
// caller via removeRecentFile. Callers are responsible for only calling
// addRecentFile for documents opened via a *persisted* grant — transient
// "open with" grants and synthetic share-text docs must never reach here
// (checklist §3), since they'd fail to reopen after restart.
import { readRecentFiles, writeRecentFiles, type RecentFileEntry } from './recentFilesPersistence'

const MAX_ENTRIES = 5

export function getRecentFiles(): RecentFileEntry[] {
  return readRecentFiles()
}

export function addRecentFile(entry: RecentFileEntry): void {
  const existing = readRecentFiles().filter((e) => e.path !== entry.path)
  const next = [entry, ...existing].slice(0, MAX_ENTRIES)
  writeRecentFiles(next)
}

export function removeRecentFile(path: string): void {
  const next = readRecentFiles().filter((e) => e.path !== path)
  writeRecentFiles(next)
}
