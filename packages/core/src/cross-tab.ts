import type { ResolvedStorageOptions, StorageEvent } from './types'

export type CrossTabListener = (event: StorageEvent) => void

export interface CrossTabSync {
  broadcast(event: StorageEvent): void
  subscribe(listener: CrossTabListener): () => void
  destroy(): void
}

export function createCrossTabSync(config: ResolvedStorageOptions): CrossTabSync | null {
  const { crossTab, prefix } = config

  if (!crossTab) return null

  if (typeof window === 'undefined') return null

  const listeners = new Set<CrossTabListener>()
  const cleanups: (() => void)[] = []

  const seen = new Set<string>()
  let clearTimer: ReturnType<typeof setTimeout> | undefined

  function dedupKey(key: string, newValue: string | null): string {
    return `${key}\0${newValue}`
  }

  function markSeen(event: StorageEvent): void {
    seen.add(dedupKey(event.key, event.newValue))
    if (!clearTimer) {
      clearTimer = setTimeout(() => {
        seen.clear()
        clearTimer = undefined
      }, 0)
    }
  }

  function isSeen(event: StorageEvent): boolean {
    return seen.has(dedupKey(event.key, event.newValue))
  }

  function dispatch(event: StorageEvent): void {
    for (const listener of listeners) {
      listener(event)
    }
  }

  let channel: BroadcastChannel | null = null

  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(`ailoi:${prefix}`)
    channel.onmessage = (e: MessageEvent) => {
      const event = e.data as StorageEvent
      if (isSeen(event)) return
      markSeen(event)
      dispatch(event)
    }
    cleanups.push(() => channel!.close())
  }

  const handleNativeStorage = (e: globalThis.StorageEvent) => {
    if (e.key === null) return
    if (!e.key.startsWith(prefix)) return

    const type = e.newValue === null ? 'remove' : e.oldValue === null ? 'add' : 'change'

    const event: StorageEvent = {
      type,
      key: e.key,
      oldValue: e.oldValue,
      newValue: e.newValue,
    }

    if (isSeen(event)) return
    markSeen(event)
    dispatch(event)
  }

  window.addEventListener('storage', handleNativeStorage)
  cleanups.push(() => window.removeEventListener('storage', handleNativeStorage))

  return {
    broadcast(event) {
      channel?.postMessage(event)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      for (const fn of cleanups) fn()
      listeners.clear()
      seen.clear()
      if (clearTimer) {
        clearTimeout(clearTimer)
        clearTimer = undefined
      }
    },
  }
}
