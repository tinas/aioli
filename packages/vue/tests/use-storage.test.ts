import { createStorage, parseAsInteger, parseAsString } from '@aioli/core'
import { beforeEach, describe, expect, test } from 'vite-plus/test'
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
  describe('with explicit client', () => {
    let client: ReturnType<typeof createStorage>

    beforeEach(() => {
      client = createStorage({ storage: 'memory' })
    })

    test('returns default value when key does not exist', () => {
      const ref = useStorage({ key: 'count', parser: parseAsInteger.default(0), client })
      expect(ref.value).toBe(0)
    })

    test('returns null for parser without default when key does not exist', () => {
      const ref = useStorage({ key: 'missing', parser: parseAsString, client })
      expect(ref.value).toBeNull()
    })

    test('reads existing value from storage', () => {
      client.setItem({ key: 'name', value: 'hello', parser: parseAsString })
      const ref = useStorage({ key: 'name', parser: parseAsString.default(''), client })
      expect(ref.value).toBe('hello')
    })

    test('writes value to storage on set', () => {
      const ref = useStorage({ key: 'name', parser: parseAsString.default(''), client })
      ref.value = 'world'
      expect(client.getItem({ key: 'name', parser: parseAsString })).toBe('world')
    })

    test('removes key when set to null', () => {
      client.setItem({ key: 'name', value: 'hello', parser: parseAsString })
      const ref = useStorage({ key: 'name', parser: parseAsString, client })
      ref.value = null
      expect(client.getItem({ key: 'name' })).toBeNull()
    })

    test('reacts to external storage changes', async () => {
      const ref = useStorage({ key: 'count', parser: parseAsInteger.default(0), client })
      expect(ref.value).toBe(0)

      client.setItem({ key: 'count', value: 42, parser: parseAsInteger })
      await flush()

      expect(ref.value).toBe(42)
    })

    test('multiple refs for same key stay in sync', async () => {
      const ref1 = useStorage({ key: 'shared', parser: parseAsString.default(''), client })
      const ref2 = useStorage({ key: 'shared', parser: parseAsString.default(''), client })

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

    test('throws when no plugin is installed and no client provided', () => {
      const app = createApp({ setup: () => () => null })

      expect(() => {
        app.runWithContext(() => {
          useStorage({ key: 'x', parser: parseAsString.default('') })
        })
      }).toThrow('No StorageClients found')
    })
  })

  describe('scope disposal', () => {
    test('unsubscribes on scope dispose', async () => {
      const client = createStorage({ storage: 'memory' })
      const scope = effectScope()
      let ref: any

      scope.run(() => {
        ref = useStorage({ key: 'val', parser: parseAsInteger.default(0), client })
      })

      expect(ref.value).toBe(0)

      scope.stop()

      client.setItem({ key: 'val', value: 99, parser: parseAsInteger })
      await flush()

      expect(ref.value).toBe(0)
    })
  })
})
