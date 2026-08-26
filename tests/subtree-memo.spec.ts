import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Root, RootContent } from 'hast'
import type { ReactElement } from 'react'
import { SubtreeCache, toReact } from '../src/pipeline/to-react'

describe('G6 — Subtree memoization by node identity (T-P6-07)', () => {
  it('reuses the exact React element reference for a block whose hast node is unchanged, and produces a fresh one for a block that changed', () => {
    const para1: RootContent = {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{ type: 'text', value: 'one' }],
    }
    const para2v1: RootContent = {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{ type: 'text', value: 'two' }],
    }
    const tree1: Root = { type: 'root', children: [para1, para2v1] }
    const cache = new SubtreeCache()

    const el1 = toReact(tree1, { subtreeCache: cache })

    // Simulate a tail append: block 1 (para1) keeps the same node object;
    // block 2 is replaced with a new node (its text grew).
    const para2v2: RootContent = {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [{ type: 'text', value: 'two-updated' }],
    }
    const tree2: Root = { type: 'root', children: [para1, para2v2] }
    const el2 = toReact(tree2, { subtreeCache: cache })

    const children1 = (el1.props as { children: ReactElement[] }).children
    const children2 = (el2.props as { children: ReactElement[] }).children

    expect(children2[0]).toBe(children1[0]) // unchanged block: identical reference
    expect(children2[1]).not.toBe(children1[1]) // changed block: new reference

    expect(renderToStaticMarkup(el1)).toContain('one')
    expect(renderToStaticMarkup(el2)).toContain('two-updated')
  })

  it('without a subtreeCache, behaves as a plain one-shot conversion', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'hello' }] },
      ],
    }
    const element = toReact(tree)
    expect(renderToStaticMarkup(element)).toContain('hello')
  })
})
