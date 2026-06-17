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
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
  parseAsNumberLiteral,
  parseAsArrayOf,
  parseAsIndex,
  parseAsMap,
  defineParser,
  createStorage,
} from '@aioli/core'

export type {
  Parser,
  ParserWithDefault,
  StorageClient,
  StorageOptions,
  StorageType,
} from '@aioli/core'
