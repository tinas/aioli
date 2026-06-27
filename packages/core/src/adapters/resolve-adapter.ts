import type { ResolvedStorageOptions, StorageAdapter } from '../types'
import { MemoryAdapter } from './memory-adapter'
import { WebStorageAdapter } from './web-storage-adapter'

function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = globalThis[type]
    const testKey = '__aioli_test__'
    storage.setItem(testKey, 'test')
    storage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export function resolveAdapter(config: ResolvedStorageOptions): StorageAdapter {
  const { storage, onError } = config

  if (typeof storage === 'object') {
    return storage
  }

  const isServer =
    typeof globalThis === 'undefined' ||
    typeof globalThis.window === 'undefined' ||
    typeof globalThis.document === 'undefined'

  if (isServer) {
    return new MemoryAdapter()
  }

  switch (storage) {
    case 'local':
      return isStorageAvailable('localStorage')
        ? new WebStorageAdapter(globalThis.localStorage, onError)
        : new MemoryAdapter()
    case 'session':
      return isStorageAvailable('sessionStorage')
        ? new WebStorageAdapter(globalThis.sessionStorage, onError)
        : new MemoryAdapter()
    case 'memory':
    default:
      return new MemoryAdapter()
  }
}
