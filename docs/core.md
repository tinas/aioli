# @aioli/core

<!-- automd:badges color=F0DB4F bundlephobia -->

[![npm version](https://img.shields.io/npm/v/@aioli/core?color=F0DB4F)](https://npmjs.com/package/@aioli/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@aioli/core?color=F0DB4F)](https://bundlephobia.com/package/@aioli/core)

<!-- /automd -->

> Framework-agnostic, type-safe storage client with parsers, subscriptions, and cross-tab sync.

**@aioli/core** is the framework-agnostic foundation that powers all framework bindings. It provides a `StorageClient` abstraction over `localStorage`, `sessionStorage`, and in-memory storage — with bidirectional parsers, key-scoped subscriptions, batched updates, and automatic cross-tab synchronization via `BroadcastChannel`.

## Installation

```bash
pnpm add @aioli/core
```

## Quick Start

```ts
import { createStorage, parseAsInteger } from '@aioli/core'

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

### Default Values

When a parser has a default, `getItem` never returns `null`:

```ts
import { parseAsInteger } from '@aioli/core'

const parser = parseAsInteger.default(0)
storage.getItem({ key: 'missing', parser }) // 0
```

For reference types (objects, arrays), pass a factory function to avoid shared instances across calls:

```ts
import { parseAsJson } from '@aioli/core'

interface UserPrefs {
  theme: string
  fontSize: number
}

const parser = parseAsJson<UserPrefs>().default(() => ({ theme: 'light', fontSize: 14 }))
```

Setting the value back to its default automatically removes the key from storage:

```ts
storage.setItem({ key: 'count', value: 5, parser })
storage.has('count') // true

storage.setItem({ key: 'count', value: 0, parser })
storage.has('count') // false — default removes the key
```

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

## Parsers

Parsers handle bidirectional conversion between storage strings and typed values. Each parser defines `parse` (string → value | null) and `serialize` (value → string).

### Built-in Parsers

| Parser                               | Type       | Stored As                  | Description                               |
| ------------------------------------ | ---------- | -------------------------- | ----------------------------------------- |
| `parseAsString`                      | `string`   | `headphones`               | Raw string value                          |
| `parseAsInteger`                     | `number`   | `42`                       | `parseInt` base 10                        |
| `parseAsFloat`                       | `number`   | `41.015`                   | `parseFloat`                              |
| `parseAsBoolean`                     | `boolean`  | `true`                     | Accepts `"true"` / `"false"`              |
| `parseAsIndex`                       | `number`   | `1` → `0`                  | 1-based in storage, 0-based in code       |
| `parseAsStringLiteral([...])`        | Union      | `price`                    | Validates against allowed values          |
| `parseAsNumberLiteral([...])`        | Union      | `5`                        | Validates against allowed numbers         |
| `parseAsStringEnum(values)`          | Enum       | `ACTIVE`                   | For TypeScript string enums               |
| `parseAsDate`                        | `Date`     | `2024-01-15`               | YYYY-MM-DD format                         |
| `parseAsDate.iso()`                  | `Date`     | `2024-01-15T10:30:00.000Z` | Full ISO 8601                             |
| `parseAsDate.timestamp()`            | `Date`     | `1705312200000`            | Unix milliseconds                         |
| `parseAsArrayOf(parser)`             | `T[]`      | `vue,ts`                   | Comma-separated (configurable)            |
| `parseAsJson<T>()`                   | `T`        | `{"k":"v"}`                | JSON-encoded values                       |
| `parseAsMap(keyParser, valueParser)` | `Map<K,V>` | `a:1;b:2`                  | Key-value pairs (configurable separators) |

### String Literals and Enums

```ts
import { parseAsStringLiteral, parseAsStringEnum } from '@aioli/core'

const sortParser = parseAsStringLiteral(['price', 'name', 'rating']).default('price')
// Parses: 'price' | 'name' | 'rating'

enum OrderStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

const statusParser = parseAsStringEnum<OrderStatus>(Object.values(OrderStatus))
```

### Arrays and Maps

```ts
import { parseAsArrayOf, parseAsMap, parseAsString, parseAsInteger } from '@aioli/core'

// Comma-separated array
const tagsParser = parseAsArrayOf(parseAsString).default([])
// "vue,ts,vite" → ['vue', 'ts', 'vite']

// Custom separator
const pricesParser = parseAsArrayOf(parseAsInteger, ';')
// "100;500;1000" → [100, 500, 1000]

// Map with custom separators
const filtersParser = parseAsMap(parseAsString, parseAsInteger, ';', ':')
// "min:0;max:100" → Map { 'min' => 0, 'max' => 100 }
```

### Custom Parsers

```ts
import { defineParser } from '@aioli/core'

interface PriceRange {
  min: number
  max: number
}

const parseAsPriceRange = defineParser<PriceRange>({
  parse(value) {
    const parts = value.split('-')
    if (parts.length !== 2) return null
    const min = Number(parts[0])
    const max = Number(parts[1])
    if (Number.isNaN(min) || Number.isNaN(max)) return null
    return { min, max }
  },
  serialize: v => `${v.min}-${v.max}`,
})

// Use with default
const parser = parseAsPriceRange.default({ min: 0, max: 1000 })
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
