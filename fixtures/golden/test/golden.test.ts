import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')

type GoldenCase = {
  case: string
  difficulty: number
  base_interval_days: number
  cap_days: number
  checkins: number
  expected_intervals: number[]
}

const REQUIRED_KEYS = [
  'case',
  'difficulty',
  'base_interval_days',
  'cap_days',
  'checkins',
  'expected_intervals',
] as const

function fixtureNames(): string[] {
  return readdirSync(packageRoot)
    .filter((entry) => entry.endsWith('.json'))
    .filter((entry) => entry !== 'package.json' && !entry.startsWith('tsconfig'))
    .sort()
}

function readFixtures(): GoldenCase[] {
  return fixtureNames().map((name) =>
    JSON.parse(readFileSync(resolve(packageRoot, name), 'utf8')) as GoldenCase,
  )
}

describe('T-03 golden shape', () => {
  it('ships at least one fixture case', () => {
    expect(fixtureNames().length).toBeGreaterThan(0)
  })

  it.each(fixtureNames())('%s declares the documented keys', (name) => {
    const fixture = JSON.parse(
      readFileSync(resolve(packageRoot, name), 'utf8'),
    ) as Record<string, unknown>

    for (const key of REQUIRED_KEYS) {
      expect(Object.hasOwn(fixture, key), `missing ${key}`).toBe(true)
    }

    expect(typeof fixture.case).toBe('string')
    expect(Number.isInteger(fixture.difficulty)).toBe(true)
    expect(Number.isInteger(fixture.base_interval_days)).toBe(true)
    expect(Number.isInteger(fixture.cap_days)).toBe(true)
    expect(Number.isInteger(fixture.checkins)).toBe(true)
    expect(Array.isArray(fixture.expected_intervals)).toBe(true)
    expect((fixture.expected_intervals as unknown[]).every((n) => Number.isInteger(n))).toBe(true)
  })
})

describe('T-04 golden unique case names', () => {
  it('does not repeat a case name', () => {
    const names = readFixtures().map((fixture) => fixture.case)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('T-05 golden progressao-ate-teto', () => {
  it('has one interval per check-in and ends at the cap', () => {
    const fixture = readFixtures().find((candidate) => candidate.case === 'progressao-ate-teto')
    expect(fixture, 'progressao-ate-teto fixture is missing').toBeDefined()
    if (!fixture) return

    expect(fixture.expected_intervals.length).toBe(fixture.checkins)
    expect(fixture.expected_intervals.at(-1)).toBe(fixture.cap_days)
    expect(fixture.cap_days).toBe(365)
  })
})
