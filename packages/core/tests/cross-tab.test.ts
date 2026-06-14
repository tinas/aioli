// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from 'vite-plus/test'

import { createCrossTabSync, type CrossTabSync } from '../src/cross-tab'
import type { ResolvedStorageOptions, StorageEvent } from '../src/types'

function createConfig(overrides?: Partial<ResolvedStorageOptions>): ResolvedStorageOptions {
  return {
    storage: 'local',
    prefix: 'test:',
    crossTab: true,
    ...overrides,
  }
}

describe('createCrossTabSync', () => {
  test('returns null when crossTab is false', () => {
    const sync = createCrossTabSync(createConfig({ crossTab: false }))
    expect(sync).toBeNull()
  })

  test('returns null in SSR (no window)', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error
    delete globalThis.window
    const sync = createCrossTabSync(createConfig())
    expect(sync).toBeNull()
    globalThis.window = originalWindow
  })
})

describe('CrossTabSync - BroadcastChannel', () => {
  let sync: CrossTabSync

  beforeEach(() => {
    sync = createCrossTabSync(createConfig())!
  })

  test('subscribe receives broadcast events', async () => {
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:name',
      oldValue: null,
      newValue: 'hello',
    })
    channel.close()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(events.length).toBe(1)
    expect(events[0].key).toBe('test:name')
    expect(events[0].newValue).toBe('hello')
    sync.destroy()
  })

  test('broadcast sends to other tabs via BroadcastChannel', async () => {
    const received: StorageEvent[] = []
    const receiver = new BroadcastChannel('ailoi:test:')
    receiver.onmessage = (e: MessageEvent) => received.push(e.data)

    sync.broadcast({
      type: 'change',
      key: 'test:count',
      oldValue: '1',
      newValue: '2',
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(received.length).toBe(1)
    expect(received[0].key).toBe('test:count')
    receiver.close()
    sync.destroy()
  })

  test('destroy cleans up listeners', async () => {
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))
    sync.destroy()

    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:x',
      oldValue: null,
      newValue: 'val',
    })
    channel.close()

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(events.length).toBe(0)
  })
})

describe('CrossTabSync - native storage', () => {
  test('ignores events with null key', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(new StorageEvent('storage', { key: null, oldValue: null, newValue: null }))

    expect(events.length).toBe(0)
    sync.destroy()
  })

  test('ignores events with wrong prefix', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'other:key',
        oldValue: null,
        newValue: 'value',
      }),
    )

    expect(events.length).toBe(0)
    sync.destroy()
  })

  test('dispatches events matching prefix', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'test:key',
        oldValue: 'old',
        newValue: 'new',
      }),
    )

    expect(events.length).toBe(1)
    expect(events[0]).toEqual({
      type: 'change',
      key: 'test:key',
      oldValue: 'old',
      newValue: 'new',
    })
    sync.destroy()
  })
})

describe('CrossTabSync - subscribe', () => {
  test('unsubscribe stops receiving events', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    const unsub = sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:a', oldValue: null, newValue: '1' }),
    )
    expect(events.length).toBe(1)

    unsub()

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:b', oldValue: null, newValue: '2' }),
    )
    expect(events.length).toBe(1)

    sync.destroy()
  })

  test('multiple subscribers all receive events', () => {
    const sync = createCrossTabSync(createConfig())!
    const events1: StorageEvent[] = []
    const events2: StorageEvent[] = []
    sync.subscribe(e => events1.push(e))
    sync.subscribe(e => events2.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:key', oldValue: null, newValue: 'val' }),
    )

    expect(events1.length).toBe(1)
    expect(events2.length).toBe(1)
    sync.destroy()
  })
})

describe('CrossTabSync - dedup', () => {
  test('native storage event is skipped if already received via BroadcastChannel', async () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []

    // When BC delivers an event, markSeen is called synchronously.
    // If a native storage event fires in the same task (before queueMicrotask clears seen),
    // it should be deduped.
    sync.subscribe(e => {
      events.push(e)

      // Simulate: native storage event fires right after BC delivery (same task)
      if (events.length === 1) {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: e.key,
            oldValue: e.oldValue,
            newValue: e.newValue,
          }),
        )
      }
    })

    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:key',
      oldValue: null,
      newValue: 'value',
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    // Should be 1 — native event was deduped
    expect(events.length).toBe(1)

    channel.close()
    sync.destroy()
  })

  test('BroadcastChannel event is deduped if native arrived in the same dedup window', async () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    // Native storage event arrives first (synchronous, in current task)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'test:key',
        oldValue: null,
        newValue: 'value',
      }),
    )

    expect(events.length).toBe(1)

    // BC message arrives before setTimeout(0) clears the seen set — deduped
    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:key',
      oldValue: null,
      newValue: 'value',
    })

    await new Promise(resolve => setTimeout(resolve, 50))

    // Still 1 — BC event was deduped within the setTimeout(0) window
    expect(events.length).toBe(1)

    channel.close()
    sync.destroy()
  })

  test('different keys are not deduped against each other', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:a', oldValue: null, newValue: 'val' }),
    )
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:b', oldValue: null, newValue: 'val' }),
    )

    expect(events.length).toBe(2)
    expect(events[0].key).toBe('test:a')
    expect(events[1].key).toBe('test:b')
    sync.destroy()
  })

  test('same key with different values are not deduped', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:key', oldValue: null, newValue: 'first' }),
    )
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:key', oldValue: 'first', newValue: 'second' }),
    )

    expect(events.length).toBe(2)
    expect(events[0].newValue).toBe('first')
    expect(events[1].newValue).toBe('second')
    sync.destroy()
  })
})

describe('CrossTabSync - no BroadcastChannel fallback', () => {
  test('works with native storage events when BroadcastChannel is unavailable', () => {
    const originalBC = globalThis.BroadcastChannel
    // @ts-expect-error
    delete globalThis.BroadcastChannel

    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'test:key', oldValue: null, newValue: 'val' }),
    )

    expect(events.length).toBe(1)
    expect(events[0].key).toBe('test:key')

    sync.destroy()
    globalThis.BroadcastChannel = originalBC
  })

  test('broadcast is a no-op when BroadcastChannel is unavailable', () => {
    const originalBC = globalThis.BroadcastChannel
    // @ts-expect-error
    delete globalThis.BroadcastChannel

    const sync = createCrossTabSync(createConfig())!

    // Should not throw
    expect(() =>
      sync.broadcast({ type: 'add', key: 'test:key', oldValue: null, newValue: 'val' }),
    ).not.toThrow()

    sync.destroy()
    globalThis.BroadcastChannel = originalBC
  })
})

describe('CrossTabSync - event loop', () => {
  test('BroadcastChannel messages are delivered asynchronously', async () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:async',
      oldValue: null,
      newValue: 'value',
    })
    channel.close()

    // Should NOT be delivered synchronously
    expect(events.length).toBe(0)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(events.length).toBe(1)
    sync.destroy()
  })

  test('native storage events are delivered synchronously', () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'test:sync',
        oldValue: null,
        newValue: 'immediate',
      }),
    )

    // Should be delivered inline, no async tick needed
    expect(events.length).toBe(1)
    expect(events[0].newValue).toBe('immediate')

    sync.destroy()
  })

  test('dedup seen set clears after macrotask', async () => {
    const sync = createCrossTabSync(createConfig())!
    const events: StorageEvent[] = []
    sync.subscribe(e => events.push(e))

    // Simulate BC delivering an event (marks it as seen)
    const channel = new BroadcastChannel('ailoi:test:')
    channel.postMessage({
      type: 'add',
      key: 'test:dup',
      oldValue: null,
      newValue: 'val',
    })

    // Wait for BC message to arrive and mark the dedup set
    await new Promise<void>(resolve => setTimeout(resolve, 50))
    expect(events.length).toBe(1)

    // Wait for setTimeout(0) to clear the seen set
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    // Now the same native event should NOT be deduped (seen set cleared)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'test:dup',
        oldValue: null,
        newValue: 'val',
      }),
    )

    expect(events.length).toBe(2)

    channel.close()
    sync.destroy()
  })
})
