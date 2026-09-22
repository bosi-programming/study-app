import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type FixtureKind, goldenFixtures } from '@study/golden'

const packageRoot = resolve(import.meta.dirname, '..')

const ENVELOPE_KEYS = ['case', 'kind', 'requirement'] as const

const REQUIRED_KEYS_BY_KIND: Record<FixtureKind, readonly string[]> = {
  'initial-due': ['new_item', 'created_on', 'cases'],
  progression: ['difficulty', 'base_interval_days', 'cap_days', 'checkins', 'expected_intervals'],
  checkin: ['state', 'checkins'],
  reevaluate: ['state', 'params', 'expected'],
  'queue-order': ['today', 'items', 'expected_order'],
  normalize: ['pairs'],
  'queue-streak': ['initial', 'days'],
}

const REQUIRED_REQUIREMENTS = [
  'T-01',
  'T-02',
  'T-03',
  'T-04',
  'T-05',
  'T-11',
  'T-12',
  'T-20',
  'T-21',
] as const

function fixtureNames(): string[] {
  return readdirSync(packageRoot)
    .filter((entry) => entry.endsWith('.json'))
    .filter((entry) => entry !== 'package.json' && !entry.startsWith('tsconfig'))
    .sort()
}

function readFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(packageRoot, name), 'utf8')) as Record<string, unknown>
}

function isFixtureKind(value: unknown): value is FixtureKind {
  return typeof value === 'string' && Object.hasOwn(REQUIRED_KEYS_BY_KIND, value)
}

describe('S-03 golden shape', () => {
  it('ships at least one fixture case', () => {
    expect(fixtureNames().length).toBeGreaterThan(0)
  })

  it.each(fixtureNames())('%s declares a known kind and that kind of keys', (name) => {
    const fixture = readFixture(name)

    for (const key of ENVELOPE_KEYS) {
      expect(Object.hasOwn(fixture, key), `${name} is missing ${key}`).toBe(true)
    }

    expect(typeof fixture.case).toBe('string')
    expect(typeof fixture.requirement).toBe('string')

    const { kind } = fixture
    expect(isFixtureKind(kind), `${name} declares an unknown kind: ${String(kind)}`).toBe(true)
    if (!isFixtureKind(kind)) return

    for (const key of REQUIRED_KEYS_BY_KIND[kind]) {
      expect(Object.hasOwn(fixture, key), `${name} is missing ${key}`).toBe(true)
    }
  })
})

describe('S-04 golden unique case names', () => {
  it('does not repeat a case name', () => {
    const names = fixtureNames().map((name) => readFixture(name).case)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('S-05 golden progressao-ate-teto', () => {
  it('has one interval per check-in and ends at the cap', () => {
    const fixture = goldenFixtures.find((candidate) => candidate.case === 'progressao-ate-teto')
    expect(fixture, 'progressao-ate-teto fixture is missing').toBeDefined()
    if (fixture?.kind !== 'progression') return

    expect(fixture.expected_intervals.length).toBe(fixture.checkins)
    expect(fixture.expected_intervals.at(-1)).toBe(fixture.cap_days)
    expect(fixture.cap_days).toBe(365)
  })
})

describe('S-18 golden coverage of the plan cases', () => {
  const requirements = new Set(goldenFixtures.map((fixture) => fixture.requirement))
  const kinds = new Set(goldenFixtures.map((fixture) => fixture.kind))

  it.each(REQUIRED_REQUIREMENTS)('%s has a fixture', (requirement) => {
    expect(requirements.has(requirement), `nenhum fixture cobre ${requirement}`).toBe(true)
  })

  it.each(Object.keys(REQUIRED_KEYS_BY_KIND))('the %s kind has a fixture', (kind) => {
    expect(kinds.has(kind as FixtureKind), `nenhum fixture usa o kind ${kind}`).toBe(true)
  })
})
