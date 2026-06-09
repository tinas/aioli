import { beforeEach, describe, expect, test } from 'vite-plus/test'

import { createStorage, parseAsInteger } from '../src/index'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('createStorage', () => {
  let storage: ReturnType<typeof createStorage>

  beforeEach(() => {
    storage = createStorage({ storage: 'memory', prefix: 'test:' })
  })

  test('prefix is accessible', () => {
    expect(storage.prefix).toBe('test:')
  })

  test('setItem and getItem with string', () => {
    storage.setItem('name', 'hello')
    expect(storage.getItem('name')).toBe('hello')
  })

  test('setItem and getItem with parser', () => {
    storage.setItem('count', 42, parseAsInteger)
    expect(storage.getItem('count', parseAsInteger)).toBe(42)
  })

  test('getItem returns null for missing key without default', () => {
    expect(storage.getItem('missing')).toBeNull()
  })

  test('getItem returns default value when key is missing', () => {
    const parser = parseAsInteger.default(0)
    expect(storage.getItem('missing', parser)).toBe(0)
  })

  test('getItem returns default when stored value fails to parse', () => {
    storage.setItem('bad', 'not-a-number')
    const parser = parseAsInteger.default(99)
    expect(storage.getItem('bad', parser)).toBe(99)
  })

  test('removeItem removes the key', () => {
    storage.setItem('key', 'value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
  })

  test('removeItems removes multiple keys', () => {
    storage.setItem('a', '1')
    storage.setItem('b', '2')
    storage.removeItems(['a', 'b'])
    expect(storage.has('a')).toBe(false)
    expect(storage.has('b')).toBe(false)
  })

  test('has returns correct boolean', () => {
    expect(storage.has('x')).toBe(false)
    storage.setItem('x', 'val')
    expect(storage.has('x')).toBe(true)
  })

  test('keys returns unprefixed keys', () => {
    storage.setItem('a', '1')
    storage.setItem('b', '2')
    expect(storage.keys().sort()).toEqual(['a', 'b'])
  })

  test('size returns number of prefixed keys', () => {
    storage.setItem('a', '1')
    storage.setItem('b', '2')
    expect(storage.size()).toBe(2)
  })

  test('clear removes only prefixed keys', () => {
    storage.setItem('a', '1')
    storage.setItem('b', '2')
    storage.clear()
    expect(storage.size()).toBe(0)
  })

  test('setItem with null removes the key', () => {
    storage.setItem('key', 'val')
    storage.setItem('key', null as any)
    expect(storage.has('key')).toBe(false)
  })

  test('setItem removes key if value equals default', () => {
    const parser = parseAsInteger.default(0)
    storage.setItem('count', 5, parser)
    expect(storage.has('count')).toBe(true)
    storage.setItem('count', 0, parser)
    expect(storage.has('count')).toBe(false)
  })

  test('subscribe receives change events', async () => {
    const events: any[] = []
    storage.subscribe(e => events.push(e))
    storage.setItem('key', 'val')
    await flush()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('change')
    expect(events[0].newValue).toBe('val')
  })

  test('subscribe with key filter', async () => {
    const events: any[] = []
    storage.subscribe(e => events.push(e), { key: 'target' })
    storage.setItem('target', 'yes')
    storage.setItem('other', 'no')
    await flush()
    expect(events.length).toBe(1)
    expect(events[0].key).toBe('test:target')
  })

  test('subscribe returns unsubscribe function', async () => {
    const events: any[] = []
    const unsub = storage.subscribe(e => events.push(e))
    unsub()
    storage.setItem('key', 'val')
    await flush()
    expect(events.length).toBe(0)
  })

  test('clear emits clear event', async () => {
    const events: any[] = []
    storage.subscribe(e => events.push(e))
    storage.setItem('a', '1')
    await flush()
    storage.clear()
    await flush()
    const clearEvents = events.filter(e => e.type === 'clear')
    expect(clearEvents.length).toBe(1)
    expect(clearEvents[0].prefix).toBe('test:')
  })

  test('batch groups operations', async () => {
    const events: any[] = []
    storage.subscribe(e => events.push(e))
    storage.batch(() => {
      storage.setItem('x', '1')
      storage.setItem('y', '2')
    })
    await flush()
    expect(events.length).toBe(2)
  })

  test('snapshot returns getSnapshot and subscribe', () => {
    storage.setItem('val', '10')
    const handle = storage.snapshot('val', parseAsInteger)
    expect(handle.getSnapshot()).toBe(10)
    expect(typeof handle.subscribe).toBe('function')
  })

  test('snapshot with default parser', () => {
    storage.setItem('val', 'hello')
    const handle = storage.snapshot('val')
    expect(handle.getSnapshot()).toBe('hello')
  })

  test('destroy prevents further events', async () => {
    const events: any[] = []
    storage.subscribe(e => events.push(e))
    storage.destroy()
    storage.setItem('key', 'val')
    await flush()
    expect(events.length).toBe(0)
  })
})
