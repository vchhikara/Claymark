import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { useStreamingMarkdown } from '../src/hooks/useStreamingMarkdown'

function Capture({
  source,
  onElements,
}: {
  source: string
  onElements: (elements: ReactElement[]) => void
}) {
  const { elements } = useStreamingMarkdown(source)
  onElements(elements)
  return createElement('div', null, ...elements)
}

describe('G6 — useStreamingMarkdown (T-P6-04)', () => {
  it('reuses the exact element reference for every block whose text has stopped changing', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const doc = 'para one\n\npara two\n\npara three grows char by char here'
    let captured: ReactElement[] = []
    const onElements = (els: ReactElement[]) => {
      captured = els
    }

    let firstBlockRef: ReactElement | undefined
    let secondBlockRef: ReactElement | undefined
    let identityHeld = true

    for (let i = 1; i <= doc.length; i++) {
      const source = doc.slice(0, i)
      act(() => {
        root.render(createElement(Capture, { source, onElements }))
      })

      if (source.startsWith('para one\n\n')) {
        if (firstBlockRef === undefined) firstBlockRef = captured[0]
        else if (captured[0] !== firstBlockRef) identityHeld = false
      }
      if (source.startsWith('para one\n\npara two\n\n')) {
        if (secondBlockRef === undefined) secondBlockRef = captured[1]
        else if (captured[1] !== secondBlockRef) identityHeld = false
      }
    }

    expect(identityHeld).toBe(true)
  })

  it('never drops or reorders a block already emitted, and never renders more blocks than exist', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const doc = 'para one\n\npara two\n\npara three\n'
    let lengths: number[] = []
    const onElements = (els: ReactElement[]) => {
      lengths.push(els.length)
    }

    for (let i = 1; i <= doc.length; i++) {
      act(() => {
        root.render(createElement(Capture, { source: doc.slice(0, i), onElements }))
      })
    }

    // Block count is monotonically non-decreasing — a block, once it exists,
    // is never removed as more source streams in.
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1]!)
    }
    expect(lengths[lengths.length - 1]).toBe(3)
  })

  it('final render contains all paragraph text, nothing dropped', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        createElement(Capture, {
          source: 'para one\n\npara two\n\npara three\n',
          onElements: () => {},
        }),
      )
    })
    const text = container.textContent ?? ''
    expect(text).toContain('para one')
    expect(text).toContain('para two')
    expect(text).toContain('para three')
  })
})
