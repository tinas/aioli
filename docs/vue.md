# @aioli/vue

<!-- automd:badges color=F0DB4F bundlephobia -->

[![npm version](https://img.shields.io/npm/v/@aioli/vue?color=F0DB4F)](https://npmjs.com/package/@aioli/vue)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@aioli/vue?color=F0DB4F)](https://bundlephobia.com/package/@aioli/vue)

<!-- /automd -->

> Reactive Vue composables for type-safe browser storage.

**@aioli/vue** provides Vue composables that turn `localStorage`, `sessionStorage`, and in-memory storage into reactive refs — powered by [**@aioli/core**](https://github.com/tinas/aioli/tree/main/packages/core). Changes in one component instantly reflect everywhere, and cross-tab sync works out of the box.

## Installation

```bash
pnpm add @aioli/vue
```

## Quick Start

```html
<script setup lang="ts">
  import { parseAsInteger, useLocalStorage } from '@aioli/vue'

  const count = useLocalStorage({ key: 'count', parser: parseAsInteger.default(0) })
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>
```

Setting `count.value = 5` writes `"5"` to `localStorage` under the key `count`. The ref is reactive — other components reading the same key update automatically.

## Plugin Setup

Install the plugin to provide pre-configured storage clients to all composables:

```ts
import { createAioli } from '@aioli/vue'
import { createApp } from 'vue'

const app = createApp(App)

app.use(createAioli())
```

All options are optional. To customize, pass per-storage configuration:

```ts
app.use(
  createAioli({
    local: { prefix: 'myapp:' },
    session: { prefix: 'myapp:' },
    memory: {},
  }),
)
```

Each storage type (`local`, `session`, `memory`) accepts the same options as `createStorage` from `@aioli/core` (except `storage` which is implied):

| Option     | Type                       | Default | Description                          |
| ---------- | -------------------------- | ------- | ------------------------------------ |
| `prefix`   | `string`                   | `''`    | Key prefix for namespacing           |
| `crossTab` | `boolean`                  | `true`  | Enable cross-tab sync                |
| `onError`  | `(error: unknown) => void` | —       | Error handler for storage operations |

> **Note:** The plugin is not required if you always pass a `StorageClient` via the `storage` option. Without the plugin and without an explicit storage client, composables will fall back to in-memory storage with a development warning.

## Composables

### `useStorage`

The base composable — specify the storage type explicitly:

```ts
import { parseAsString, useStorage } from '@aioli/vue'

// Uses memory storage by default (when plugin is installed)
const name = useStorage({ key: 'name', parser: parseAsString.default('') })

// Specify storage type
const token = useStorage({ key: 'token', parser: parseAsString, storage: 'session' })
```

### `useLocalStorage`

Shorthand for `useStorage` with `storage: 'local'`:

```ts
import { parseAsBoolean, useLocalStorage } from '@aioli/vue'

const darkMode = useLocalStorage({ key: 'dark-mode', parser: parseAsBoolean.default(false) })
```

### `useSessionStorage`

Shorthand for `useStorage` with `storage: 'session'`:

```ts
import { parseAsString, useSessionStorage } from '@aioli/vue'

const sessionToken = useSessionStorage({ key: 'token', parser: parseAsString })
// sessionToken.value is string | null
```

### `useMemoryStorage`

Shorthand for `useStorage` with `storage: 'memory'`:

```ts
import { parseAsInteger, useMemoryStorage } from '@aioli/vue'

const tempCounter = useMemoryStorage({ key: 'counter', parser: parseAsInteger.default(0) })
```

### `useStorageClient`

Access the injected storage clients directly:

```ts
import { useStorageClient } from '@aioli/vue'

const clients = useStorageClient()
// clients.local  — StorageClient for localStorage
// clients.session — StorageClient for sessionStorage
// clients.memory  — StorageClient for memory
```

## Type Inference

All types are inferred from parser definitions:

```ts
import { parseAsInteger, parseAsString, useLocalStorage } from '@aioli/vue'

const count = useLocalStorage({ key: 'count', parser: parseAsInteger })
// Ref<number | null>

const count = useLocalStorage({ key: 'count', parser: parseAsInteger.default(0) })
// Ref<number>

const name = useLocalStorage({ key: 'name' })
// Ref<string | null> — defaults to parseAsString without .default()
```

## Reactivity

The ref automatically updates when storage changes — from the same component, another component, or even another tab:

```html
<script setup lang="ts">
  import { parseAsString, useLocalStorage } from '@aioli/vue'

  // Both refs read the same key — they stay in sync
  const input = useLocalStorage({ key: 'search', parser: parseAsString.default('') })
  const display = useLocalStorage({ key: 'search', parser: parseAsString.default('') })
</script>

<template>
  <input v-model="input" />
  <p>Current value: {{ display }}</p>
</template>
```

## Explicit Storage Client

You can bypass the plugin by passing a `StorageClient` directly via the `storage` option:

```ts
import { createStorage, parseAsString, useStorage } from '@aioli/vue'

const client = createStorage({ storage: 'local', prefix: 'custom:' })
const value = useStorage({ key: 'name', parser: parseAsString, storage: client })
```

## Parsers

All parsers from `@aioli/core` are re-exported:

```ts
import {
  defineParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsJson,
  parseAsMap,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
} from '@aioli/vue'
```

See the [parsers documentation](https://github.com/tinas/aioli/blob/main/docs/core.md#parsers) in `@aioli/core` for full details.

### Default Values

The `.default()` method guarantees a non-null ref value:

```ts
import { parseAsInteger, useLocalStorage } from '@aioli/vue'

const count = useLocalStorage({ key: 'count', parser: parseAsInteger.default(0) })
// Ref<number> — never null
```

For reference types (objects, arrays), pass a factory function to avoid shared instances across calls:

```ts
import { parseAsJson, useLocalStorage } from '@aioli/vue'

interface UserPrefs {
  theme: string
  fontSize: number
}

const prefs = useLocalStorage({
  key: 'prefs',
  parser: parseAsJson<UserPrefs>().default(() => ({ theme: 'light', fontSize: 14 })),
})
```

## Cleanup

When used inside a Vue effect scope (components, composables), subscriptions are automatically disposed via `onScopeDispose`. No manual cleanup needed.

## Documentation

Full documentation is available at [github.com/tinas/aioli](https://github.com/tinas/aioli).

## License

[MIT](https://github.com/tinas/aioli/blob/main/LICENSE)
