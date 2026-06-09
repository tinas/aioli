export type ParserConfig<T> = {
  parse: (value: string) => T | null
  serialize: (value: T) => string
}

export type DefaultValue<D> = D | (() => D)

export type Parser<T> = ParserConfig<T> & {
  default: <D extends T>(value: DefaultValue<D>) => ParserWithDefault<T, D>
}

export type ParserWithDefault<T, D extends T = T> = Parser<T> & {
  readonly defaultValue: DefaultValue<D>
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
  keys(): string[]
  size(): number
}

export type StorageChangeEvent = {
  type: 'change'
  key: string
  newValue: string | null
  oldValue: string | null
}

export type StorageClearEvent = {
  type: 'clear'
  prefix: string
}

export type StorageEvent = StorageChangeEvent | StorageClearEvent

export type StorageType = 'local' | 'session' | 'memory'

export interface CrossTabOptions {
  enabled: boolean
  channel?: string
  listen?: boolean
  broadcast?: boolean
  filter?: (event: StorageChangeEvent) => boolean
}

export type ErrorHandler = (error: unknown) => void

export interface StorageOptions {
  storage?: StorageType | StorageAdapter
  prefix?: string
  ssr?: boolean
  crossTab?: boolean | CrossTabOptions
  onError?: ErrorHandler
}

export interface ResolvedStorageOptions {
  storage: StorageType | StorageAdapter
  prefix: string
  ssr: boolean
  crossTab: CrossTabOptions
  onError?: ErrorHandler
}

export type Snapshot<T> = () => T
export type SubscribeFn = (onStoreChange: () => void) => () => void

export interface SubscribeOptions {
  key?: string
  keys?: string[]
}

export interface SnapshotHandle<T> {
  getSnapshot: Snapshot<T>
  subscribe: SubscribeFn
}

export interface StorageClient {
  getItem<T>(key: string, parser: ParserWithDefault<T, any>): T
  getItem<T>(key: string, parser: Parser<T>): T | null
  getItem(key: string): string | null

  setItem<T>(key: string, value: T, parser?: Parser<T>): void
  removeItem(key: string): void
  removeItems(keys: string[]): void
  clear(options?: { all?: boolean }): void

  has(key: string): boolean
  keys(): string[]
  size(): number

  subscribe(listener: (event: StorageEvent) => void, options?: SubscribeOptions): () => void

  batch(fn: () => void): void

  snapshot<T>(key: string, parser?: Parser<T> | ParserWithDefault<T, T>): SnapshotHandle<T | null>

  destroy(): void

  readonly prefix: string
  readonly adapter: StorageAdapter
}
