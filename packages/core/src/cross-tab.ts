import type { CrossTabOptions, StorageChangeEvent } from './types'

export type CrossTabListener = (event: StorageChangeEvent) => void

export interface CrossTabSync {
  broadcast(event: StorageChangeEvent): void
  subscribe(listener: CrossTabListener): () => void
  destroy(): void
}

export interface CrossTabConfig {
  crossTab: CrossTabOptions
  prefix: string
}

export function createCrossTabSync(config: CrossTabConfig): CrossTabSync | null {
  const { crossTab: options, prefix } = config

  if (!options.enabled) return null

  if (typeof window === 'undefined') return null

  const shouldListen = options.listen !== false
  const shouldBroadcast = options.broadcast !== false
  const channelName = options.channel ?? `ailoi:${prefix}`
  const listeners = new Set<CrossTabListener>()
  const filter = options.filter

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName)

    if (shouldListen) {
      channel.onmessage = (e: MessageEvent) => {
        const event = e.data as StorageChangeEvent
        if (filter && !filter(event)) return
        for (const listener of listeners) {
          listener(event)
        }
      }
    }

    return {
      broadcast(event) {
        if (shouldBroadcast) {
          channel.postMessage(event)
        }
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      destroy() {
        channel.close()
        listeners.clear()
      },
    }
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === null) return
    if (!e.key.startsWith(prefix)) return

    const event: StorageChangeEvent = {
      type: 'change',
      key: e.key,
      oldValue: e.oldValue,
      newValue: e.newValue,
    }

    if (filter && !filter(event)) return

    for (const listener of listeners) {
      listener(event)
    }
  }

  if (shouldListen) {
    window.addEventListener('storage', handleStorage)
  }

  return {
    broadcast() {},
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      if (shouldListen) {
        window.removeEventListener('storage', handleStorage)
      }
      listeners.clear()
    },
  }
}
