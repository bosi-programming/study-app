import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { resolve } from 'node:path'
import { type Difficulty, type Item, type ReviewLog, initialDueDate } from '@study/core'
import { systemDeps } from '../../src/deps.ts'
import { type ItemJson, type ReviewLogJson } from '../../src/output/json.ts'
import { type Store, openStore } from '../../src/persistence/index.ts'

const repoRoot = resolve(import.meta.dirname, '../../../..')
const binPath = resolve(repoRoot, 'node_modules/.bin/study')

export type RunOptions = {
  readonly cwd?: string
  readonly env?: Record<string, string>
}

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

export function idPrefix(id: string): string {
  return id.slice(0, 8)
}
