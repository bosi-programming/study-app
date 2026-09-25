import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { systemDeps } from '../apps/cli/src/deps.ts'
import { openStore } from '../apps/cli/src/persistence/index.ts'
import { type Difficulty, type Item } from '../packages/core/src/index.ts'

const QUEUE_SIZE = 5_000
const QUEUE_BUDGET_MS = 200
const WARMUP_ROUNDS = 2
const MEASURE_ROUNDS = 5

const BIN_PATH = resolve(import.meta.dirname, '../node_modules/.bin/study')
const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5]

type BenchResult = { readonly ok: boolean; readonly name: string; readonly detail: string }

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

function seedQueue(dbPath: string, today: string): void {
  const store = openStore(dbPath)
  try {
    store.transaction(() => {
      for (let index = 0; index < QUEUE_SIZE; index += 1) {
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

function measureRound(dbPath: string): number {
  const started = performance.now()
  const result = spawnSync(BIN_PATH, ['due', '--json', '--db', dbPath], { encoding: 'utf8' })
  const elapsed = performance.now() - started

  if (result.status !== 0) {
    throw new Error(`study due saiu com ${String(result.status)}: ${result.stderr.trim()}`)
  }
  const total = queueTotal(result.stdout)
  if (total !== QUEUE_SIZE) {
    throw new Error(`a fila devolveu ${total} itens, esperado ${QUEUE_SIZE}`)
  }
  return elapsed
}

function median(values: readonly number[]): number {
  const sorted = [...values].toSorted((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

function bench(): BenchResult {
  const dir = mkdtempSync(join(tmpdir(), 'study-bench-'))
  const dbPath = join(dir, 'bench.db')

  try {
    const today = systemDeps.clock.todayLocalDate()
    const seedStarted = performance.now()
    seedQueue(dbPath, today)
    const seedMs = performance.now() - seedStarted

    for (let round = 0; round < WARMUP_ROUNDS; round += 1) measureRound(dbPath)
    const samples = Array.from({ length: MEASURE_ROUNDS }, () => measureRound(dbPath))
    const elapsed = median(samples)

    return {
      ok: elapsed < QUEUE_BUDGET_MS,
      name: `RNF-03: fila de ${QUEUE_SIZE} itens abaixo de ${QUEUE_BUDGET_MS}ms`,
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
