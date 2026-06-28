import { createStorage } from '@aioli/core'
import { parseAsInteger, parseAsString } from '@aioli/parsers'
import { describe, expect, test } from 'vite-plus/test'
import { createApp } from 'vue'

import { createAioli } from '../src/plugin'
import { useLocalStorage, useMemoryStorage, useSessionStorage } from '../src/use-scoped-storage'

function withPlugin<T>(fn: () => T): T {
  const app = createApp({ setup: () => () => null })
  app.use(createAioli())
  let result: T
  app.runWithContext(() => {
    result = fn()
  })
  return result!
}

describe('useLocalStorage', () => {
  test('uses local storage type', () => {
    const ref = withPlugin(() =>
      useLocalStorage({ key: 'theme', parser: parseAsString.default('dark') }),
    )
    expect(ref.value).toBe('dark')
  })

  test('writes and reads values', () => {
    const storage = createStorage({ storage: 'memory' })
    const ref = useLocalStorage({ key: 'count', parser: parseAsInteger.default(0), storage })

    ref.value = 5
    expect(ref.value).toBe(5)
    expect(storage.getItem({ key: 'count', parser: parseAsInteger })).toBe(5)
  })
})

describe('useSessionStorage', () => {
  test('uses session storage type', () => {
    const ref = withPlugin(() =>
      useSessionStorage({ key: 'step', parser: parseAsInteger.default(1) }),
    )
    expect(ref.value).toBe(1)
  })

  test('writes and reads values', () => {
    const storage = createStorage({ storage: 'memory' })
    const ref = useSessionStorage({ key: 'step', parser: parseAsInteger.default(0), storage })

    ref.value = 3
    expect(ref.value).toBe(3)
    expect(storage.getItem({ key: 'step', parser: parseAsInteger })).toBe(3)
  })
})

describe('useMemoryStorage', () => {
  test('returns default value', () => {
    const ref = withPlugin(() =>
      useMemoryStorage({ key: 'temp', parser: parseAsString.default('init') }),
    )
    expect(ref.value).toBe('init')
  })

  test('writes and reads values', () => {
    const ref = withPlugin(() =>
      useMemoryStorage({ key: 'data', parser: parseAsString.default('') }),
    )
    ref.value = 'hello'
    expect(ref.value).toBe('hello')
  })

  test('different keys are independent', () => {
    const storage = createStorage({ storage: 'memory' })
    const ref1 = useMemoryStorage({ key: 'a', parser: parseAsString.default('x'), storage })
    const ref2 = useMemoryStorage({ key: 'b', parser: parseAsString.default('y'), storage })

    ref1.value = 'changed'
    expect(ref1.value).toBe('changed')
    expect(ref2.value).toBe('y')
  })
})
