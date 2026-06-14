import { type StorageClient, type StorageOptions, createStorage } from '@ailoi/core'
import { type InjectionKey, type Plugin } from 'vue'

export interface StorageClients {
  local: StorageClient
  session: StorageClient
  memory: StorageClient
}

export const StorageClientsKey: InjectionKey<StorageClients> = Symbol('AiloiStorageClients')

export interface AiloiPluginOptions {
  local?: Omit<StorageOptions, 'storage'>
  session?: Omit<StorageOptions, 'storage'>
  memory?: Omit<StorageOptions, 'storage'>
}

export function createAiloi(options?: AiloiPluginOptions): Plugin {
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
