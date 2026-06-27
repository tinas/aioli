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
