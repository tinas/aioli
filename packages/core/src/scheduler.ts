type Callback = () => void
type NotifyFn = (cb: Callback) => void
type BatchNotifyFn = (cb: Callback) => void

export function createScheduler() {
  let queue: Callback[] = []
  let flushing = false
  let notifyFn: NotifyFn = cb => cb()
  let batchNotifyFn: BatchNotifyFn = cb => cb()

  function flush(): void {
    if (flushing) return
    flushing = true
    const pending = queue
    queue = []
    queueMicrotask(() => {
      batchNotifyFn(() => {
        for (const cb of pending) {
          notifyFn(cb)
        }
      })
      flushing = false
      if (queue.length) flush()
    })
  }

  return {
    schedule(cb: Callback): void {
      queue.push(cb)
      flush()
    },

    batch<T>(fn: () => T): T {
      const prev = queue
      queue = []
      try {
        return fn()
      } finally {
        const batched = queue
        queue = prev
        for (const cb of batched) {
          queue.push(cb)
        }
        flush()
      }
    },

    setNotifyFn(fn: NotifyFn): void {
      notifyFn = fn
    },

    setBatchNotifyFn(fn: BatchNotifyFn): void {
      batchNotifyFn = fn
    },
  } as const
}

export const scheduler = createScheduler()
