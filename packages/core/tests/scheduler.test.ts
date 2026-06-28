import { describe, expect, test, vi } from 'vite-plus/test'

import { createScheduler } from '../src'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('createScheduler', () => {
  test('schedule executes callback via microtask', async () => {
    const sched = createScheduler()
    const fn = vi.fn()
    sched.schedule(fn)
    expect(fn).not.toHaveBeenCalled()
    await flush()
    expect(fn).toHaveBeenCalledOnce()
  })

  test('batch collects and flushes together', async () => {
    const sched = createScheduler()
    const calls: number[] = []
    sched.batch(() => {
      sched.schedule(() => calls.push(1))
      sched.schedule(() => calls.push(2))
    })
    expect(calls).toEqual([])
    await flush()
    expect(calls).toEqual([1, 2])
  })

  test('setNotifyFn wraps each callback', async () => {
    const sched = createScheduler()
    const wrapper = vi.fn((cb: () => void) => cb())
    sched.setNotifyFn(wrapper)
    sched.schedule(() => {})
    await flush()
    expect(wrapper).toHaveBeenCalledOnce()
  })

  test('multiple schedules flush in order', async () => {
    const sched = createScheduler()
    const calls: number[] = []
    sched.schedule(() => calls.push(1))
    sched.schedule(() => calls.push(2))
    sched.schedule(() => calls.push(3))
    await flush()
    expect(calls).toEqual([1, 2, 3])
  })

  test('schedule during flush is processed in next microtask', async () => {
    const sched = createScheduler()
    const calls: number[] = []
    sched.schedule(() => {
      calls.push(1)
      sched.schedule(() => calls.push(3))
    })
    sched.schedule(() => calls.push(2))
    await flush()
    expect(calls).toEqual([1, 2, 3])
  })
})
