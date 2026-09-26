import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { resolve } from 'node:path'
import {
  type Difficulty,
  type Item,
  type ReviewLog,
  addDays,
  daysBetween,
  initialDueDate,
} from '@study/core'
import { type FixtureKind, type GoldenFixture, goldenFixtures } from '@study/golden'
import { systemDeps } from '../../src/deps.ts'
import { type ItemJson, type ReviewLogJson } from '../../src/output/json.ts'
import { type Store, openStore } from '../../src/persistence/index.ts'

const repoRoot = resolve(import.meta.dirname, '../../../..')
const binPath = resolve(repoRoot, 'node_modules/.bin/study')

type FixtureByKind = {
  readonly [K in FixtureKind]: Extract<GoldenFixture, { readonly kind: K }>
}

const fixturesByCase = new Map(goldenFixtures.map((fixture) => [fixture.case, fixture]))

export function fixtureOf<K extends FixtureKind>(kind: K, name: string): FixtureByKind[K] {
  const fixture = fixturesByCase.get(name)
  if (fixture === undefined || fixture.kind !== kind) {
    throw new Error(`fixture ausente: ${name}`)
  }
  return fixture as FixtureByKind[K]
}

export type RunOptions = {
  readonly cwd?: string
  readonly env?: Record<string, string>
}

export const SPAWN_SWEEP_TIMEOUT_MS = 30_000

export function runStudy(args: readonly string[], options: RunOptions = {}): SpawnSyncReturns<string> {
  return spawnSync(binPath, [...args], {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  })
}

export function jsonOf(result: SpawnSyncReturns<string>): Record<string, unknown> {
  return JSON.parse(result.stdout) as Record<string, unknown>
}

export function dataOf(result: SpawnSyncReturns<string>, command: string): Record<string, unknown> {
  const payload = jsonOf(result)[command]
  if (payload === null || typeof payload !== 'object') {
    throw new Error(`resposta de ${command} sem payload`)
  }
  return payload as Record<string, unknown>
}

export function itemOf(result: SpawnSyncReturns<string>, command: string): ItemJson {
  return dataOf(result, command)['item'] as ItemJson
}

export function itemsOf(result: SpawnSyncReturns<string>, command: string): ItemJson[] {
  return dataOf(result, command)['items'] as ItemJson[]
}

export function queueOf(result: SpawnSyncReturns<string>): Record<string, unknown> {
  return dataOf(result, 'due')
}

export function historyOf(result: SpawnSyncReturns<string>): ReviewLogJson[] {
  return dataOf(result, 'show')['history'] as ReviewLogJson[]
}

export function errorOf(result: SpawnSyncReturns<string>): { code: string; message: string } {
  const parsed = JSON.parse(result.stderr) as {
    error: { code: string; message: string }
  }
  return parsed.error
}

export function seed(
  dbPath: string,
  data: { readonly items?: readonly Item[]; readonly logs?: readonly ReviewLog[] },
): void {
  withStore(dbPath, (store) => {
    store.transaction(() => {
      for (const item of data.items ?? []) store.saveItem(item)
      for (const log of data.logs ?? []) store.saveReviewLog(log)
    })
  })
}

export function withStore<T>(dbPath: string, run: (store: Store) => T): T {
  const store = openStore(dbPath)
  try {
    return run(store)
  } finally {
    store.close()
  }
}

export function todayLocalDate(): string {
  return systemDeps.clock.todayLocalDate()
}

export function expectedDue(difficulty: Difficulty): string {
  return initialDueDate(difficulty, todayLocalDate())
}

export function rebaseDelta(fixtureToday: string): number {
  return daysBetween(fixtureToday, todayLocalDate())
}

export function rebasedDate(date: string, deltaDays: number): string {
  return addDays(date, deltaDays)
}
