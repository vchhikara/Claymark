import { describe, expect, it } from 'vitest'
import { collectHeadings } from '../src/app/toc'

describe('collectHeadings (checklist §5, TOC/outline dialog)', () => {
  it('collects ATX headings with their level and line number', () => {
    const source = '# Title\n\nSome text\n\n## Section\n\nMore text\n\n### Sub'
    expect(collectHeadings(source)).toEqual([
      { level: 1, text: 'Title', line: 0 },
      { level: 2, text: 'Section', line: 4 },
      { level: 3, text: 'Sub', line: 8 },
    ])
  })

  it('ignores heading-like lines inside fenced code blocks', () => {
    const source = '# Real\n\n```\n# not a heading\n```\n\n## Also real'
    const headings = collectHeadings(source)
    expect(headings.map((h) => h.text)).toEqual(['Real', 'Also real'])
  })

  it('returns an empty array for source with no headings', () => {
    expect(collectHeadings('just some text\nno headings here')).toEqual([])
  })
})
