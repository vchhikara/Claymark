import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { toHtml } from 'hast-util-to-html'
import { fastPathRender, isFastPathEligible } from '../src/pipeline/fast-path'
import { processor } from '../src/pipeline/processor'
import type { Root } from 'hast'

describe('G6 — Short-message fast path (T-P6-08)', () => {
  it('never imports the unified processor — structurally bypasses it, not just behaviorally', () => {
    const source = readFileSync(join(process.cwd(), 'src/pipeline/fast-path.ts'), 'utf8')
    expect(source).not.toMatch(/from ['"]\.\/processor['"]/)
    expect(source).not.toMatch(/unified\(/)
  })

  it('accepts plain text with no Markdown syntax', () => {
    expect(isFastPathEligible('hello world, nice to meet you')).toBe(true)
    expect(isFastPathEligible('just a single short sentence')).toBe(true)
  })

  it('rejects text containing any Markdown-significant character', () => {
    for (const text of [
      '*emphasis*',
      '_emphasis_',
      '`code`',
      '# heading',
      '[link](url)',
      '> quote',
      'a | table | row',
      '~strike~',
      '<b>html</b>',
      'a &amp; b',
      '- list item',
      '1. list item',
    ]) {
      expect(isFastPathEligible(text)).toBe(false)
    }
  })

  it('rejects multi-block text (blank-line separated)', () => {
    expect(isFastPathEligible('para one\n\npara two')).toBe(false)
  })

  it('rejects empty text', () => {
    expect(isFastPathEligible('')).toBe(false)
  })

  it('produces the same rendered output as the full pipeline for eligible plain text', () => {
    const text = 'a plain short message with no markdown syntax at all'
    const fastTree = fastPathRender(text)
    const fullTree = processor.runSync(processor.parse(text)) as Root

    expect(toHtml(fastTree)).toBe(toHtml(fullTree))
  })
})
