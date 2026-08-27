import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface TableContainerProps {
  children: ReactNode
}

// FR-4.x / T-P7-01: wide tables scroll horizontally within their own
// container, never the page. Mirrors the CodeBlock.tsx pattern (T-P4 scroll
// container) — the `table` itself (already produced with the
// `claymark-table` class by map.tsx) is passed through as children, wrapped
// only in a scroll container div.
//
// T-P7-02: scroll-edge shadow indicators. `data-overflow-left`/
// `data-overflow-right` attributes are set only while there is more content
// to scroll to in that direction — CSS (claymark.css) renders a gradient
// shadow conditioned on each attribute, so the indicator is absent whenever
// the table doesn't overflow at all (both attributes false at mount).
export function TableContainer({ children }: TableContainerProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [overflowLeft, setOverflowLeft] = useState(false)
  const [overflowRight, setOverflowRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = (): void => {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setOverflowLeft(scrollLeft > 0)
      // 1px tolerance for sub-pixel layout rounding.
      setOverflowRight(scrollLeft + clientWidth < scrollWidth - 1)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })

    // jsdom (unit tests) has no ResizeObserver global; real browsers always
    // do, so this only ever skips the resize-tracking behavior under test.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined
    observer?.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      className="claymark-table-scroll"
      data-overflow-left={overflowLeft ? 'true' : undefined}
      data-overflow-right={overflowRight ? 'true' : undefined}
    >
      {children}
    </div>
  )
}
