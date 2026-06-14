import type { Parser, ParserWithDefault, StorageClient } from '@ailoi/core'
import type { Ref } from 'vue'

import type { UseScopedStorageOptions } from './types'
import { useStorage } from './use-storage'

export function useLocalStorage<T, D extends T>(options: {
  key: string
  parser: ParserWithDefault<T, D>
  client?: StorageClient
}): Ref<T>

export function useLocalStorage<T>(options: {
  key: string
  parser: Parser<T>
  client?: StorageClient
}): Ref<T | null>

export function useLocalStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: 'local' })
}

export function useSessionStorage<T, D extends T>(options: {
  key: string
  parser: ParserWithDefault<T, D>
  client?: StorageClient
}): Ref<T>

export function useSessionStorage<T>(options: {
  key: string
  parser: Parser<T>
  client?: StorageClient
}): Ref<T | null>

export function useSessionStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: 'session' })
}

export function useMemoryStorage<T, D extends T>(options: {
  key: string
  parser: ParserWithDefault<T, D>
  client?: StorageClient
}): Ref<T>

export function useMemoryStorage<T>(options: {
  key: string
  parser: Parser<T>
  client?: StorageClient
}): Ref<T | null>

export function useMemoryStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: 'memory' })
}
