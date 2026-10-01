import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { type IdbEnvironment, openStore, type Store } from '../apps/web/src/store/index.ts'
import { type Difficulty, type Item } from '../packages/core/src/index.ts'

export const DEFAULT_QUEUE_SIZE = 5_000
export const DEFAULT_QUEUE_BUDGET_MS = 200
const WARMUP_ROUNDS = 2
const MEASURE_ROUNDS = 5

const QUEUE_SIZE = Number(process.env.STUDY_WEB_BENCH_QUEUE_SIZE ?? DEFAULT_QUEUE_SIZE)
const QUEUE_BUDGET_MS = Number(process.env.STUDY_WEB_BENCH_BUDGET_MS ?? DEFAULT_QUEUE_BUDGET_MS)

const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5]

type BenchResult = { readonly ok: boolean; readonly name: string; readonly detail: string }

type BenchOptions = {
  readonly queueSize?: number
  readonly expectedItems?: number
  readonly budgetMs?: number
}

function todayLocalDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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

async function seedQueue(store: Store, today: string, size: number): Promise<void> {
  await store.transaction(async (scoped) => {
    for (let index = 0; index < size; index += 1) await scoped.saveItem(benchItem(index, today))
  })
}

async function measureRound(store: Store, today: string, expectedItems: number): Promise<number> {
  const started = performance.now()
  const items = await store.dueItems(today)
  const elapsed = performance.now() - started

  if (items.length !== expectedItems) {
    throw new Error(`a fila devolveu ${items.length} itens, esperado ${expectedItems}`)
  }
  return elapsed
}

function median(values: readonly number[]): number {
  const sorted = [...values].toSorted((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export async function bench(options: BenchOptions = {}): Promise<BenchResult> {
  const queueSize = options.queueSize ?? QUEUE_SIZE
  const expectedItems = options.expectedItems ?? queueSize
  const budgetMs = options.budgetMs ?? QUEUE_BUDGET_MS
  const today = todayLocalDate()
  const environment: IdbEnvironment = { factory: new IDBFactory(), keyRange: IDBKeyRange }
  const store = await openStore(environment, 'bench-web')

  try {
    const seedStarted = performance.now()
    await seedQueue(store, today, queueSize)
    const seedMs = performance.now() - seedStarted

    for (let round = 0; round < WARMUP_ROUNDS; round += 1) await measureRound(store, today, expectedItems)
    const samples: number[] = []
    for (let round = 0; round < MEASURE_ROUNDS; round += 1) {
      samples.push(await measureRound(store, today, expectedItems))
    }
    const elapsed = median(samples)

    return {
      ok: elapsed < budgetMs,
      name: `RNF-03 (web): fila de ${queueSize} itens abaixo de ${budgetMs}ms`,
      detail:
        `aquecimento ${WARMUP_ROUNDS} + mediana de ${MEASURE_ROUNDS} rodadas: ` +
        `${elapsed.toFixed(1)}ms (seed em ${seedMs.toFixed(0)}ms)`,
    }
  } finally {
    store.close()
  }
}

async function main(): Promise<void> {
  const result = await bench()
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`)
  if (!result.ok) process.exitCode = 1
}

if (import.meta.main) {
  void main()
}
