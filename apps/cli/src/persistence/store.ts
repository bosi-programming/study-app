import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { normalizeText, type Item, type ItemStatus, type ReviewLog } from '@study/core'
import { SCHEMA_SQL, PRAGMAS } from './schema.ts'
import {
  itemToRow,
  rowToItem,
  reviewLogToRow,
  rowToReviewLog,
  type ItemRow,
  type ReviewLogRow,
} from './mapping.ts'

export type ItemFilter = {
  readonly status?: ItemStatus
  readonly subjectKey?: string
}

export type ColdArchiveEntry = {
  readonly id: string
  readonly payload: string
  readonly cold_archived_at: string
}

export type Store = {
  close(): void
  schemaVersion(): number | null
  saveItem(item: Item): void
  getItem(id: string): Item | null
  deleteItem(id: string): void
  listItems(filter?: ItemFilter): Item[]
  findItems(term: string, filter?: ItemFilter): Item[]
  dueItems(today: string): Item[]
  countItems(status: ItemStatus): number
  saveReviewLog(log: ReviewLog): void
  listReviewLogs(itemId?: string): ReviewLog[]
  getMeta(key: string): string | null
  setMeta(key: string, value: string): void
  saveColdArchive(entry: ColdArchiveEntry): void
  listColdArchive(): ColdArchiveEntry[]
  deleteColdArchive(id: string): void
  transaction<T>(run: () => T): T
}

const ITEM_COLUMNS = [
  'id',
  'title',
  'title_key',
  'subject',
  'subject_key',
  'difficulty',
  'note',
  'link',
  'interval_days',
  'due_date',
  'review_count',
  'on_time_streak',
  'status',
  'last_reviewed_at',
  'archived_at',
  'cold_archived_at',
  'created_at',
  'updated_at',
] as const

const UPSERT_ITEM_SQL = `INSERT INTO items (${ITEM_COLUMNS.join(', ')})
VALUES (${ITEM_COLUMNS.map((column) => `:${column}`).join(', ')})
ON CONFLICT(id) DO UPDATE SET
  ${ITEM_COLUMNS.filter((column) => column !== 'id')
    .map((column) => `${column} = :${column}`)
    .join(', ')}`

const INSERT_REVIEW_LOG_SQL = `INSERT INTO review_logs (id, item_id, reviewed_at, due_date_at_review,
  interval_after, review_count_after, late)
VALUES (?, ?, ?, ?, ?, ?, ?)`

const SELECT_ITEMS_ORDER = 'ORDER BY due_date, id'

function rowAsItemRow(row: Record<string, SQLOutputValue>): ItemRow {
  return row as unknown as ItemRow
}

function rowAsReviewLogRow(row: Record<string, SQLOutputValue>): ReviewLogRow {
  return row as unknown as ReviewLogRow
}

export function openStore(dbPath: string): Store {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)

  for (const pragma of PRAGMAS) db.exec(pragma)

  const itemsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'")
    .get()
  if (itemsTable === undefined) {
    db.exec(SCHEMA_SQL)
    db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '1')
  }

  const saveItemPrepared = db.prepare(UPSERT_ITEM_SQL)
  const saveReviewLogPrepared = db.prepare(INSERT_REVIEW_LOG_SQL)

  function getItem(id: string): Item | null {
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id)
    return row === undefined ? null : rowToItem(rowAsItemRow(row))
  }

  function filterClauses(filter: ItemFilter | undefined): {
    clauses: string[]
    params: string[]
  } {
    const clauses: string[] = []
    const params: string[] = []
    if (filter?.status !== undefined) {
      clauses.push('status = ?')
      params.push(filter.status)
    }
    if (filter?.subjectKey !== undefined) {
      clauses.push('subject_key = ?')
      params.push(filter.subjectKey)
    }
    return { clauses, params }
  }

  function listItems(filter?: ItemFilter): Item[] {
    const { clauses, params } = filterClauses(filter)
    const where = clauses.length === 0 ? '' : ` WHERE ${clauses.join(' AND ')}`
    const rows = db
      .prepare(`SELECT * FROM items${where} ${SELECT_ITEMS_ORDER}`)
      .all(...params)
    return rows.map((row) => rowToItem(rowAsItemRow(row)))
  }

  function findItems(term: string, filter?: ItemFilter): Item[] {
    const pattern = `%${normalizeText(term).replace(/[\\%_]/g, (char) => `\\${char}`)}%`
    const { clauses, params } = filterClauses(filter)
    const where = [`title_key LIKE ? ESCAPE '\\'`, ...clauses].join(' AND ')
    const rows = db
      .prepare(`SELECT * FROM items WHERE ${where} ${SELECT_ITEMS_ORDER}`)
      .all(pattern, ...params)
    return rows.map((row) => rowToItem(rowAsItemRow(row)))
  }

  function dueItems(today: string): Item[] {
    const rows = db
      .prepare(
        `SELECT * FROM items
           WHERE status = 'active' AND due_date <= ?
           ${SELECT_ITEMS_ORDER}`,
      )
      .all(today)
    return rows.map((row) => rowToItem(rowAsItemRow(row)))
  }

  function listReviewLogs(itemId?: string): ReviewLog[] {
    const rows =
      itemId === undefined
        ? db.prepare('SELECT * FROM review_logs ORDER BY reviewed_at, id').all()
        : db.prepare('SELECT * FROM review_logs WHERE item_id = ? ORDER BY reviewed_at, id').all(itemId)
    return rows.map((row) => rowToReviewLog(rowAsReviewLogRow(row)))
  }

  let inTransaction = false

  function transaction<T>(run: () => T): T {
    if (inTransaction) throw new Error('transação aninhada não é permitida')
    db.exec('BEGIN')
    inTransaction = true
    try {
      const result = run()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    } finally {
      inTransaction = false
    }
  }

  return {
    close: () => db.close(),
    schemaVersion: () => {
      const value = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get()
      return value === undefined ? null : Number(value.value)
    },
    saveItem: (item) => {
      saveItemPrepared.run(itemToRow(item))
    },
    getItem,
    deleteItem: (id) => {
      db.prepare('DELETE FROM items WHERE id = ?').run(id)
    },
    listItems,
    findItems,
    dueItems,
    countItems: (status) => {
      const row = db.prepare('SELECT count(*) AS total FROM items WHERE status = ?').get(status)
      return Number(row?.total)
    },
    saveReviewLog: (log) => {
      const row = reviewLogToRow(log)
      saveReviewLogPrepared.run(
        row.id,
        row.item_id,
        row.reviewed_at,
        row.due_date_at_review,
        row.interval_after,
        row.review_count_after,
        row.late,
      )
    },
    listReviewLogs,
    getMeta: (key) => {
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key)
      return row === undefined ? null : String(row.value)
    },
    setMeta: (key, value) => {
      db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
        key,
        value,
      )
    },
    saveColdArchive: (entry) => {
      db.prepare(
        'INSERT INTO cold_archive (id, payload, cold_archived_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, cold_archived_at = excluded.cold_archived_at',
      ).run(entry.id, entry.payload, entry.cold_archived_at)
    },
    listColdArchive: () => {
      const rows = db.prepare('SELECT * FROM cold_archive ORDER BY cold_archived_at, id').all()
      return rows.map((row) => ({
        id: String(row.id),
        payload: String(row.payload),
        cold_archived_at: String(row.cold_archived_at),
      }))
    },
    deleteColdArchive: (id) => {
      db.prepare('DELETE FROM cold_archive WHERE id = ?').run(id)
    },
    transaction,
  }
}