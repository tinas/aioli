import { inject } from 'vue'

import { type StorageClients, StorageClientsKey } from './plugin'

export function useStorageClient(): StorageClients {
  const clients = inject(StorageClientsKey)

  if (!clients) {
    throw new Error(
      '[@ailoi/vue]: No StorageClients found. Install the plugin via `app.use(createAiloi())`.',
    )
  }

  return clients
}
