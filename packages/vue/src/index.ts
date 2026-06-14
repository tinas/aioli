export { createAiloi, StorageClientsKey } from './plugin'
export type { AiloiPluginOptions, StorageClients } from './plugin'

export { useStorageClient } from './use-storage-client'

export { useStorage } from './use-storage'
export type { UseStorageReturn } from './use-storage'
export { useLocalStorage, useSessionStorage, useMemoryStorage } from './use-scoped-storage'

export type { UseStorageOptions, UseScopedStorageOptions } from './types'

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
} from '@ailoi/core'

export type {
  Parser,
  ParserWithDefault,
  StorageClient,
  StorageOptions,
  StorageType,
} from '@ailoi/core'
