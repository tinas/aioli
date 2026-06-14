import type {
  Parser,
  ParserWithDefault,
  StorageAdapter,
  StorageClient,
  StorageType,
} from '@ailoi/core'
import { createStorage } from '@ailoi/core'
import { type Ref, customRef, getCurrentScope, onScopeDispose } from 'vue'

import type { UseStorageOptions } from './types'
import { useStorageClient } from './use-storage-client'

export type UseStorageReturn<T> = Ref<T>

export function useStorage<T, D extends T>(options: {
  key: string
  parser: ParserWithDefault<T, D>
  client?: StorageClient
  storage?: StorageType | StorageAdapter
}): Ref<T>

export function useStorage<T>(options: {
  key: string
  parser: Parser<T>
  client?: StorageClient
  storage?: StorageType | StorageAdapter
}): Ref<T | null>

export function useStorage(options: UseStorageOptions): Ref<any> {
  const { key, parser, client: explicitClient, storage } = options

  const client = explicitClient ?? resolveClient(storage)

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

function resolveClient(storage?: StorageType | StorageAdapter): StorageClient {
  if (typeof storage === 'object') {
    return createStorage({ storage })
  }
  const clients = useStorageClient()
  return clients[storage ?? 'memory']
}
