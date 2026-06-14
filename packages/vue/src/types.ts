import type { Parser, StorageAdapter, StorageClient, StorageType } from '@ailoi/core'

export interface UseStorageOptions {
  key: string
  parser: Parser<any>
  client?: StorageClient
  storage?: StorageType | StorageAdapter
}

export interface UseScopedStorageOptions {
  key: string
  parser: Parser<any>
  client?: StorageClient
}
