import { describe, expect, it } from 'vitest'
import { LRUCache } from '../src/pipeline/cache'

describe('G6 — LRU document cache (T-P6-05)', () => {
  it('evicts the oldest entry once capacity is exceeded, and a hit returns the identical reference', () => {
    const cache = new LRUCache<{ id: number }>({ capacity: 100 })
    const refs: Record<string, { id: number }> = {}

    for (let i = 1; i <= 101; i++) {
      const key = `k${i}`
      const value = { id: i }
      refs[key] = value
      cache.set(key, value)
    }

    expect(cache.has('k1')).toBe(false)
    expect(cache.size).toBe(100)
    expect(cache.get('k101')).toBe(refs['k101'])
    expect(cache.get('k50')).toBe(refs['k50'])
  })

  it('touching an entry via get() protects it from eviction as most-recently-used', () => {
    const cache = new LRUCache<number>({ capacity: 3 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.get('a') // touch — 'a' is now most-recently-used
    cache.set('d', 4) // should evict 'b', not 'a'

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
    expect(cache.has('c')).toBe(true)
    expect(cache.has('d')).toBe(true)
  })
})

describe('G6 — LRU cache byte-ceiling guard (T-P6-06)', () => {
  it('stays under the configured byte ceiling across a 10k-entry soak', () => {
    const cache = new LRUCache<string>({
      capacity: 1_000_000,
      byteCeiling: 1024 * 1024,
      sizeOf: (v) => (v as string).length,
    })
    const bigValue = 'x'.repeat(500)

    for (let i = 0; i < 10_000; i++) {
      cache.set(`doc${i}`, bigValue)
      expect(cache.bytes).toBeLessThanOrEqual(1024 * 1024)
    }
  })

  it('always keeps at least one entry even if a single value exceeds the ceiling', () => {
    const cache = new LRUCache<string>({ byteCeiling: 10, sizeOf: (v) => (v as string).length })
    cache.set('only', 'x'.repeat(1000))
    expect(cache.size).toBe(1)
    expect(cache.has('only')).toBe(true)
  })
})
