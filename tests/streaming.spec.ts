import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectPartialConstruct, type PartialConstructKind } from '../src/pipeline/streaming/detect'
import { segmentBuffer } from '../src/pipeline/streaming/segment'
import { ReconcileState } from '../src/pipeline/streaming/reconcile'

const here = dirname(fileURLToPath(import.meta.url))

interface Fixture {
  label: string
  input: string
  expected: PartialConstructKind
}

const fixtures: Fixture[] = JSON.parse(
  readFileSync(join(here, 'fixtures/streaming/partial-constructs.json'), 'utf8'),
)

describe('G6 — Streaming: partial-construct detection (T-P6-01)', () => {
  it('has exactly 24 fixtures, per the roadmap acceptance criterion', () => {
    expect(fixtures).toHaveLength(24)
  })

  it.each(fixtures)('$label', ({ input, expected }) => {
    expect(detectPartialConstruct(input).kind).toBe(expected)
  })
})

function endsWithOpenFence(text: string): boolean {
  const lines = text.split('\n')
  let openChar: string | null = null
  let openLen = 0
  for (const line of lines) {
    const match = /^(\s{0,3})(`{3,}|~{3,})/.exec(line)
    if (!match) continue
    const marker = match[2]
    if (!marker) continue
    const char = marker.charAt(0)
    if (openChar === null) {
      openChar = char
      openLen = marker.length
    } else if (char === openChar && marker.length >= openLen) {
      openChar = null
      openLen = 0
    }
  }
  return openChar !== null
}

describe('G6 — Streaming: block-boundary segmentation (T-P6-02)', () => {
  it('never splits inside a fenced block, even one containing a blank line', () => {
    const segments = segmentBuffer(
      'before\n\n```js\nconst x = 1;\n\nconst y = 2;\n```\n\nafter\n',
    )
    expect(segments.map((s) => s.text)).toEqual([
      'before',
      '```js\nconst x = 1;\n\nconst y = 2;\n```',
      'after',
    ])
  })

  it('only the final segment may end mid-fence (a streaming tail)', () => {
    const segments = segmentBuffer('para\n\n```js\nconst x = 1;\n\nstill open')
    const nonFinal = segments.slice(0, -1)
    expect(nonFinal.every((s) => !endsWithOpenFence(s.text))).toBe(true)
  })

  it('produces no all-blank segments regardless of leading/trailing/consecutive blank lines', () => {
    const segments = segmentBuffer('\n\npara one\n\n\n\npara two\n\n')
    expect(segments.map((s) => s.text)).toEqual(['para one', 'para two'])
  })

  it('keeps multiple fenced blocks, each with an internal blank line, as separate segments', () => {
    const segments = segmentBuffer('```\na\n\nb\n```\n\n```\nc\n\nd\n```\n')
    expect(segments.map((s) => s.text)).toEqual(['```\na\n\nb\n```', '```\nc\n\nd\n```'])
  })
})

describe('G6 — Streaming: stable-prefix reconciliation (T-P6-03)', () => {
  it('reparses at most one block per appended character across a full document', () => {
    const doc = 'para one\n\npara two\n\npara three is a bit longer and grows token by token here'
    const state = new ReconcileState()
    let buffer = ''
    let maxReparsed = 0
    for (const char of doc) {
      buffer += char
      const { reparsedCount } = state.reconcile(buffer)
      maxReparsed = Math.max(maxReparsed, reparsedCount)
    }
    expect(maxReparsed).toBeLessThanOrEqual(1)
  })

  it('keeps a stable block\'s parsed tree reference identical once its text stops changing', () => {
    const state = new ReconcileState()
    let buffer = 'para one\n\n'
    const first = state.reconcile(buffer)
    const frozenTree = first.blocks[0]?.tree

    let identityHeld = true
    for (const char of 'para two grows char by char') {
      buffer += char
      const { blocks } = state.reconcile(buffer)
      const block = blocks.find((b) => b.text === 'para one')
      if (block && block.tree !== frozenTree) identityHeld = false
    }
    expect(identityHeld).toBe(true)
  })
})
