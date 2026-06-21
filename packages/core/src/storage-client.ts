import { parseAsString, resolveDefault } from '@aioli/parsers'
import type { Parser, ParserWithDefault } from '@aioli/parsers'

import { resolveAdapter } from './adapters/index'
import { createCrossTabSync, type CrossTabSync } from './cross-tab'
import { scheduler } from './scheduler'
import type {
  ResolvedStorageOptions,
  Subscribable,
  StorageClient,
  StorageOptions,
  StorageEvent,
} from './types'

function resolveOptions(options?: StorageOptions): ResolvedStorageOptions {
  return {
    storage: options?.storage ?? 'memory',
    prefix: options?.prefix ?? '',
    crossTab: options?.crossTab ?? true,
    onError: options?.onError,
  }
}

export function createStorage(options?: StorageOptions): StorageClient {
  const config = resolveOptions(options)
  const { prefix } = config

  const adapter = resolveAdapter(config)

  const globalListeners = new Set<(event: StorageEvent) => void>()
  const keyListeners = new Map<string, Set<(event: StorageEvent) => void>>()
  let crossTab: CrossTabSync | null = null
  let destroyed = false

  crossTab = createCrossTabSync(config)

  if (crossTab) {
    crossTab.subscribe(event => {
      dispatch(event)
    })
  }

  function dispatch(event: StorageEvent): void {
    if (destroyed) return
    scheduler.schedule(() => {
      for (const listener of globalListeners) {
        listener(event)
      }
      const keySet = keyListeners.get(event.key)
      if (keySet) {
        for (const listener of keySet) {
          listener(event)
        }
      }
    })
  }

  function notify(event: StorageEvent): void {
    dispatch(event)
    crossTab?.broadcast(event)
  }

  function resolveKey(key: string): string {
    return `${prefix}${key}`
  }

  function remove(key: string, type: 'remove' | 'clear' = 'remove'): void {
    const resolved = resolveKey(key)
    const oldValue = adapter.getItem(resolved)
    if (oldValue === null) return
    adapter.removeItem(resolved)
    notify({ type, key: resolved, oldValue, newValue: null })
  }

  function getDefaultValue<T>(parser: Parser<T>): T | null {
    if ('defaultValue' in parser) {
      return resolveDefault((parser as ParserWithDefault<T, T>).defaultValue)
    }
    return null
  }

  const client: StorageClient = {
    get prefix() {
      return prefix
    },

    get adapter() {
      return adapter
    },

    getItem(options: { key: string; parser?: Parser<any> }): any {
      const resolved = resolveKey(options.key)
      const raw = adapter.getItem(resolved)
      const resolvedParser = options.parser ?? parseAsString
      if (raw === null) {
        return getDefaultValue(resolvedParser)
      }
      return resolvedParser.parse(raw) ?? getDefaultValue(resolvedParser)
    },

    setItem<T>(options: { key: string; value: T; parser?: Parser<T> }): void {
      const { key, value, parser } = options
      const resolved = resolveKey(key)
      const resolvedParser = parser ?? (parseAsString as unknown as Parser<T>)

      if (value === null || value === undefined) {
        remove(key)
        return
      }

      if ('defaultValue' in resolvedParser) {
        const def = resolveDefault((resolvedParser as ParserWithDefault<T, T>).defaultValue)
        if (resolvedParser.serialize(value) === resolvedParser.serialize(def)) {
          remove(key)
          return
        }
      }

      const oldValue = adapter.getItem(resolved)
      const newValue = resolvedParser.serialize(value)

      if (oldValue === newValue) return

      adapter.setItem(resolved, newValue)
      notify({
        type: oldValue === null ? 'add' : 'change',
        key: resolved,
        oldValue,
        newValue,
      })
    },

    removeItem(options: { key: string }): void {
      remove(options.key)
    },

    clear(): void {
      const keys = client.keys()

      scheduler.batch(() => {
        for (const key of keys) {
          remove(key, 'clear')
        }
      })
    },

    has(key: string): boolean {
      return adapter.getItem(resolveKey(key)) !== null
    },

    keys(): string[] {
      return adapter
        .keys()
        .filter(k => k.startsWith(prefix))
        .map(k => k.slice(prefix.length))
    },

    size(): number {
      return adapter.keys().filter(k => k.startsWith(prefix)).length
    },

    subscribe(options: {
      listener: (event: StorageEvent) => void
      keys?: string | string[]
    }): () => void {
      const { listener, keys } = options

      if (!keys) {
        globalListeners.add(listener)
        return () => {
          globalListeners.delete(listener)
        }
      }

      const targetKeys = (Array.isArray(keys) ? keys : [keys]).map(resolveKey)

      for (const resolved of targetKeys) {
        if (!keyListeners.has(resolved)) {
          keyListeners.set(resolved, new Set())
        }
        keyListeners.get(resolved)!.add(listener)
      }

      return () => {
        for (const resolved of targetKeys) {
          const set = keyListeners.get(resolved)
          if (set) {
            set.delete(listener)
            if (set.size === 0) keyListeners.delete(resolved)
          }
        }
      }
    },

    batch(fn: () => void): void {
      scheduler.batch(fn)
    },

    snapshot<T>(options: {
      key: string
      parser?: Parser<T> | ParserWithDefault<T, T>
    }): Subscribable<T | null> {
      return {
        getSnapshot: () => client.getItem({ key: options.key, parser: options.parser as any }),
        subscribe: (onStoreChange: () => void) => {
          return client.subscribe({ listener: onStoreChange as any, keys: options.key })
        },
      }
    },

    destroy(): void {
      destroyed = true
      crossTab?.destroy()
      globalListeners.clear()
      keyListeners.clear()
    },
  }

  return client
}
