import { createStorage, parseAsInteger, parseAsString } from '@aioli/core'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { createApp, effectScope } from 'vue'

import { createAioli } from '../src/plugin'
import { useStorage } from '../src/use-storage'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function withPlugin<T>(fn: () => T): T {
  const app = createApp({ setup: () => () => null })
  app.use(createAioli())
  let result: T
  app.runWithContext(() => {
    result = fn()
  })
  return result!
}

describe('useStorage', () => {
  describe('with explicit storage client', () => {
    let storage: ReturnType<typeof createStorage>

    beforeEach(() => {
      storage = createStorage({ storage: 'memory' })
    })

    test('returns default value when key does not exist', () => {
      const ref = useStorage({ key: 'count', parser: parseAsInteger.default(0), storage })
      expect(ref.value).toBe(0)
    })

    test('returns null for parser without default when key does not exist', () => {
      const ref = useStorage({ key: 'missing', parser: parseAsString, storage })
      expect(ref.value).toBeNull()
    })

    test('reads existing value from storage', () => {
      storage.setItem({ key: 'name', value: 'hello', parser: parseAsString })
      const ref = useStorage({ key: 'name', parser: parseAsString.default(''), storage })
      expect(ref.value).toBe('hello')
    })

    test('writes value to storage on set', () => {
      const ref = useStorage({ key: 'name', parser: parseAsString.default(''), storage })
      ref.value = 'world'
      expect(storage.getItem({ key: 'name', parser: parseAsString })).toBe('world')
    })

    test('removes key when set to null', () => {
      storage.setItem({ key: 'name', value: 'hello', parser: parseAsString })
      const ref = useStorage({ key: 'name', parser: parseAsString, storage })
      ref.value = null
      expect(storage.getItem({ key: 'name' })).toBeNull()
    })

    test('reacts to external storage changes', async () => {
      const ref = useStorage({ key: 'count', parser: parseAsInteger.default(0), storage })
      expect(ref.value).toBe(0)

      storage.setItem({ key: 'count', value: 42, parser: parseAsInteger })
      await flush()

      expect(ref.value).toBe(42)
    })

    test('multiple refs for same key stay in sync', async () => {
      const ref1 = useStorage({ key: 'shared', parser: parseAsString.default(''), storage })
      const ref2 = useStorage({ key: 'shared', parser: parseAsString.default(''), storage })

      ref1.value = 'updated'
      await flush()

      expect(ref2.value).toBe('updated')
    })
  })

  describe('with plugin', () => {
    test('uses memory client by default', () => {
      const ref = withPlugin(() => useStorage({ key: 'x', parser: parseAsString.default('hi') }))
      expect(ref.value).toBe('hi')
    })

    test('uses local storage when storage is "local"', () => {
      const ref = withPlugin(() =>
        useStorage({ key: 'y', parser: parseAsString.default('yo'), storage: 'local' }),
      )
      expect(ref.value).toBe('yo')
    })

    test('uses session storage when storage is "session"', () => {
      const ref = withPlugin(() =>
        useStorage({ key: 'z', parser: parseAsString.default('ok'), storage: 'session' }),
      )
      expect(ref.value).toBe('ok')
    })

    test('falls back to memory when no plugin is installed', () => {
      const app = createApp({ setup: () => () => null })
      let ref: any

      app.runWithContext(() => {
        ref = useStorage({ key: 'x', parser: parseAsString.default('fallback') })
      })

      expect(ref.value).toBe('fallback')
    })
  })

  describe('scope disposal', () => {
    test('unsubscribes on scope dispose', async () => {
      const storage = createStorage({ storage: 'memory' })
      const scope = effectScope()
      let ref: any

      scope.run(() => {
        ref = useStorage({ key: 'val', parser: parseAsInteger.default(0), storage })
      })

      expect(ref.value).toBe(0)

      scope.stop()

      storage.setItem({ key: 'val', value: 99, parser: parseAsInteger })
      await flush()

      expect(ref.value).toBe(0)
    })
  })

  describe('warnings', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      warnSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })

    test('warns when called outside effect scope', () => {
      const storage = createStorage({ storage: 'memory' })
      useStorage({ key: 'x', parser: parseAsString.default(''), storage })

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('should only be used inside a setup() function'),
      )
    })

    test('does not warn when called inside effect scope', () => {
      const storage = createStorage({ storage: 'memory' })
      const scope = effectScope()

      scope.run(() => {
        useStorage({ key: 'x', parser: parseAsString.default(''), storage })
      })

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('should only be used inside a setup() function'),
      )

      scope.stop()
    })

    test('warns and falls back to memory when no plugin is installed', () => {
      const app = createApp({ setup: () => () => null })

      app.runWithContext(() => {
        const ref = useStorage({ key: 'x', parser: parseAsString.default('ok') })
        expect(ref.value).toBe('ok')
      })

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No plugin found'))
    })
  })
})
