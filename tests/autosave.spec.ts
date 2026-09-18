// Phase 2.4 (android-to-desktop-checklist.md §3): autosave — separate
// debounced (1200ms) writer from the draft buffer, gated on (setting ON &&
// document writable in-place), never silently triggers a save-as picker,
// re-validates writability on wake before writing.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../src/app/document/fileIO', () => ({ saveDocument: vi.fn(async () => {}) }))

import { createAutosave } from '../src/app/document/autosave'
import { saveDocument } from '../src/app/document/fileIO'

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(saveDocument).mockClear()
  vi.mocked(saveDocument).mockResolvedValue(undefined)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('autosave', () => {
  it('debounces at 1200ms and writes via saveDocument when enabled + writable', () => {
    const onSaved = vi.fn()
    const autosave = createAutosave({ path: '/tmp/x.md', enabled: true, writable: true, onSaved })
    autosave.onChange('new content')
    vi.advanceTimersByTime(1199)
    expect(saveDocument).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(saveDocument).toHaveBeenCalledWith('/tmp/x.md', 'new content')
  })

  it('never writes when the setting is off', () => {
    const autosave = createAutosave({ path: '/tmp/x.md', enabled: false, writable: true, onSaved: vi.fn() })
    autosave.onChange('new content')
    vi.advanceTimersByTime(2000)
    expect(saveDocument).not.toHaveBeenCalled()
  })

  it('never writes (and never opens a save-as picker) when the document is not writable in-place', () => {
    const autosave = createAutosave({ path: '/tmp/x.md', enabled: true, writable: false, onSaved: vi.fn() })
    autosave.onChange('new content')
    vi.advanceTimersByTime(2000)
    expect(saveDocument).not.toHaveBeenCalled()
  })

  it('calls onSaved after a successful autosave write', async () => {
    const onSaved = vi.fn()
    const autosave = createAutosave({ path: '/tmp/x.md', enabled: true, writable: true, onSaved })
    autosave.onChange('new content')
    await vi.advanceTimersByTimeAsync(1200)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('re-validates writability at wake time via the writable getter, not a captured snapshot', () => {
    let writable = true
    const autosave = createAutosave({
      path: '/tmp/x.md',
      enabled: true,
      get writable() {
        return writable
      },
      onSaved: vi.fn(),
    })
    autosave.onChange('v1')
    writable = false // revoked between schedule and fire
    vi.advanceTimersByTime(1200)
    expect(saveDocument).not.toHaveBeenCalled()
  })
})
