# @aioli/core

<!-- automd:badges color=F0DB4F bundlephobia -->

[![npm version](https://img.shields.io/npm/v/@aioli/core?color=F0DB4F)](https://npmjs.com/package/@aioli/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@aioli/core?color=F0DB4F)](https://bundlephobia.com/package/@aioli/core)

<!-- /automd -->

> Framework-agnostic, type-safe storage client with codecs, subscriptions, and cross-tab sync.

**@aioli/core** is the framework-agnostic foundation that powers all framework bindings. It provides a `StorageClient` abstraction over `localStorage`, `sessionStorage`, and in-memory storage — with bidirectional codecs, key-scoped subscriptions, batched updates, and automatic cross-tab synchronization via `BroadcastChannel`.

For a batteries-included set of typed codecs (numbers, dates, JSON, enums, arrays, maps), pair it with [**@aioli/parsers**](./parsers.md).

## Installation

```bash
pnpm add @aioli/core
```

## Quick Start

```ts
import { createStorage } from '@aioli/core'
import { parseAsInteger } from '@aioli/parsers'

const storage = createStorage({ storage: 'local', prefix: 'app:' })

storage.setItem({ key: 'count', value: 42, parser: parseAsInteger })
storage.getItem({ key: 'count', parser: parseAsInteger }) // 42
```

## Creating a Storage Client

```ts
import { createStorage } from '@aioli/core'

const storage = createStorage({
  storage: 'local', // 'local' | 'session' | 'memory' | custom StorageAdapter
  prefix: 'myapp:', // key prefix for namespacing
  crossTab: true, // enable cross-tab sync (default: true)
  onError: e => console.error(e), // optional error handler
})
```

### Storage Types

| Value                   | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `'local'`               | Uses `localStorage` (falls back to memory on SSR)      |
| `'session'`             | Uses `sessionStorage` (falls back to memory on SSR)    |
| `'memory'`              | In-memory `Map`-based storage (default)                |
| Custom `StorageAdapter` | Any object implementing the `StorageAdapter` interface |

## StorageClient API

```ts
// Read & Write
storage.getItem({ key: 'name' }) // string | null
storage.getItem({ key: 'count', parser: parseAsInteger }) // number | null
storage.setItem({ key: 'count', value: 5, parser: parseAsInteger })
storage.removeItem({ key: 'count' })

// Utilities
storage.has('count') // boolean
storage.keys() // string[] (without prefix)
storage.size() // number
storage.clear() // removes all prefixed keys

// Batch updates — groups notifications into a single flush
storage.batch(() => {
  storage.setItem({ key: 'a', value: '1' })
  storage.setItem({ key: 'b', value: '2' })
})

// Cleanup
storage.destroy()
```

### Codecs

Any `parser` argument accepts an object matching the `Codec<T>` interface:

```ts
import type { Codec } from '@aioli/core'

const intCodec: Codec<number> = {
  parse: v => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  },
  serialize: v => String(v),
}

storage.setItem({ key: 'count', value: 5, parser: intCodec })
```

A `CodecWithDefault<T>` adds a `defaultValue` (eager value or factory) — `getItem` then never returns `null` for that key, and writing the default removes the key. The [`@aioli/parsers`](./parsers.md) package provides a full set of ready-made parsers (numbers, booleans, dates, JSON, arrays, maps, enums) plus a `defineParser` helper for custom shapes.

### Default Values

When a codec carries a default, `getItem` never returns `null`:

```ts
import { parseAsInteger } from '@aioli/parsers'

const parser = parseAsInteger.default(0)
storage.getItem({ key: 'missing', parser }) // 0
```

Setting the value back to its default automatically removes the key from storage:

```ts
storage.setItem({ key: 'count', value: 5, parser })
storage.has('count') // true

storage.setItem({ key: 'count', value: 0, parser })
storage.has('count') // false — default removes the key
```

See [parsers documentation](./parsers.md) for details on factory defaults for reference types.

## Subscriptions

Subscribe to storage changes with optional key filtering:

```ts
// All changes
const unsubscribe = storage.subscribe({
  listener: event => {
    console.log(event.type, event.key, event.oldValue, event.newValue)
  },
})

// Specific keys only
storage.subscribe({
  listener: event => console.log(event),
  keys: ['count', 'name'],
})

// Single key
storage.subscribe({
  listener: event => console.log(event),
  keys: 'count',
})

// Unsubscribe
unsubscribe()
```

### Event Types

| `event.type` | Description                    |
| ------------ | ------------------------------ |
| `'add'`      | Key created for the first time |
| `'change'`   | Existing key value changed     |
| `'remove'`   | Key removed via `removeItem`   |
| `'clear'`    | Key removed via `clear()`      |

## Cross-Tab Sync

When `crossTab: true` (default), changes are broadcast to other tabs/windows via `BroadcastChannel` and native `storage` events. Subscriptions in all tabs receive the event automatically — no extra setup required.

```ts
const storage = createStorage({ storage: 'local', crossTab: true })

storage.subscribe({
  listener: event => {
    // Fires when another tab changes the same key
    console.log('Cross-tab update:', event.key, event.newValue)
  },
})
```

## Snapshot (External Store Integration)

`snapshot()` returns a `Subscribable` interface compatible with React's `useSyncExternalStore` or any external store pattern:

```ts
const handle = storage.snapshot({ key: 'count', parser: parseAsInteger })
handle.getSnapshot() // number | null
handle.subscribe(onStoreChange) // () => unsubscribe
```

## Custom Storage Adapters

Implement the `StorageAdapter` interface for custom backends:

```ts
import type { StorageAdapter } from '@aioli/core'
import { createStorage } from '@aioli/core'

class IndexedDBAdapter implements StorageAdapter {
  private cache = new Map<string, string>()

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value)
  }

  removeItem(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }
}

const storage = createStorage({ storage: new IndexedDBAdapter() })
```

## SSR Safety

On the server (no `window`/`document`), the adapter automatically falls back to `MemoryAdapter`. Cross-tab sync is disabled in non-browser environments. No conditional imports or special configuration needed.

## Documentation

Full documentation is available at [github.com/tinas/aioli](https://github.com/tinas/aioli).

## License

[MIT](https://github.com/tinas/aioli/blob/main/LICENSE)
