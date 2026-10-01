export const IDB_NAME = 'study'
export const IDB_VERSION = 1
export const SCHEMA_VERSION_KEY = 'schema_version'
export const SCHEMA_VERSION = '1'

export const ITEMS_STORE = 'items'
export const REVIEW_LOGS_STORE = 'review_logs'
export const META_STORE = 'meta'
export const COLD_ARCHIVE_STORE = 'cold_archive'

export const ITEMS_STATUS_DUE_DATE_INDEX = 'status+due_date'
export const ITEMS_SUBJECT_KEY_STATUS_INDEX = 'subject_key+status'
export const REVIEW_LOGS_ITEM_ID_REVIEWED_AT_INDEX = 'item_id+reviewed_at'
export const COLD_ARCHIVE_COLD_ARCHIVED_AT_INDEX = 'cold_archived_at'

export type IndexSpec = {
  readonly name: string
  readonly keyPath: readonly string[]
}

export type StoreSpec = {
  readonly name: string
  readonly keyPath: string
  readonly indexes: readonly IndexSpec[]
}

export const IDB_SCHEMA: readonly StoreSpec[] = [
  {
    name: ITEMS_STORE,
    keyPath: 'id',
    indexes: [
      { name: ITEMS_STATUS_DUE_DATE_INDEX, keyPath: ['status', 'due_date'] },
      { name: ITEMS_SUBJECT_KEY_STATUS_INDEX, keyPath: ['subject_key', 'status'] },
    ],
  },
  {
    name: REVIEW_LOGS_STORE,
    keyPath: 'id',
    indexes: [{ name: REVIEW_LOGS_ITEM_ID_REVIEWED_AT_INDEX, keyPath: ['item_id', 'reviewed_at'] }],
  },
  { name: META_STORE, keyPath: 'key', indexes: [] },
  {
    name: COLD_ARCHIVE_STORE,
    keyPath: 'id',
    indexes: [{ name: COLD_ARCHIVE_COLD_ARCHIVED_AT_INDEX, keyPath: ['cold_archived_at'] }],
  },
]

export function applySchema(transaction: IDBTransaction): void {
  for (const store of IDB_SCHEMA) {
    const objectStore = transaction.db.createObjectStore(store.name, { keyPath: store.keyPath })
    for (const index of store.indexes) {
      objectStore.createIndex(index.name, [...index.keyPath])
    }
  }

  transaction.objectStore(META_STORE).put({ key: SCHEMA_VERSION_KEY, value: SCHEMA_VERSION })
}
