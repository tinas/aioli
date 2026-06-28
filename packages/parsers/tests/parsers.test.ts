import { describe, expect, test } from 'vite-plus/test'

import {
  defineParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsDate,
  parseAsFloat,
  parseAsIndex,
  parseAsInteger,
  parseAsJson,
  parseAsMap,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
  resolveDefault,
} from '../src'

describe('resolveDefault', () => {
  test('resolves a plain value', () => {
    expect(resolveDefault(42)).toBe(42)
  })

  test('resolves a factory function', () => {
    expect(resolveDefault(() => 'hello')).toBe('hello')
  })
})

describe('defineParser', () => {
  test('creates a parser with parse and serialize', () => {
    const parser = defineParser({ parse: v => Number(v), serialize: v => String(v) })
    expect(parser.parse('123')).toBe(123)
    expect(parser.serialize(456)).toBe('456')
  })

  test('.default() creates a parser with defaultValue', () => {
    const parser = parseAsString.default('fallback')
    expect(parser.defaultValue).toBe('fallback')
    expect(parser.parse('hi')).toBe('hi')
    expect(parser.serialize('hi')).toBe('hi')
  })
})

describe('parseAsString', () => {
  test('parses any string as-is', () => {
    expect(parseAsString.parse('hello')).toBe('hello')
    expect(parseAsString.parse('')).toBe('')
  })

  test('serializes a string as-is', () => {
    expect(parseAsString.serialize('world')).toBe('world')
  })
})

describe('parseAsInteger', () => {
  test('parses valid integers', () => {
    expect(parseAsInteger.parse('42')).toBe(42)
    expect(parseAsInteger.parse('-7')).toBe(-7)
  })

  test('returns null for invalid input', () => {
    expect(parseAsInteger.parse('abc')).toBeNull()
    expect(parseAsInteger.parse('')).toBeNull()
  })

  test('serializes by truncating', () => {
    expect(parseAsInteger.serialize(3.9)).toBe('3')
  })
})

describe('parseAsFloat', () => {
  test('parses valid floats', () => {
    expect(parseAsFloat.parse('3.14')).toBeCloseTo(3.14)
  })

  test('returns null for invalid input', () => {
    expect(parseAsFloat.parse('abc')).toBeNull()
  })

  test('serializes floats', () => {
    expect(parseAsFloat.serialize(2.5)).toBe('2.5')
  })
})

describe('parseAsIndex', () => {
  test('parses 1-based index to 0-based', () => {
    expect(parseAsIndex.parse('1')).toBe(0)
    expect(parseAsIndex.parse('5')).toBe(4)
  })

  test('serializes 0-based to 1-based', () => {
    expect(parseAsIndex.serialize(0)).toBe('1')
    expect(parseAsIndex.serialize(4)).toBe('5')
  })

  test('returns null for invalid input', () => {
    expect(parseAsIndex.parse('abc')).toBeNull()
  })
})

describe('parseAsBoolean', () => {
  test('parses true/false strings', () => {
    expect(parseAsBoolean.parse('true')).toBe(true)
    expect(parseAsBoolean.parse('false')).toBe(false)
  })

  test('returns null for invalid input', () => {
    expect(parseAsBoolean.parse('yes')).toBeNull()
    expect(parseAsBoolean.parse('')).toBeNull()
  })

  test('serializes booleans', () => {
    expect(parseAsBoolean.serialize(true)).toBe('true')
    expect(parseAsBoolean.serialize(false)).toBe('false')
  })
})

describe('parseAsStringLiteral', () => {
  const parser = parseAsStringLiteral(['a', 'b', 'c'] as const)

  test('parses valid values', () => {
    expect(parser.parse('a')).toBe('a')
    expect(parser.parse('b')).toBe('b')
  })

  test('returns null for invalid values', () => {
    expect(parser.parse('d')).toBeNull()
  })
})

describe('parseAsNumberLiteral', () => {
  const parser = parseAsNumberLiteral([1, 2, 3] as const)

  test('parses valid number values', () => {
    expect(parser.parse('1')).toBe(1)
    expect(parser.parse('3')).toBe(3)
  })

  test('returns null for invalid values', () => {
    expect(parser.parse('5')).toBeNull()
    expect(parser.parse('abc')).toBeNull()
  })
})

describe('parseAsStringEnum', () => {
  enum Color {
    Red = 'red',
    Blue = 'blue',
  }
  const parser = parseAsStringEnum(Object.values(Color))

  test('parses valid enum values', () => {
    expect(parser.parse('red')).toBe('red')
  })

  test('returns null for invalid values', () => {
    expect(parser.parse('green')).toBeNull()
  })
})

describe('parseAsDate', () => {
  test('parses date strings (YYYY-MM-DD)', () => {
    const d = parseAsDate.parse('2024-01-15')
    expect(d).toBeInstanceOf(Date)
    expect(d!.toISOString().startsWith('2024-01-15')).toBe(true)
  })

  test('parses ISO datetime strings', () => {
    const d = parseAsDate.parse('2024-01-15T10:30:00.000Z')
    expect(d).toBeInstanceOf(Date)
  })

  test('returns null for invalid dates', () => {
    expect(parseAsDate.parse('not-a-date')).toBeNull()
  })

  test('serializes to YYYY-MM-DD', () => {
    const d = new Date('2024-06-01T00:00:00.000Z')
    expect(parseAsDate.serialize(d)).toBe('2024-06-01')
  })

  test('.iso() parses and serializes full ISO strings', () => {
    const isoParser = parseAsDate.iso()
    const d = isoParser.parse('2024-01-15T10:30:00.000Z')
    expect(d).toBeInstanceOf(Date)
    expect(isoParser.serialize(d!)).toBe('2024-01-15T10:30:00.000Z')
  })

  test('.timestamp() parses and serializes timestamps', () => {
    const tsParser = parseAsDate.timestamp()
    const now = new Date()
    const serialized = tsParser.serialize(now)
    expect(serialized).toBe(now.getTime().toString())
    const parsed = tsParser.parse(serialized)
    expect(parsed!.getTime()).toBe(now.getTime())
  })
})

describe('parseAsArrayOf', () => {
  const parser = parseAsArrayOf(parseAsInteger)

  test('parses comma-separated integers', () => {
    expect(parser.parse('1,2,3')).toEqual([1, 2, 3])
  })

  test('parses empty string as empty array', () => {
    expect(parser.parse('')).toEqual([])
  })

  test('returns null if any item is invalid', () => {
    expect(parser.parse('1,abc,3')).toBeNull()
  })

  test('serializes arrays', () => {
    expect(parser.serialize([1, 2, 3])).toBe('1,2,3')
  })

  test('supports custom separator', () => {
    const p = parseAsArrayOf(parseAsString, '|')
    expect(p.parse('a|b|c')).toEqual(['a', 'b', 'c'])
    expect(p.serialize(['x', 'y'])).toBe('x|y')
  })
})

describe('parseAsJson', () => {
  const parser = parseAsJson<{ name: string }>()

  test('parses valid JSON', () => {
    expect(parser.parse('{"name":"test"}')).toEqual({ name: 'test' })
  })

  test('returns null for invalid JSON', () => {
    expect(parser.parse('not json')).toBeNull()
  })

  test('serializes to JSON string', () => {
    expect(parser.serialize({ name: 'test' })).toBe('{"name":"test"}')
  })
})

describe('parseAsMap', () => {
  const parser = parseAsMap(parseAsString, parseAsInteger)

  test('parses map from string', () => {
    const result = parser.parse('a:1;b:2')
    expect(result).toBeInstanceOf(Map)
    expect(result!.get('a')).toBe(1)
    expect(result!.get('b')).toBe(2)
  })

  test('parses empty string as empty map', () => {
    const result = parser.parse('')
    expect(result!.size).toBe(0)
  })

  test('returns null for invalid entries', () => {
    expect(parser.parse('invalid')).toBeNull()
  })

  test('returns null for invalid values', () => {
    expect(parser.parse('a:abc')).toBeNull()
  })

  test('serializes map to string', () => {
    const map = new Map([
      ['x', 10],
      ['y', 20],
    ])
    expect(parser.serialize(map)).toBe('x:10;y:20')
  })
})
