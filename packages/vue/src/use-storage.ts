import type { StorageClient, StorageType } from '@aioli/core'
import { createStorage } from '@aioli/core'
import { type Ref, customRef, getCurrentScope, onScopeDispose } from 'vue'

import type {
  StorageOptionsBase,
  StorageOptionsWithDefault,
  StorageOptionsWithParser,
  UseStorageOptions,
} from './types'
import { useStorageClient } from './use-storage-client'

export function useStorage<T, D extends T>(options: StorageOptionsWithDefault<T, D>): Ref<T>
export function useStorage<T>(options: StorageOptionsWithParser<T>): Ref<T | null>
export function useStorage(options: StorageOptionsBase): Ref<string | null>
export function useStorage(options: UseStorageOptions): Ref<any> {
  const { key, parser, storage } = options

  if (process.env.NODE_ENV === 'development') {
    if (!getCurrentScope()) {
      console.warn(
        '[@aioli/vue]: useStorage() should only be used inside a setup() function or a running effect scope. ' +
          'Using it outside may lead to memory leaks.',
      )
    }
  }

  const client = resolveClient(storage)

  return customRef((track, trigger) => {
    let value = client.getItem({ key, parser: parser as any })

    const unsubscribe = client.subscribe({
      keys: key,
      listener: () => {
        value = client.getItem({ key, parser: parser as any })
        trigger()
      },
    })

    if (getCurrentScope()) {
      onScopeDispose(unsubscribe)
    }

    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        client.setItem({ key, value: newValue, parser })
        value = newValue
        trigger()
      },
    }
  })
}

function resolveClient(storage?: StorageType | StorageClient): StorageClient {
  if (typeof storage === 'object') {
    return storage
  }

  try {
    const clients = useStorageClient()
    return clients[storage ?? 'memory']
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[@aioli/vue]: No plugin found. Falling back to in-memory storage. ' +
          'Install the plugin via `app.use(createAioli())` or pass a StorageClient directly.',
      )
    }
    return createStorage({ storage: storage ?? 'memory' })
  }
}
