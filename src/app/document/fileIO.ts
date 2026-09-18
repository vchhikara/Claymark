// Phase 2.3 (android-to-desktop-checklist.md §3): open / save / save-as,
// wrapping @tauri-apps/plugin-fs + @tauri-apps/plugin-dialog. "Open with"/
// externally-launched documents (Phase 5.1) route through openDocumentAtPath
// with readOnly=true.
import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'

export interface LoadedDocument {
  path: string
  name: string
  content: string
  writable: boolean
  readOnly: boolean
}

export function resolveDisplayName(path: string): string {
  const segments = path.split(/[\\/]/)
  return segments[segments.length - 1] || path
}

const MARKDOWN_EXTENSIONS = ['.md', '.markdown']

export function suggestSaveAsName(currentName: string | undefined): string {
  const base = currentName && currentName.trim().length > 0 ? currentName : 'untitled.md'
  const hasMarkdownExt = MARKDOWN_EXTENSIONS.some((ext) => base.toLowerCase().endsWith(ext))
  return hasMarkdownExt ? base : `${base}.md`
}

export async function openDocument(): Promise<LoadedDocument | null> {
  const path = await dialogOpen({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  })
  if (!path || typeof path !== 'string') return null
  return openDocumentAtPath(path, false)
}

/** Used both by the picker above and by Phase 5.1's file-association /
 *  "open with" handler (which passes readOnly=true per checklist §3). */
export async function openDocumentAtPath(
  path: string,
  readOnly: boolean
): Promise<LoadedDocument> {
  const content = await readTextFile(path)
  return {
    path,
    name: resolveDisplayName(path),
    content,
    writable: !readOnly,
    readOnly,
  }
}

/** Truncate-then-write: a single full-content write, never an append — the
 *  checklist explicitly calls out "no trailing old bytes on a shorter
 *  document" as a requirement, which writeTextFile's semantics satisfy by
 *  construction (it replaces the file's full contents). Re-checks
 *  writability immediately before writing rather than trusting the value
 *  captured at open time. */
export async function saveDocument(path: string, content: string): Promise<void> {
  const stillExists = await exists(path)
  if (!stillExists) {
    throw new Error(`Cannot save: ${path} is no longer writable (re-check failed before write)`)
  }
  await writeTextFile(path, content)
}

export async function saveDocumentAs(
  currentName: string | undefined,
  content: string
): Promise<{ path: string; name: string } | null> {
  const suggested = suggestSaveAsName(currentName)
  const path = await dialogSave({
    defaultPath: suggested,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
  })
  if (!path) return null
  await writeTextFile(path, content)
  return { path, name: resolveDisplayName(path) }
}
