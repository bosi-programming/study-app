import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { systemDeps } from '../apps/cli/src/deps.ts'
import { openStore } from '../apps/cli/src/persistence/index.ts'
import { type Difficulty, type Item } from '../packages/core/src/index.ts'

export const DEFAULT_QUEUE_SIZE = 5_000
export const DEFAULT_QUEUE_BUDGET_MS = 200
const WARMUP_ROUNDS = 2
const MEASURE_ROUNDS = 5

const QUEUE_SIZE = Number(process.env.STUDY_BENCH_QUEUE_SIZE ?? DEFAULT_QUEUE_SIZE)
const QUEUE_BUDGET_MS = Number(process.env.STUDY_BENCH_BUDGET_MS ?? DEFAULT_QUEUE_BUDGET_MS)

const BIN_PATH = resolve(import.meta.dirname, '../node_modules/.bin/study')
const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5]

type BenchResult = { readonly ok: boolean; readonly name: string; readonly detail: string }

type BenchOptions = {
  readonly queueSize?: number
  readonly expectedItems?: number
  readonly budgetMs?: number
}

function benchItem(index: number, today: string): Item {
  return {
    id: `bench-${String(index).padStart(5, '0')}`,
    title: `Item de benchmark ${index}`,
    subject: index % 2 === 0 ? 'Cálculo' : 'Álgebra Linear',
    difficulty: DIFFICULTIES[index % DIFFICULTIES.length] ?? 1,
    note: null,
    link: null,
    interval_days: 3,
    due_date: today,
    review_count: 0,
    on_time_streak: 0,
    status: 'active',
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
  }
}

function seedQueue(dbPath: string, today: string, size: number): void {
  const store = openStore(dbPath)
  try {
    store.transaction(() => {
      for (let index = 0; index < size; index += 1) {
        store.saveItem(benchItem(index, today))
      }
    })
  } finally {
    store.close()
  }
}

function queueTotal(stdout: string): number {
  const payload = JSON.parse(stdout) as {
    due?: { overdue?: readonly unknown[]; today?: readonly unknown[] }
  }
  return (payload.due?.overdue?.length ?? 0) + (payload.due?.today?.length ?? 0)
}

function measureRound(dbPath: string, expectedItems: number): number {
  const started = performance.now()
  const result = spawnSync(BIN_PATH, ['due', '--json', '--db', dbPath], { encoding: 'utf8' })
  const elapsed = performance.now() - started

  if (result.status !== 0) {
    throw new Error(`study due saiu com ${String(result.status)}: ${result.stderr.trim()}`)
  }
  const total = queueTotal(result.stdout)
  if (total !== expectedItems) {
    throw new Error(`a fila devolveu ${total} itens, esperado ${expectedItems}`)
  }
  return elapsed
}

function median(values: readonly number[]): number {
  const sorted = [...values].toSorted((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function bench(options: BenchOptions = {}): BenchResult {
  const queueSize = options.queueSize ?? QUEUE_SIZE
  const expectedItems = options.expectedItems ?? queueSize
  const budgetMs = options.budgetMs ?? QUEUE_BUDGET_MS
  const dir = mkdtempSync(join(tmpdir(), 'study-bench-'))
  const dbPath = join(dir, 'bench.db')

  try {
    const today = systemDeps.clock.todayLocalDate()
    const seedStarted = performance.now()
    seedQueue(dbPath, today, queueSize)
    const seedMs = performance.now() - seedStarted

    for (let round = 0; round < WARMUP_ROUNDS; round += 1) measureRound(dbPath, expectedItems)
    const samples = Array.from(
      { length: MEASURE_ROUNDS },
      () => measureRound(dbPath, expectedItems),
    )
    const elapsed = median(samples)

    return {
      ok: elapsed < budgetMs,
      name: `RNF-03: fila de ${queueSize} itens abaixo de ${budgetMs}ms`,
      detail:
        `aquecimento ${WARMUP_ROUNDS} + mediana de ${MEASURE_ROUNDS} rodadas: ` +
        `${elapsed.toFixed(1)}ms (seed em ${seedMs.toFixed(0)}ms)`,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function main(): void {
  const result = bench()
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`)
  if (!result.ok) process.exitCode = 1
}

if (import.meta.main) {
  main()
}
