import { beforeEach, describe, expect, test } from 'vite-plus/test'

import { MemoryAdapter, resolveAdapter } from '../src'

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter

  beforeEach(() => {
    adapter = new MemoryAdapter()
  })

  test('getItem returns null for missing key', () => {
    expect(adapter.getItem('missing')).toBeNull()
  })

  test('setItem and getItem', () => {
    adapter.setItem('key', 'value')
    expect(adapter.getItem('key')).toBe('value')
  })

  test('removeItem', () => {
    adapter.setItem('key', 'value')
    adapter.removeItem('key')
    expect(adapter.getItem('key')).toBeNull()
  })

  test('clear removes all items', () => {
    adapter.setItem('a', '1')
    adapter.setItem('b', '2')
    adapter.clear()
    expect(adapter.size()).toBe(0)
  })

  test('keys returns all keys', () => {
    adapter.setItem('a', '1')
    adapter.setItem('b', '2')
    expect(adapter.keys()).toEqual(['a', 'b'])
  })

  test('size returns count', () => {
    adapter.setItem('a', '1')
    adapter.setItem('b', '2')
    expect(adapter.size()).toBe(2)
  })
})

describe('resolveAdapter', () => {
  test('returns MemoryAdapter for memory type', () => {
    const adapter = resolveAdapter({
      storage: 'memory',
      prefix: '',
      crossTab: false,
    })
    expect(adapter).toBeInstanceOf(MemoryAdapter)
  })

  test('returns custom adapter if object provided', () => {
    const custom = new MemoryAdapter()
    const adapter = resolveAdapter({
      storage: custom,
      prefix: '',
      crossTab: false,
    })
    expect(adapter).toBe(custom)
  })
})
