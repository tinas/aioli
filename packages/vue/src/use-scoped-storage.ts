import type { StorageClient } from '@aioli/core'
import type { Ref } from 'vue'

import type {
  StorageOptionsBase,
  StorageOptionsWithDefault,
  StorageOptionsWithParser,
  UseScopedStorageOptions,
} from './types'
import { useStorage } from './use-storage'

export function useLocalStorage<T, D extends T>(
  options: StorageOptionsWithDefault<T, D, StorageClient>,
): Ref<T>
export function useLocalStorage<T>(
  options: StorageOptionsWithParser<T, StorageClient>,
): Ref<T | null>
export function useLocalStorage(options: StorageOptionsBase<StorageClient>): Ref<string | null>
export function useLocalStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: options.storage ?? 'local' })
}

export function useSessionStorage<T, D extends T>(
  options: StorageOptionsWithDefault<T, D, StorageClient>,
): Ref<T>
export function useSessionStorage<T>(
  options: StorageOptionsWithParser<T, StorageClient>,
): Ref<T | null>
export function useSessionStorage(options: StorageOptionsBase<StorageClient>): Ref<string | null>
export function useSessionStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: options.storage ?? 'session' })
}

export function useMemoryStorage<T, D extends T>(
  options: StorageOptionsWithDefault<T, D, StorageClient>,
): Ref<T>
export function useMemoryStorage<T>(
  options: StorageOptionsWithParser<T, StorageClient>,
): Ref<T | null>
export function useMemoryStorage(options: StorageOptionsBase<StorageClient>): Ref<string | null>
export function useMemoryStorage(options: UseScopedStorageOptions): Ref<any> {
  return useStorage({ ...options, storage: options.storage ?? 'memory' })
}
