import type { StorageClient, StorageType } from '@aioli/core'
import type { Parser, ParserWithDefault } from '@aioli/parsers'

export interface StorageOptionsWithDefault<T, D extends T, TStorage = StorageType | StorageClient> {
  key: string
  parser: ParserWithDefault<T, D>
  storage?: TStorage
}

export interface StorageOptionsWithParser<T, TStorage = StorageType | StorageClient> {
  key: string
  parser: Parser<T>
  storage?: TStorage
}

export interface StorageOptionsBase<TStorage = StorageType | StorageClient> {
  key: string
  storage?: TStorage
}

export type UseStorageOptions = StorageOptionsBase & { parser?: Parser<any> }
export type UseScopedStorageOptions = StorageOptionsBase<StorageClient> & { parser?: Parser<any> }
