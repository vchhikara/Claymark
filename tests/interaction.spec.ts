import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { TableContainer } from '../src/components/Table'
import { Image } from '../src/components/Image'
import { Lightbox } from '../src/components/Lightbox'
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider'
import { ThemeToggle } from '../src/components/ThemeToggle'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// T-P7-09: the P7 (UI Behaviors) interaction test suite. Grown incrementally
// as each T-P7-NN task lands, per the roadmap's per-task "Verify" column —
// this is not written all at once at the end.

describe('P7 — Interaction behaviors', () => {
  // T-P7-01 criterion: "Wide table scrolls; page does not gain horizontal scroll"
  it('TableContainer wraps its table in a horizontally-scrollable container, not the page', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(
          TableContainer,
          null,
          createElement(
            'table',
            { className: 'claymark-table' },
            createElement('tbody', null, createElement('tr', null, createElement('td', null, 'cell'))),
          ),
        ),
      )
    })

    const scrollDiv = host.querySelector('.claymark-table-scroll')
    expect(scrollDiv).not.toBeNull()
    // The table itself lives inside the scroll container, not as a
    // page-level sibling — overflow is scoped to this div (verified via the
    // `overflow-x: auto` rule on .claymark-table-scroll in claymark.css),
    // never on `body`/`html`.
    expect(scrollDiv?.querySelector('table.claymark-table')).not.toBeNull()
    expect(document.body.classList.length).toBe(0)

    act(() => root.unmount())
    host.remove()
  })

  // T-P8-04: a static <table> has no focusable descendant, so the scroll
  // container itself must be a keyboard-reachable, arrow/PageUp-PageDown
  // scrollable region.
  it('TableContainer scroll region is keyboard-focusable with an accessible name', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(TableContainer, null, createElement('table', { className: 'claymark-table' })),
      )
    })

    const scrollDiv = host.querySelector('.claymark-table-scroll')
    expect(scrollDiv?.getAttribute('tabindex')).toBe('0')
    expect(scrollDiv?.getAttribute('role')).toBe('region')
    expect(scrollDiv?.getAttribute('aria-label')).toBeTruthy()

    act(() => root.unmount())
    host.remove()
  })

  // T-P7-02 criterion: "Indicator appears only when content overflows"
  it('sets no overflow-shadow data attribute when the table does not overflow', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(
        createElement(TableContainer, null, createElement('table', { className: 'claymark-table' })),
      )
    })

    // jsdom reports 0 for scrollWidth/clientWidth on all elements, so
    // scrollLeft + clientWidth (0) is never < scrollWidth - 1 (-1) and
    // scrollLeft (0) is never > 0 — both overflow directions correctly
    // read as "no overflow" without needing real layout.
    const scrollDiv = host.querySelector('.claymark-table-scroll')
    expect(scrollDiv?.getAttribute('data-overflow-left')).toBeNull()
    expect(scrollDiv?.getAttribute('data-overflow-right')).toBeNull()

    act(() => root.unmount())
    host.remove()
  })

  // T-P7-03 criterion: "Cumulative layout shift equals 0 on image load" —
  // verified at the component level: when width/height are known, the
  // rendered <img> reserves its aspect ratio (both the attributes and the
  // CSS aspect-ratio) before the network response, and is marked lazy.
  it('Image reserves aspect-ratio and defers loading when dimensions are known', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(Image, { src: 'a.png', alt: 'a', width: 400, height: 300 }))
    })

    const img = host.querySelector('img.claymark-img') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('width')).toBe('400')
    expect(img.getAttribute('height')).toBe('300')
    expect(img.style.aspectRatio).toBe('400 / 300')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('decoding')).toBe('async')

    act(() => root.unmount())
    host.remove()
  })

  it('Image omits aspect-ratio when dimensions are unknown, without throwing', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(Image, { src: 'a.png', alt: 'a' }))
    })

    const img = host.querySelector('img.claymark-img') as HTMLImageElement
    expect(img.style.aspectRatio).toBe('')

    act(() => root.unmount())
    host.remove()
  })

  // T-P7-04 criteria: "Tab cycles within the dialog; Escape closes and
  // restores focus"
  it('Lightbox traps Tab focus within the dialog and Escape closes + restores focus', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    const trigger = document.createElement('button')
    trigger.textContent = 'open'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    let closeCount = 0
    const onClose = (): void => {
      closeCount += 1
    }

    act(() => {
      root.render(
        createElement(Lightbox, {
          open: true,
          onClose,
          title: 'preview',
          children: [
            createElement('button', { key: 'first', id: 'first' }, 'first'),
            createElement('button', { key: 'last', id: 'last' }, 'last'),
          ],
        }),
      )
    })

    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')

    const first = host.querySelector('#first') as HTMLElement
    const last = host.querySelector('#last') as HTMLElement

    // Focus moved into the dialog on open.
    expect(dialog?.contains(document.activeElement)).toBe(true)

    // Shift+Tab from the first focusable wraps to the last.
    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true, cancelable: true }))
    // Tab forward from last wraps to first.
    expect(document.activeElement).toBe(first)

    first.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(last)

    // Escape closes (calls onClose) and restores focus to the trigger.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(closeCount).toBe(1)

    act(() => {
      root.render(
        createElement(Lightbox, {
          open: false,
          onClose,
          title: 'preview',
          children: createElement('span', null, 'x'),
        }),
      )
    })
    expect(document.activeElement).toBe(trigger)

    act(() => root.unmount())
    host.remove()
    trigger.remove()
  })

  // T-P8-03: a dialog with no accessible name is an ARIA violation an
  // undefined `title` (an image with no caption) must not produce.
  it('Lightbox falls back to a generic accessible name when no title is given', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    act(() => {
      root.render(
        createElement(Lightbox, {
          open: true,
          onClose: () => {},
          children: createElement('span', null, 'x'),
        }),
      )
    })

    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Image preview')

    act(() => root.unmount())
    host.remove()
  })

  // T-P7-05 criterion: `![alt](src "title")` renders a visible caption
  it('Image renders a visible figcaption from title, and nothing extra without one', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    act(() => {
      root.render(createElement(Image, { src: 'a.png', alt: 'a', title: 'A caption' }))
    })
    expect(host.querySelector('figure.claymark-figure')).not.toBeNull()
    expect(host.querySelector('figcaption.claymark-figcaption')?.textContent).toBe('A caption')
    expect(host.querySelector('img')?.getAttribute('title')).toBe('A caption')

    act(() => {
      root.render(createElement(Image, { src: 'a.png', alt: 'a' }))
    })
    expect(host.querySelector('figure')).toBeNull()
    expect(host.querySelector('img')).not.toBeNull()

    act(() => root.unmount())
    host.remove()
  })

  // T-P7-06 criterion: "System theme change propagates without remount"
  it('ThemeProvider reacts to a system prefers-color-scheme change without remounting', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined
    let matches = false
    const mql = {
      get matches() {
        return matches
      },
      media: '(prefers-color-scheme: dark)',
      addEventListener: (_type: string, handler: (event: MediaQueryListEvent) => void) => {
        changeHandler = handler
      },
      removeEventListener: () => {
        changeHandler = undefined
      },
    }
    const originalMatchMedia = window.matchMedia
    window.matchMedia = (() => mql) as unknown as typeof window.matchMedia

    function Probe(): ReactElement {
      const { theme } = useTheme()
      return createElement('span', { 'data-testid': 'theme' }, theme)
    }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(Probe)))
    })

    const rootDiv = host.querySelector('[data-theme]')
    expect(rootDiv?.getAttribute('data-theme')).toBe('light')

    matches = true
    act(() => {
      changeHandler?.({ matches: true } as MediaQueryListEvent)
    })

    const rootDivAfter = host.querySelector('[data-theme]')
    expect(rootDivAfter?.getAttribute('data-theme')).toBe('dark')
    // Same DOM node identity before/after — a real remount (unmount + new
    // mount) would have produced a new element instance here.
    expect(rootDivAfter).toBe(rootDiv)

    act(() => root.unmount())
    host.remove()
    window.matchMedia = originalMatchMedia
  })

  // T-P7-07 criteria: "Preference survives reload; manual choice overrides
  // system"
  it('ThemeToggle: manual choice overrides system and persists across a remount ("reload")', () => {
    window.localStorage.clear()
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined
    const mql = {
      matches: false, // system prefers light throughout this test
      media: '(prefers-color-scheme: dark)',
      addEventListener: (_type: string, handler: (event: MediaQueryListEvent) => void) => {
        changeHandler = handler
      },
      removeEventListener: () => {
        changeHandler = undefined
      },
    }
    const originalMatchMedia = window.matchMedia
    window.matchMedia = (() => mql) as unknown as typeof window.matchMedia

    const host = document.createElement('div')
    document.body.appendChild(host)
    let root = createRoot(host)
    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(ThemeToggle)))
    })

    expect(host.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('light')

    // Manual toggle to dark.
    act(() => {
      host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('claymark-theme')).toBe('dark')

    // A subsequent system "change to light" event no longer overrides the
    // manual choice.
    act(() => {
      changeHandler?.({ matches: false } as MediaQueryListEvent)
    })
    expect(host.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark')

    // Simulate a reload: unmount, discard in-memory state, remount fresh —
    // only localStorage carries over.
    act(() => root.unmount())
    host.remove()

    const host2 = document.createElement('div')
    document.body.appendChild(host2)
    root = createRoot(host2)
    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(ThemeToggle)))
    })
    expect(host2.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark')

    act(() => root.unmount())
    host2.remove()
    window.matchMedia = originalMatchMedia
    window.localStorage.clear()
  })

  // T-P7-08 criterion: "No light flash on dark-mode cold load" — the
  // blocking init script in index.html must set data-theme correctly
  // *synchronously*, before React ever runs, on a cold load with no stored
  // preference but a dark system preference.
  it("index.html's blocking init script sets data-theme='dark' synchronously on a dark-system cold load", () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/)
    expect(scriptMatch).not.toBeNull()
    const scriptBody = scriptMatch![1]!

    const setAttrCalls: Array<[string, string]> = []
    const fakeDocumentElement = {
      setAttribute: (name: string, value: string) => setAttrCalls.push([name, value]),
    }
    const fakeWindow = {
      matchMedia: () => ({ matches: true }), // system prefers dark
    }
    const fakeLocalStorage = {
      getItem: () => null, // no stored preference — a cold load
    }

    // Executed synchronously, exactly as a <script> in <head> would run,
    // with no await/microtask in between — proving there's no window where
    // an incorrect theme could paint first.
    const run = new Function(
      'document',
      'window',
      'localStorage',
      scriptBody,
    )
    run(fakeDocumentElement && { documentElement: fakeDocumentElement }, fakeWindow, fakeLocalStorage)

    // Phase 1.4 (android-to-desktop-checklist.md §6 AMOLED): the same
    // blocking script also sets data-amoled synchronously (no stored
    // preference here, so it resolves to 'false'), for the same
    // no-flash-on-cold-load reason as data-theme.
    expect(setAttrCalls).toEqual([
      ['data-theme', 'dark'],
      ['data-amoled', 'false'],
    ])
  })

  // T-P8-06: the only animated CSS property in the stylesheet (the
  // scroll-edge-shadow fade, T-P7-02) must be neutralized under
  // prefers-reduced-motion. This is pure CSS with no React component
  // surface, so — following the pattern used above for index.html's inline
  // script — it's verified by reading the real stylesheet source directly
  // rather than via a DOM/jsdom media-query simulation.
  it('claymark.css disables the scroll-shadow transition under prefers-reduced-motion', () => {
    const css = readFileSync(join(process.cwd(), 'src/theme/claymark.css'), 'utf8')
    const mediaMatch = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    )
    expect(mediaMatch).not.toBeNull()
    const body = mediaMatch![1]!
    expect(body).toContain('.claymark-table-scroll::before')
    expect(body).toContain('.claymark-table-scroll::after')
    expect(body).toMatch(/transition:\s*none/)
  })
})
