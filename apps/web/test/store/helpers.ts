import { type Item, type ReviewLog } from '@study/core'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { type IdbEnvironment } from '../../src/store/idb.ts'
import { openStore, type Store } from '../../src/store/store.ts'

let counter = 0

export type TestStore = {
  readonly store: Store
  readonly environment: IdbEnvironment
  readonly name: string
}

export function freshEnvironment(): IdbEnvironment {
  return { factory: new IDBFactory(), keyRange: IDBKeyRange }
}

export function uniqueDbName(): string {
  counter += 1
  return `study-test-${counter}`
}

export async function openTestStore(): Promise<TestStore> {
  const environment = freshEnvironment()
  const name = uniqueDbName()
  const store = await openStore(environment, name)
  return { store, environment, name }
}

export function makeItem(id: string, overrides: Partial<Omit<Item, 'id'>> = {}): Item {
  return {
    id,
    title: `Item ${id}`,
    subject: 'Cálculo',
    difficulty: 3,
    note: null,
    link: null,
    interval_days: 3,
    due_date: '2026-09-30',
    review_count: 0,
    on_time_streak: 0,
    status: 'active',
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
    ...overrides,
  }
}

export function makeLog(
  id: string,
  itemId: string,
  overrides: Partial<Omit<ReviewLog, 'id' | 'item_id'>> = {},
): ReviewLog {
  return {
    id,
    item_id: itemId,
    reviewed_at: '2026-09-06T22:10:00Z',
    due_date_at_review: '2026-09-06',
    interval_after: 6,
    review_count_after: 1,
    late: false,
    ...overrides,
  }
}

export async function seed(store: Store, items: readonly Item[]): Promise<void> {
  await store.transaction(async (scoped) => {
    for (const item of items) await scoped.saveItem(item)
  })
}
