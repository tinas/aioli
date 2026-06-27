import type { ErrorHandler, StorageAdapter } from '../types'

export class WebStorageAdapter implements StorageAdapter {
  constructor(
    private storage: Storage,
    private onError?: ErrorHandler,
  ) {}

  getItem(key: string): string | null {
    try {
      return this.storage.getItem(key)
    } catch (e) {
      this.onError?.(e)
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      this.storage.setItem(key, value)
    } catch (e) {
      this.onError?.(e)
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key)
    } catch (e) {
      this.onError?.(e)
    }
  }

  clear(): void {
    try {
      this.storage.clear()
    } catch (e) {
      this.onError?.(e)
    }
  }

  keys(): string[] {
    try {
      const result: string[] = []
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i)
        if (key !== null) {
          result.push(key)
        }
      }
      return result
    } catch (e) {
      this.onError?.(e)
      return []
    }
  }

  size(): number {
    try {
      return this.storage.length
    } catch (e) {
      this.onError?.(e)
      return 0
    }
  }
}
