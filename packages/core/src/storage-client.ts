import { resolveAdapter } from './adapters/index'
import { createCrossTabSync, type CrossTabSync } from './cross-tab'
import { parseAsString, resolveDefault } from './parsers'
import { scheduler } from './scheduler'
import type {
  CrossTabOptions,
  Parser,
  ParserWithDefault,
  ResolvedStorageOptions,
  SnapshotHandle,
  StorageChangeEvent,
  StorageClient,
  StorageOptions,
  StorageEvent,
  SubscribeOptions,
} from './types'

function resolveOptions(options?: StorageOptions): ResolvedStorageOptions {
  const crossTab: CrossTabOptions =
    typeof options?.crossTab === 'boolean'
      ? { enabled: options.crossTab }
      : (options?.crossTab ?? { enabled: false })

  return {
    storage: options?.storage ?? 'memory',
    prefix: options?.prefix ?? '',
    ssr: options?.ssr ?? false,
    crossTab,
    onError: options?.onError,
  }
}

export function createStorage(options?: StorageOptions): StorageClient {
  const config = resolveOptions(options)
  const { prefix } = config

  const adapter = resolveAdapter(config)

  const globalListeners = new Set<(event: StorageEvent) => void>()
  const keyListeners = new Map<string, Set<(event: StorageChangeEvent) => void>>()
  let crossTab: CrossTabSync | null = null
  let destroyed = false

  crossTab = createCrossTabSync(config)

  if (crossTab) {
    crossTab.subscribe(event => {
      emit(event)
      notifyKeyListeners(event.key, event)
    })
  }

  function emit(event: StorageEvent): void {
    if (destroyed) return
    scheduler.schedule(() => {
      for (const listener of globalListeners) {
        listener(event)
      }
    })
  }

  function notifyKeyListeners(key: string, event: StorageChangeEvent): void {
    const listeners = keyListeners.get(key)
    if (!listeners) return
    scheduler.schedule(() => {
      for (const listener of listeners) {
        listener(event)
      }
    })
  }

  function notify(event: StorageChangeEvent): void {
    emit(event)
    notifyKeyListeners(event.key, event)
    crossTab?.broadcast(event)
  }

  function resolveKey(key: string): string {
    return `${prefix}${key}`
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

    getItem(key: string, parser?: Parser<any>): any {
      const resolved = resolveKey(key)
      const raw = adapter.getItem(resolved)
      const resolvedParser = parser ?? parseAsString
      if (raw === null) {
        return getDefaultValue(resolvedParser)
      }
      return resolvedParser.parse(raw) ?? getDefaultValue(resolvedParser)
    },

    setItem<T>(key: string, value: T, parser?: Parser<T>): void {
      const resolved = resolveKey(key)
      const resolvedParser = parser ?? (parseAsString as unknown as Parser<T>)

      if (value === null || value === undefined) {
        client.removeItem(key)
        return
      }

      if ('defaultValue' in resolvedParser) {
        const def = resolveDefault((resolvedParser as ParserWithDefault<T, T>).defaultValue)
        if (resolvedParser.serialize(value) === resolvedParser.serialize(def)) {
          client.removeItem(key)
          return
        }
      }

      const oldValue = adapter.getItem(resolved)
      const newValue = resolvedParser.serialize(value)
      adapter.setItem(resolved, newValue)

      const event: StorageChangeEvent = { type: 'change', key: resolved, oldValue, newValue }
      notify(event)
    },

    removeItem(key: string): void {
      const resolved = resolveKey(key)
      const oldValue = adapter.getItem(resolved)
      adapter.removeItem(resolved)

      const event: StorageChangeEvent = { type: 'change', key: resolved, oldValue, newValue: null }
      notify(event)
    },

    removeItems(keys: string[]): void {
      scheduler.batch(() => {
        for (const key of keys) {
          client.removeItem(key)
        }
      })
    },

    clear(opts?: { all?: boolean }): void {
      if (opts?.all) {
        adapter.clear()
      } else {
        for (const key of adapter.keys()) {
          if (key.startsWith(prefix)) {
            adapter.removeItem(key)
          }
        }
      }
      emit({ type: 'clear', prefix })
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

    subscribe(listener: (event: StorageEvent) => void, options?: SubscribeOptions): () => void {
      if (!options?.key && !options?.keys) {
        globalListeners.add(listener)
        return () => {
          globalListeners.delete(listener)
        }
      }

      const targetKeys = options.keys ? options.keys.map(resolveKey) : [resolveKey(options.key!)]

      const wrappedListener = listener as (event: StorageChangeEvent) => void

      for (const resolved of targetKeys) {
        if (!keyListeners.has(resolved)) {
          keyListeners.set(resolved, new Set())
        }
        keyListeners.get(resolved)!.add(wrappedListener)
      }

      return () => {
        for (const resolved of targetKeys) {
          const set = keyListeners.get(resolved)
          if (set) {
            set.delete(wrappedListener)
            if (set.size === 0) keyListeners.delete(resolved)
          }
        }
      }
    },

    batch(fn: () => void): void {
      scheduler.batch(fn)
    },

    snapshot<T>(
      key: string,
      parser?: Parser<T> | ParserWithDefault<T, T>,
    ): SnapshotHandle<T | null> {
      return {
        getSnapshot: () => client.getItem(key, parser as any),
        subscribe: (onStoreChange: () => void) => {
          return client.subscribe(onStoreChange as any, { key })
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
