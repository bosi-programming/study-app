import { normalizeText, subjectKey, titleKey, type Item, type ItemStatus, type ReviewLog } from '@study/core'
import { type IdbEnvironment } from './idb.ts'
import {
  itemToRow,
  reviewLogToRow,
  rowToItem,
  rowToReviewLog,
  type ItemRow,
  type ReviewLogRow,
} from './mapping.ts'
import {
  COLD_ARCHIVE_COLD_ARCHIVED_AT_INDEX,
  COLD_ARCHIVE_STORE,
  IDB_NAME,
  IDB_SCHEMA,
  IDB_VERSION,
  ITEMS_STATUS_DUE_DATE_INDEX,
  ITEMS_STORE,
  META_STORE,
  REVIEW_LOGS_ITEM_ID_REVIEWED_AT_INDEX,
  REVIEW_LOGS_STORE,
  SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  applySchema,
} from './schema.ts'

export type ItemFilter = {
  readonly status?: ItemStatus
  readonly subjectKey?: string
}

export type OpenStoreOptions = {
  readonly checkSchema?: boolean
}

export type ColdArchiveEntry = {
  readonly id: string
  readonly payload: string
  readonly cold_archived_at: string
}

export type Store = {
  close(): void
  schemaVersion(): Promise<number | null>
  saveItem(item: Item): Promise<void>
  getItem(id: string): Promise<Item | null>
  deleteItem(id: string): Promise<void>
  listItems(filter?: ItemFilter): Promise<Item[]>
  findItems(term: string, filter?: ItemFilter): Promise<Item[]>
  dueItems(today: string, filter?: ItemFilter): Promise<Item[]>
  countItems(status: ItemStatus, filter?: ItemFilter): Promise<number>
  saveReviewLog(log: ReviewLog): Promise<void>
  listReviewLogs(itemId?: string): Promise<ReviewLog[]>
  getMeta(key: string): Promise<string | null>
  setMeta(key: string, value: string): Promise<void>
  saveColdArchive(entry: ColdArchiveEntry): Promise<void>
  listColdArchive(): Promise<ColdArchiveEntry[]>
  deleteColdArchive(id: string): Promise<void>
  transaction<T>(run: (store: Store) => Promise<T>): Promise<T>
}

export class SchemaVersionError extends Error {
  constructor(version: number | null) {
    super(`schema_version divergente: esperado ${SCHEMA_VERSION}, encontrado ${version ?? 'ausente'}`)
    this.name = 'SchemaVersionError'
  }
}

export class SchemaMismatchError extends Error {
  constructor(detail: string) {
    super(`schema IndexedDB divergente do documento: ${detail}`)
    this.name = 'SchemaMismatchError'
  }
}

const ACTIVE_STATUS: ItemStatus = 'active'
const ALL_STORES: readonly string[] = IDB_SCHEMA.map((store) => store.name)

function compareValues(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function byDueDateThenId(left: Item, right: Item): number {
  return compareValues(left.due_date, right.due_date) || compareValues(left.id, right.id)
}

function byReviewedAtThenId(left: ReviewLog, right: ReviewLog): number {
  return compareValues(left.reviewed_at, right.reviewed_at) || compareValues(left.id, right.id)
}

function matchesFilter(item: Item, filter: ItemFilter | undefined): boolean {
  if (filter?.status !== undefined && item.status !== filter.status) return false
  if (filter?.subjectKey !== undefined && subjectKey(item) !== filter.subjectKey) return false
  return true
}

function request<T>(input: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    input.onsuccess = () => resolve(input.result)
    input.onerror = () => reject(input.error ?? new Error('falha no IndexedDB'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('transação abortada'))
    transaction.onerror = () => reject(transaction.error ?? new Error('falha na transação'))
  })
}

function metaValue(row: unknown): string | null {
  const value = (row as { readonly value?: string } | undefined)?.value
  return value ?? null
}

export function createView(transaction: IDBTransaction, environment: IdbEnvironment): Store {
  const items = (): IDBObjectStore => transaction.objectStore(ITEMS_STORE)
  const logs = (): IDBObjectStore => transaction.objectStore(REVIEW_LOGS_STORE)
  const meta = (): IDBObjectStore => transaction.objectStore(META_STORE)
  const cold = (): IDBObjectStore => transaction.objectStore(COLD_ARCHIVE_STORE)

  async function schemaVersion(): Promise<number | null> {
    const value = metaValue(await request(meta().get(SCHEMA_VERSION_KEY)))
    return value === null ? null : Number(value)
  }

  async function getItem(id: string): Promise<Item | null> {
    const row = (await request(items().get(id))) as ItemRow | undefined
    return row === undefined ? null : rowToItem(row)
  }

  async function listItems(filter?: ItemFilter): Promise<Item[]> {
    const rows = (await request(items().getAll())) as ItemRow[]
    return rows.map(rowToItem).filter((item) => matchesFilter(item, filter)).toSorted(byDueDateThenId)
  }

  async function findItems(term: string, filter?: ItemFilter): Promise<Item[]> {
    const needle = normalizeText(term)
    const rows = (await request(items().getAll())) as ItemRow[]
    return rows
      .map(rowToItem)
      .filter((item) => titleKey(item).includes(needle) && matchesFilter(item, filter))
      .toSorted(byDueDateThenId)
  }

  async function dueItems(today: string, filter?: ItemFilter): Promise<Item[]> {
    const effective: ItemFilter = { status: ACTIVE_STATUS, ...filter }
    const status = effective.status ?? ACTIVE_STATUS
    const range = environment.keyRange.bound([status], [status, today])
    const rows = (await request(items().index(ITEMS_STATUS_DUE_DATE_INDEX).getAll(range))) as ItemRow[]
    return rows.map(rowToItem).filter((item) => matchesFilter(item, effective)).toSorted(byDueDateThenId)
  }

  async function countItems(status: ItemStatus, filter?: ItemFilter): Promise<number> {
    const effective: ItemFilter = { ...filter, status }
    const rows = (await request(items().getAll())) as ItemRow[]
    return rows.map(rowToItem).filter((item) => matchesFilter(item, effective)).length
  }

  async function deleteItem(id: string): Promise<void> {
    await request(items().delete(id))
    const range = environment.keyRange.bound([id], [id, []])
    const keys = await request(logs().index(REVIEW_LOGS_ITEM_ID_REVIEWED_AT_INDEX).getAllKeys(range))
    for (const key of keys) await request(logs().delete(key))
  }

  async function listReviewLogs(itemId?: string): Promise<ReviewLog[]> {
    const rows =
      itemId === undefined
        ? ((await request(logs().getAll())) as ReviewLogRow[])
        : ((await request(
            logs()
              .index(REVIEW_LOGS_ITEM_ID_REVIEWED_AT_INDEX)
              .getAll(environment.keyRange.bound([itemId], [itemId, []])),
          )) as ReviewLogRow[])
    return rows.map(rowToReviewLog).toSorted(byReviewedAtThenId)
  }

  return {
    close: () => {
      throw new Error('não é possível fechar o store dentro de uma transação')
    },
    schemaVersion,
    saveItem: async (item) => {
      await request(items().put(itemToRow(item)))
    },
    getItem,
    deleteItem,
    listItems,
    findItems,
    dueItems,
    countItems,
    saveReviewLog: async (log) => {
      await request(logs().put(reviewLogToRow(log)))
    },
    listReviewLogs,
    getMeta: async (key) => metaValue(await request(meta().get(key))),
    setMeta: async (key, value) => {
      await request(meta().put({ key, value }))
    },
    saveColdArchive: async (entry) => {
      await request(cold().put(entry))
    },
    listColdArchive: async () => {
      const rows = (await request(
        cold().index(COLD_ARCHIVE_COLD_ARCHIVED_AT_INDEX).getAll(),
      )) as ColdArchiveEntry[]
      return rows.toSorted(
        (left, right) =>
          compareValues(left.cold_archived_at, right.cold_archived_at) || compareValues(left.id, right.id),
      )
    },
    deleteColdArchive: async (id) => {
      await request(cold().delete(id))
    },
    transaction: async <T>(): Promise<T> => {
      throw new Error('transação aninhada não é permitida')
    },
  }
}

async function readSchemaVersion(db: IDBDatabase): Promise<number | null> {
  const transaction = db.transaction(META_STORE, 'readonly')
  const value = metaValue(await request(transaction.objectStore(META_STORE).get(SCHEMA_VERSION_KEY)))
  return value === null ? null : Number(value)
}

async function assertSchema(db: IDBDatabase): Promise<void> {
  const actualStores = Array.from(db.objectStoreNames).toSorted()
  const expectedStores = [...ALL_STORES].toSorted()
  if (actualStores.join(',') !== expectedStores.join(',')) {
    throw new SchemaMismatchError(`stores ${actualStores.join(', ') || 'ausentes'}`)
  }

  for (const spec of IDB_SCHEMA) {
    const store = db.transaction(spec.name, 'readonly').objectStore(spec.name)
    if (store.keyPath !== spec.keyPath) {
      throw new SchemaMismatchError(`keyPath de ${spec.name}`)
    }
    const actualIndexes = Array.from(store.indexNames).toSorted()
    const expectedIndexes = spec.indexes.map((index) => index.name).toSorted()
    if (actualIndexes.join(',') !== expectedIndexes.join(',')) {
      throw new SchemaMismatchError(`índices de ${spec.name}`)
    }
  }

  const version = await readSchemaVersion(db)
  if (version !== Number(SCHEMA_VERSION)) throw new SchemaVersionError(version)
}

function createStore(db: IDBDatabase, environment: IdbEnvironment): Store {
  let inTransaction = false

  async function runInTransaction<T>(
    mode: IDBTransactionMode,
    run: (view: Store) => Promise<T>,
  ): Promise<T> {
    const transaction = db.transaction([...ALL_STORES], mode)
    try {
      const result = await run(createView(transaction, environment))
      await transactionDone(transaction)
      return result
    } catch (error) {
      if (transaction.error === null) transaction.abort()
      throw error
    }
  }

  return {
    close: () => db.close(),
    schemaVersion: () => runInTransaction('readonly', (view) => view.schemaVersion()),
    saveItem: (item) => runInTransaction('readwrite', (view) => view.saveItem(item)),
    getItem: (id) => runInTransaction('readonly', (view) => view.getItem(id)),
    deleteItem: (id) => runInTransaction('readwrite', (view) => view.deleteItem(id)),
    listItems: (filter) => runInTransaction('readonly', (view) => view.listItems(filter)),
    findItems: (term, filter) => runInTransaction('readonly', (view) => view.findItems(term, filter)),
    dueItems: (today, filter) => runInTransaction('readonly', (view) => view.dueItems(today, filter)),
    countItems: (status, filter) => runInTransaction('readonly', (view) => view.countItems(status, filter)),
    saveReviewLog: (log) => runInTransaction('readwrite', (view) => view.saveReviewLog(log)),
    listReviewLogs: (itemId) => runInTransaction('readonly', (view) => view.listReviewLogs(itemId)),
    getMeta: (key) => runInTransaction('readonly', (view) => view.getMeta(key)),
    setMeta: (key, value) => runInTransaction('readwrite', (view) => view.setMeta(key, value)),
    saveColdArchive: (entry) => runInTransaction('readwrite', (view) => view.saveColdArchive(entry)),
    listColdArchive: () => runInTransaction('readonly', (view) => view.listColdArchive()),
    deleteColdArchive: (id) => runInTransaction('readwrite', (view) => view.deleteColdArchive(id)),
    transaction: async <T>(run: (view: Store) => Promise<T>): Promise<T> => {
      if (inTransaction) throw new Error('transação aninhada não é permitida')
      inTransaction = true
      try {
        return await runInTransaction('readwrite', run)
      } finally {
        inTransaction = false
      }
    },
  }
}

export function openStore(
  environment: IdbEnvironment,
  name: string = IDB_NAME,
  options: OpenStoreOptions = {},
): Promise<Store> {
  const checkSchema = options.checkSchema ?? true
  return new Promise((resolve, reject) => {
    const openRequest = environment.factory.open(name, IDB_VERSION)
    openRequest.onupgradeneeded = () => {
      const transaction = openRequest.transaction
      if (transaction === null) {
        reject(new Error('transação de upgrade ausente'))
        return
      }
      applySchema(transaction)
    }
    openRequest.onerror = () => reject(openRequest.error ?? new Error('falha ao abrir o IndexedDB'))
    openRequest.onsuccess = () => {
      const db = openRequest.result
      if (!checkSchema) {
        resolve(createStore(db, environment))
        return
      }
      assertSchema(db)
        .then(() => resolve(createStore(db, environment)))
        .catch((error: unknown) => {
          db.close()
          reject(error)
        })
    }
  })
}
