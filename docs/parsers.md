# @aioli/parsers

> Type-safe, composable parsers for serializing and deserializing storage values.

**@aioli/parsers** is a standalone library of typed, composable parsers. Each parser defines a bidirectional conversion between a string and a typed value: `parse` (string → value | null) and `serialize` (value → string).

Parsers have no runtime dependencies and can be used anywhere a string ⇄ value conversion is needed.

## Installation

```bash
pnpm add @aioli/parsers
```

## Quick Start

```ts
import { parseAsInteger } from '@aioli/parsers'

parseAsInteger.parse('42') // 42
parseAsInteger.parse('not a number') // null
parseAsInteger.serialize(42) // '42'
```

Every parser exposes the same shape:

```ts
type Parser<T> = {
  parse(value: string): T | null
  serialize(value: T): string
  default<D extends T>(value: D | (() => D)): ParserWithDefault<T, D>
}
```

## Built-in Parsers

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

## Default Values

Calling `.default()` on any parser produces a `ParserWithDefault`. The `defaultValue` is attached to the parser as a readonly property and can be resolved at any time:

```ts
import { parseAsInteger, resolveDefault } from '@aioli/parsers'

const parser = parseAsInteger.default(0)
parser.parse('not a number') // null — parse itself is unchanged
resolveDefault(parser.defaultValue) // 0
```

Consumers (such as a storage layer) can inspect `defaultValue` to decide what to return when `parse` yields `null`.

For reference types (objects, arrays), pass a factory function to avoid shared instances across calls:

```ts
import { parseAsJson, resolveDefault } from '@aioli/parsers'

interface UserPrefs {
  theme: string
  fontSize: number
}

const parser = parseAsJson<UserPrefs>().default(() => ({ theme: 'light', fontSize: 14 }))
resolveDefault(parser.defaultValue) // fresh object every call
```

## String Literals and Enums

```ts
import { parseAsStringEnum, parseAsStringLiteral } from '@aioli/parsers'

const sortParser = parseAsStringLiteral(['price', 'name', 'rating']).default('price')
// Parses: 'price' | 'name' | 'rating'

enum OrderStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

const statusParser = parseAsStringEnum<OrderStatus>(Object.values(OrderStatus))
```

## Arrays and Maps

```ts
import { parseAsArrayOf, parseAsInteger, parseAsMap, parseAsString } from '@aioli/parsers'

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

## Custom Parsers

Use `defineParser` to build your own:

```ts
import { defineParser } from '@aioli/parsers'

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

// Compose with .default()
const parser = parseAsPriceRange.default({ min: 0, max: 1000 })
```

`defineParser` returns a `Parser<T>` that includes the `.default()` method, so any custom parser is fully composable.

## API Reference

```ts
import type { DefaultValue, Parser, ParserConfig, ParserWithDefault } from '@aioli/parsers'
```

| Export                 | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| `defineParser(config)` | Builds a `Parser<T>` from a `ParserConfig<T>` (`parse` + `serialize`).     |
| `resolveDefault(d)`    | Resolves a `DefaultValue<T>` — calls the factory if it is a function.      |
| `Parser<T>`            | A codec with a `.default()` method that returns `ParserWithDefault<T, D>`. |
| `ParserWithDefault<T>` | A parser that carries a `defaultValue` for non-null `getItem` results.     |
| `ParserConfig<T>`      | `{ parse: (s: string) => T \| null; serialize: (v: T) => string }`.        |
| `DefaultValue<T>`      | `T \| (() => T)` — eager value or lazy factory.                            |

## License

[MIT](https://github.com/tinas/aioli/blob/main/LICENSE)
