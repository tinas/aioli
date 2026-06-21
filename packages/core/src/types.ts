import type { Parser, ParserWithDefault } from '@aioli/parsers'

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  keys(): string[]
  size(): number
}

export type StorageEvent = {
  type: 'add' | 'change' | 'remove' | 'clear'
  key: string
  oldValue: string | null
  newValue: string | null
}

export type StorageType = 'local' | 'session' | 'memory'

export type ErrorHandler = (error: unknown) => void

export interface StorageOptions {
  storage?: StorageType | StorageAdapter
  prefix?: string
  crossTab?: boolean
  onError?: ErrorHandler
}

export interface ResolvedStorageOptions {
  storage: StorageType | StorageAdapter
  prefix: string
  crossTab: boolean
  onError?: ErrorHandler
}

export interface Subscribable<T> {
  getSnapshot: () => T
  subscribe: (onStoreChange: () => void) => () => void
}

export interface StorageClient {
  getItem<T>(options: { key: string; parser: ParserWithDefault<T, any> }): T
  getItem<T>(options: { key: string; parser: Parser<T> }): T | null
  getItem(options: { key: string }): string | null

  setItem<T>(options: { key: string; value: T; parser?: Parser<T> }): void
  removeItem(options: { key: string }): void
  clear(): void

  has(key: string): boolean
  keys(): string[]
  size(): number

  subscribe(options: {
    listener: (event: StorageEvent) => void
    keys?: string | string[]
  }): () => void

  batch(fn: () => void): void

  snapshot<T>(options: {
    key: string
    parser?: Parser<T> | ParserWithDefault<T, T>
  }): Subscribable<T | null>

  destroy(): void

  readonly prefix: string
  readonly adapter: StorageAdapter
}
