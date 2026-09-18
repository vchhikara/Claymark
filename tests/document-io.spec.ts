// Phase 2.3 (android-to-desktop-checklist.md §3): open / save / save-as.
// Mocks @tauri-apps/plugin-fs and @tauri-apps/plugin-dialog rather than
// hitting the real filesystem (no Tauri runtime in vitest).
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
}))

import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs'
import {
  openDocument,
  saveDocument,
  saveDocumentAs,
  suggestSaveAsName,
  resolveDisplayName,
} from '../src/app/document/fileIO'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveDisplayName', () => {
  it('falls back to the last path segment when no explicit name is given', () => {
    expect(resolveDisplayName('/home/user/docs/notes.md')).toBe('notes.md')
    expect(resolveDisplayName('C:\\Users\\me\\report.md')).toBe('report.md')
  })
})

describe('suggestSaveAsName', () => {
  it('uses the current document name unchanged if it already has a markdown extension', () => {
    expect(suggestSaveAsName('notes.md')).toBe('notes.md')
    expect(suggestSaveAsName('notes.markdown')).toBe('notes.markdown')
  })

  it('appends .md when missing', () => {
    expect(suggestSaveAsName('notes')).toBe('notes.md')
  })

  it('defaults to untitled.md when there is no current document', () => {
    expect(suggestSaveAsName(undefined)).toBe('untitled.md')
  })
})

describe('openDocument', () => {
  it('resolves the display name and reads the file content', async () => {
    vi.mocked(dialogOpen).mockResolvedValue('/tmp/hello.md')
    vi.mocked(readTextFile).mockResolvedValue('# hello')

    const doc = await openDocument()

    expect(doc).toEqual({
      path: '/tmp/hello.md',
      name: 'hello.md',
      content: '# hello',
      writable: true,
      readOnly: false,
    })
  })

  it('returns null when the user cancels the picker', async () => {
    vi.mocked(dialogOpen).mockResolvedValue(null)
    const doc = await openDocument()
    expect(doc).toBeNull()
  })
})

describe('saveDocument', () => {
  it('re-checks writability immediately before writing, not trusted from open time', async () => {
    vi.mocked(exists).mockResolvedValue(true)
    vi.mocked(writeTextFile).mockResolvedValue(undefined)

    await saveDocument('/tmp/hello.md', 'new content')

    expect(exists).toHaveBeenCalledWith('/tmp/hello.md')
    // writeTextFile truncates-then-writes by construction (single full-content
    // call, not an append) — asserted by call shape, not by string length.
    expect(writeTextFile).toHaveBeenCalledWith('/tmp/hello.md', 'new content')
  })

  it('throws (does not silently no-op) when writability re-check fails', async () => {
    vi.mocked(exists).mockResolvedValue(false)
    await expect(saveDocument('/tmp/gone.md', 'x')).rejects.toThrow()
    expect(writeTextFile).not.toHaveBeenCalled()
  })
})

describe('saveDocumentAs', () => {
  it('suggests the current doc name and appends .md if missing, writes on confirm', async () => {
    vi.mocked(dialogSave).mockResolvedValue('/tmp/new-name.md')
    vi.mocked(writeTextFile).mockResolvedValue(undefined)

    const result = await saveDocumentAs('notes', 'content')

    expect(dialogSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: expect.stringContaining('notes.md') })
    )
    expect(writeTextFile).toHaveBeenCalledWith('/tmp/new-name.md', 'content')
    expect(result).toEqual({ path: '/tmp/new-name.md', name: 'new-name.md' })
  })

  it('returns null when the user cancels the save dialog', async () => {
    vi.mocked(dialogSave).mockResolvedValue(null)
    const result = await saveDocumentAs('notes', 'content')
    expect(result).toBeNull()
    expect(writeTextFile).not.toHaveBeenCalled()
  })
})
