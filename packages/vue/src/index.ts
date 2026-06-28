export { createAioli, StorageClientsKey } from './plugin'
export type { AioliPluginOptions, StorageClients } from './plugin'

export { useStorageClient } from './use-storage-client'

export { useStorage } from './use-storage'
export { useLocalStorage, useSessionStorage, useMemoryStorage } from './use-scoped-storage'

export type {
  StorageOptionsBase,
  StorageOptionsWithDefault,
  StorageOptionsWithParser,
  UseStorageOptions,
  UseScopedStorageOptions,
} from './types'

export {
  createStorage,
  MemoryAdapter,
  WebStorageAdapter,
  resolveAdapter,
  createScheduler,
  scheduler,
  createCrossTabSync,
} from '@aioli/core'
export type {
  ErrorHandler,
  ResolvedStorageOptions,
  StorageAdapter,
  StorageClient,
  StorageEvent,
  StorageOptions,
  StorageType,
  Subscribable,
} from '@aioli/core'

export {
  defineParser,
  resolveDefault,
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
} from '@aioli/parsers'
export type { DefaultValue, Parser, ParserWithDefault } from '@aioli/parsers'
