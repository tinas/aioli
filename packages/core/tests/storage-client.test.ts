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
    storage.setItem({ key: 'name', value: 'hello' })
    expect(storage.getItem({ key: 'name' })).toBe('hello')
  })

  test('setItem and getItem with parser', () => {
    storage.setItem({ key: 'count', value: 42, parser: parseAsInteger })
    expect(storage.getItem({ key: 'count', parser: parseAsInteger })).toBe(42)
  })

  test('getItem returns null for missing key without default', () => {
    expect(storage.getItem({ key: 'missing' })).toBeNull()
  })

  test('getItem returns default value when key is missing', () => {
    const parser = parseAsInteger.default(0)
    expect(storage.getItem({ key: 'missing', parser })).toBe(0)
  })

  test('getItem returns default when stored value fails to parse', () => {
    storage.setItem({ key: 'bad', value: 'not-a-number' })
    const parser = parseAsInteger.default(99)
    expect(storage.getItem({ key: 'bad', parser })).toBe(99)
  })

  test('removeItem removes the key', () => {
    storage.setItem({ key: 'key', value: 'value' })
    storage.removeItem({ key: 'key' })
    expect(storage.getItem({ key: 'key' })).toBeNull()
  })

  test('removeItem removes multiple keys via batch', async () => {
    storage.setItem({ key: 'a', value: '1' })
    storage.setItem({ key: 'b', value: '2' })
    await flush()

    let callCount = 0
    storage.subscribe({
      listener: () => {
        callCount++
      },
    })
    storage.batch(() => {
      storage.removeItem({ key: 'a' })
      storage.removeItem({ key: 'b' })
    })
    expect(storage.has('a')).toBe(false)
    expect(storage.has('b')).toBe(false)
    expect(callCount).toBe(0)
    await flush()
    expect(callCount).toBe(2)
  })

  test('has returns correct boolean', () => {
    expect(storage.has('x')).toBe(false)
    storage.setItem({ key: 'x', value: 'val' })
    expect(storage.has('x')).toBe(true)
  })

  test('keys returns unprefixed keys', () => {
    storage.setItem({ key: 'a', value: '1' })
    storage.setItem({ key: 'b', value: '2' })
    expect(storage.keys().sort()).toEqual(['a', 'b'])
  })

  test('size returns number of prefixed keys', () => {
    storage.setItem({ key: 'a', value: '1' })
    storage.setItem({ key: 'b', value: '2' })
    expect(storage.size()).toBe(2)
  })

  test('clear removes only prefixed keys', () => {
    storage.setItem({ key: 'a', value: '1' })
    storage.setItem({ key: 'b', value: '2' })
    storage.clear()
    expect(storage.size()).toBe(0)
  })

  test('setItem with null removes the key', () => {
    storage.setItem({ key: 'key', value: 'val' })
    storage.setItem({ key: 'key', value: null as any })
    expect(storage.has('key')).toBe(false)
  })

  test('setItem removes key if value equals default', () => {
    const parser = parseAsInteger.default(0)
    storage.setItem({ key: 'count', value: 5, parser })
    expect(storage.has('count')).toBe(true)
    storage.setItem({ key: 'count', value: 0, parser })
    expect(storage.has('count')).toBe(false)
  })

  test('subscribe receives add events', async () => {
    const events: any[] = []
    storage.subscribe({ listener: e => events.push(e) })
    storage.setItem({ key: 'key', value: 'val' })
    await flush()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('add')
    expect(events[0].newValue).toBe('val')
  })

  test('subscribe with key filter', async () => {
    const events: any[] = []
    storage.subscribe({ listener: e => events.push(e), keys: 'target' })
    storage.setItem({ key: 'target', value: 'yes' })
    storage.setItem({ key: 'other', value: 'no' })
    await flush()
    expect(events.length).toBe(1)
    expect(events[0].key).toBe('test:target')
  })

  test('subscribe returns unsubscribe function', async () => {
    const events: any[] = []
    const unsub = storage.subscribe({ listener: e => events.push(e) })
    unsub()
    storage.setItem({ key: 'key', value: 'val' })
    await flush()
    expect(events.length).toBe(0)
  })

  test('clear emits clear events per key', async () => {
    const events: any[] = []
    storage.setItem({ key: 'a', value: '1' })
    await flush()
    storage.subscribe({ listener: e => events.push(e) })
    storage.clear()
    await flush()
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('clear')
    expect(events[0].key).toBe('test:a')
    expect(events[0].oldValue).toBe('1')
    expect(events[0].newValue).toBeNull()
  })

  test('clear batches multiple key removals into a single flush', async () => {
    storage.setItem({ key: 'a', value: '1' })
    storage.setItem({ key: 'b', value: '2' })
    storage.setItem({ key: 'c', value: '3' })
    await flush()

    let callCount = 0
    storage.subscribe({
      listener: () => {
        callCount++
      },
    })
    storage.clear()
    expect(callCount).toBe(0)
    await flush()
    expect(callCount).toBe(3)
  })

  test('batch groups operations', async () => {
    const events: any[] = []
    storage.subscribe({ listener: e => events.push(e) })
    storage.batch(() => {
      storage.setItem({ key: 'x', value: '1' })
      storage.setItem({ key: 'y', value: '2' })
    })
    await flush()
    expect(events.length).toBe(2)
  })

  test('snapshot returns getSnapshot and subscribe', () => {
    storage.setItem({ key: 'val', value: '10' })
    const handle = storage.snapshot({ key: 'val', parser: parseAsInteger })
    expect(handle.getSnapshot()).toBe(10)
    expect(typeof handle.subscribe).toBe('function')
  })

  test('snapshot with default parser', () => {
    storage.setItem({ key: 'val', value: 'hello' })
    const handle = storage.snapshot({ key: 'val' })
    expect(handle.getSnapshot()).toBe('hello')
  })

  test('destroy prevents further events', async () => {
    const events: any[] = []
    storage.subscribe({ listener: e => events.push(e) })
    storage.destroy()
    storage.setItem({ key: 'key', value: 'val' })
    await flush()
    expect(events.length).toBe(0)
  })
})
