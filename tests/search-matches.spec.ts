import { describe, expect, it } from 'vitest'
import { findMatches, replaceAll, replaceOne } from '../src/app/searchMatches'

describe('searchMatches (checklist §5, Search/Replace)', () => {
  it('finds all case-insensitive matches with char offsets', () => {
    expect(findMatches('foo Foo FOO bar', 'foo')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
  })

  it('returns no matches for an empty query', () => {
    expect(findMatches('anything', '')).toEqual([])
  })

  it('replaceOne replaces exactly the matched range', () => {
    const result = replaceOne('hello world', { start: 6, end: 11 }, 'there')
    expect(result).toBe('hello there')
  })

  it('replaceAll replaces every occurrence without shifting later offsets', () => {
    const result = replaceAll('cat cat cat', 'cat', 'dog')
    expect(result).toBe('dog dog dog')
  })
})
