import { type StorageClient, type StorageOptions, createStorage } from '@aioli/core'
import { type InjectionKey, type Plugin } from 'vue'

export interface StorageClients {
  local: StorageClient
  session: StorageClient
  memory: StorageClient
}

export const StorageClientsKey: InjectionKey<StorageClients> = Symbol('AioliStorageClients')

export interface AioliPluginOptions {
  local?: Omit<StorageOptions, 'storage'>
  session?: Omit<StorageOptions, 'storage'>
  memory?: Omit<StorageOptions, 'storage'>
}

export function createAioli(options?: AioliPluginOptions): Plugin {
  return {
    install(app) {
      const clients: StorageClients = {
        local: createStorage({ ...options?.local, storage: 'local' }),
        session: createStorage({ ...options?.session, storage: 'session' }),
        memory: createStorage({ ...options?.memory, storage: 'memory' }),
      }

      app.provide(StorageClientsKey, clients)
    },
  }
}
