import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'
import { BUSY_TIMEOUT_MS, PRAGMAS, SCHEMA_SQL } from '../apps/cli/src/persistence/schema.ts'

export { BUSY_TIMEOUT_MS, PRAGMAS, SCHEMA_SQL }

const QUEUE_SIZE = 5_000
const QUEUE_BUDGET_MS = 200

const ITEM_ID = '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60'
const ITEM_TITLE = 'Derivadas parciais'
const REVIEW_ID = '9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d'
const TODAY = '2026-09-12'

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
]

const DIFFICULTIES = [1, 2, 3, 4, 5]

const INSERT_REVIEW_LOG_SQL = `INSERT INTO review_logs (id, item_id, reviewed_at, due_date_at_review,
  interval_after, review_count_after, late)
VALUES (?, ?, ?, ?, ?, ?, ?)`

type CheckResult = { name: string; ok: boolean; detail: string }

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function captureError(run: () => void): string | null {
  try {
    run()
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

async function check(
  results: CheckResult[],
  name: string,
  predicate: () => string | Promise<string>,
): Promise<void> {
  try {
    results.push({ name, ok: true, detail: await predicate() })
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

function insertItem(
  db: DatabaseSync,
  id: string,
  difficulty: number,
  dueDate: string,
  status = 'active',
): void {
  const columns = ITEM_COLUMNS.join(', ')
  const values = ITEM_COLUMNS.map((column) => `:${column}`).join(', ')
  db.prepare(`INSERT INTO items (${columns}) VALUES (${values})`).run({
    id,
    title: `Item ${id}`,
    title_key: `item ${id}`,
    subject: 'Cálculo',
    subject_key: 'calculo',
    difficulty,
    note: null,
    link: null,
    interval_days: 6,
    due_date: dueDate,
    review_count: 0,
    on_time_streak: 0,
    status,
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: '2026-08-30T09:00:00Z',
    updated_at: '2026-08-30T09:00:00Z',
  })
}

type ReviewLogRow = {
  readonly id: string
  readonly itemId: string
  readonly reviewedAt: string
  readonly dueDateAtReview: string
  readonly intervalAfter: number
  readonly reviewCountAfter: number
  readonly late: number
}

function insertReviewLog(db: DatabaseSync, row: ReviewLogRow): void {
  db.prepare(INSERT_REVIEW_LOG_SQL).run(
    row.id,
    row.itemId,
    row.reviewedAt,
    row.dueDateAtReview,
    row.intervalAfter,
    row.reviewCountAfter,
    row.late,
  )
}

function orphanReviewLog(id: string): ReviewLogRow {
  return {
    id,
    itemId: 'nao-existe',
    reviewedAt: TODAY,
    dueDateAtReview: TODAY,
    intervalAfter: 6,
    reviewCountAfter: 1,
    late: 0,
  }
}

function rowCount(db: DatabaseSync, query: string, params: readonly string[] = []): number {
  return Number(db.prepare(query).get(...params)?.total)
}

function countReviewLogs(db: DatabaseSync, itemId: string): number {
  return rowCount(db, 'SELECT count(*) AS total FROM review_logs WHERE item_id = ?', [itemId])
}

function checkDdl(db: DatabaseSync): string {
  db.exec(SCHEMA_SQL)
  const found = db
    .prepare(
      `SELECT name FROM sqlite_master
         WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
    )
    .all()
    .map((row) => String(row.name))
  const expected = [
    'cold_archive',
    'idx_items_due',
    'idx_items_subject',
    'idx_items_title',
    'idx_review_logs_item',
    'items',
    'meta',
    'review_logs',
  ]
  assert(
    JSON.stringify(found) === JSON.stringify(expected),
    `sqlite_master devolveu: ${found.join(', ')}`,
  )
  return `${found.length} objetos do doc criados sem ajuste`
}

function checkPragmas(db: DatabaseSync): string {
  const journal = String(db.prepare('PRAGMA journal_mode').get()?.journal_mode)
  const foreignKeys = Number(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys)
  const timeout = Number(db.prepare('PRAGMA busy_timeout').get()?.timeout)
  assert(journal === 'wal', `journal_mode = ${journal}`)
  assert(foreignKeys === 1, `foreign_keys = ${foreignKeys}`)
  assert(timeout === BUSY_TIMEOUT_MS, `busy_timeout = ${timeout}`)
  return `journal_mode=wal, foreign_keys=ON, busy_timeout=${timeout}ms`
}

function checkRoundTrip(db: DatabaseSync): string {
  insertItem(db, ITEM_ID, 4, TODAY)
  db.prepare(
    `UPDATE items SET title = :title, note = :note, interval_days = 6, review_count = 2,
       on_time_streak = 2, last_reviewed_at = :last_reviewed_at, updated_at = :updated_at
     WHERE id = :id`,
  ).run({
    id: ITEM_ID,
    title: ITEM_TITLE,
    note: 'cap. 3 do Stewart',
    last_reviewed_at: '2026-09-06T22:10:00Z',
    updated_at: '2026-09-06T22:10:00Z',
  })
  insertReviewLog(db, {
    id: REVIEW_ID,
    itemId: ITEM_ID,
    reviewedAt: '2026-09-06T22:10:00Z',
    dueDateAtReview: '2026-09-06',
    intervalAfter: 6,
    reviewCountAfter: 2,
    late: 0,
  })
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '1')

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(ITEM_ID)
  assert(item !== undefined, 'o Item não voltou')
  const expectedItem: Record<string, string | number | null> = {
    id: ITEM_ID,
    title: ITEM_TITLE,
    title_key: `item ${ITEM_ID}`,
    subject: 'Cálculo',
    subject_key: 'calculo',
    difficulty: 4,
    note: 'cap. 3 do Stewart',
    link: null,
    interval_days: 6,
    due_date: TODAY,
    review_count: 2,
    on_time_streak: 2,
    status: 'active',
    last_reviewed_at: '2026-09-06T22:10:00Z',
    archived_at: null,
    cold_archived_at: null,
    created_at: '2026-08-30T09:00:00Z',
    updated_at: '2026-09-06T22:10:00Z',
  }
  const itemDiff = Object.keys(expectedItem).filter((key) => item[key] !== expectedItem[key])
  assert(itemDiff.length === 0, `campos divergentes no Item: ${itemDiff.join(', ')}`)

  const log = db.prepare('SELECT * FROM review_logs WHERE id = ?').get(REVIEW_ID)
  const expectedLog: Record<string, string | number> = {
    id: REVIEW_ID,
    item_id: ITEM_ID,
    reviewed_at: '2026-09-06T22:10:00Z',
    due_date_at_review: '2026-09-06',
    interval_after: 6,
    review_count_after: 2,
    late: 0,
  }
  const logDiff = Object.keys(expectedLog).filter((key) => log?.[key] !== expectedLog[key])
  assert(logDiff.length === 0, `campos divergentes no ReviewLog: ${logDiff.join(', ')}`)

  const meta = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')
  assert(meta?.value === '1', `meta.schema_version = ${String(meta?.value)}`)

  return 'Item, ReviewLog e meta voltam com os campos do contrato JSON; late é gravado como 0, que o contrato publica como false'
}

async function checkBackup(db: DatabaseSync, backupPath: string): Promise<string> {
  const pages = await backup(db, backupPath)
  const copy = new DatabaseSync(backupPath)
  try {
    const total = rowCount(copy, 'SELECT count(*) AS total FROM items')
    const title = copy.prepare('SELECT title FROM items WHERE id = ?').get(ITEM_ID)?.title
    assert(total === 1, `a cópia tem ${total} itens`)
    assert(title === ITEM_TITLE, `a cópia devolveu ${String(title)}`)
    return `cópia de ${pages} páginas abre e devolve o item gravado`
  } finally {
    copy.close()
  }
}

function checkDifficultyBounds(db: DatabaseSync): string {
  for (const difficulty of DIFFICULTIES) {
    insertItem(db, `check-${difficulty}`, difficulty, TODAY, 'archived')
  }
  const rejection = captureError(() => insertItem(db, 'check-7', 7, TODAY, 'archived'))
  assert(rejection !== null, 'dificuldade 7 foi aceita')
  const kept = rowCount(db, 'SELECT count(*) AS total FROM items WHERE id LIKE ?', ['check-%'])
  assert(kept === DIFFICULTIES.length, `${kept} itens de 1–5 sobreviveram`)
  return '1–5 aceitas; 7 recusada pelo CHECK'
}

function checkForeignKeyOn(db: DatabaseSync): string {
  const rejection = captureError(() => insertReviewLog(db, orphanReviewLog('orphan-on')))
  assert(rejection !== null, 'o órfão foi aceito com FK ligada')
  return 'órfão recusado'
}

function checkForeignKeyOff(db: DatabaseSync): string {
  db.exec('PRAGMA foreign_keys = OFF')
  const rejection = captureError(() => insertReviewLog(db, orphanReviewLog('orphan-off')))
  db.prepare('DELETE FROM review_logs WHERE id = ?').run('orphan-off')
  db.exec('PRAGMA foreign_keys = ON')
  const restored = Number(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys)
  assert(rejection === null, `com FK desligada o órfão foi recusado: ${rejection}`)
  assert(restored === 1, `foreign_keys voltou como ${restored}`)
  return 'órfão aceito com FK desligada; pragma religado em seguida'
}

function checkCascade(db: DatabaseSync): string {
  const before = countReviewLogs(db, ITEM_ID)
  assert(before === 1, `o item tinha ${before} review_logs antes`)
  db.prepare('DELETE FROM items WHERE id = ?').run(ITEM_ID)
  const after = countReviewLogs(db, ITEM_ID)
  assert(after === 0, `sobraram ${after} review_logs`)
  return 'apagar o item apagou o seu review_log'
}

function seedQueue(db: DatabaseSync): void {
  db.exec('BEGIN')
  try {
    for (let index = 0; index < QUEUE_SIZE; index += 1) {
      insertItem(db, `queue-${index}`, (index % DIFFICULTIES.length) + 1, '2026-09-01')
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function checkQueueBudget(db: DatabaseSync): string {
  const queue = db.prepare(
    `SELECT id, title, subject, difficulty, interval_days, due_date, review_count, status
       FROM items WHERE status = 'active' AND due_date <= ? ORDER BY due_date, id`,
  )
  const activeBefore = rowCount(
    db,
    "SELECT count(*) AS total FROM items WHERE status = 'active' AND due_date <= ?",
    [TODAY],
  )
  seedQueue(db)
  const started = performance.now()
  const rows = queue.all(TODAY)
  const payload = JSON.stringify(rows)
  const elapsed = performance.now() - started
  assert(
    rows.length === activeBefore + QUEUE_SIZE,
    `a fila devolveu ${rows.length} itens, esperado ${activeBefore + QUEUE_SIZE}`,
  )
  assert(
    elapsed < QUEUE_BUDGET_MS,
    `${elapsed.toFixed(2)}ms estourou o teto de ${QUEUE_BUDGET_MS}ms`,
  )
  return `${rows.length} itens em ${elapsed.toFixed(2)}ms (${payload.length} bytes de JSON)`
}

async function probe(): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const dir = mkdtempSync(join(tmpdir(), 'study-sqlite-probe-'))
  const dbPath = join(dir, 'probe.db')
  const backupPath = join(dir, 'backup.db')
  const db = new DatabaseSync(dbPath)

  try {
    for (const pragma of PRAGMAS) db.exec(pragma)
    const version = String(db.prepare('SELECT sqlite_version() AS version').get()?.version)
    console.log(`sqlite-probe — node:sqlite · SQLite ${version} · Node ${process.version}\n`)

    await check(results, 'DDL canônico (4 tabelas + 4 índices)', () => checkDdl(db))
    await check(results, 'PRAGMAs (foreign_keys, WAL, busy_timeout)', () => checkPragmas(db))
    await check(results, 'round-trip de Item, ReviewLog e meta', () => checkRoundTrip(db))
    await check(results, 'backup() gera arquivo que abre e devolve as linhas', () =>
      checkBackup(db, backupPath),
    )
    await check(results, 'CHECK de difficulty (1–5 aceita, 7 recusa)', () =>
      checkDifficultyBounds(db),
    )
    await check(results, 'FK recusa review_log órfão com foreign_keys = ON', () =>
      checkForeignKeyOn(db),
    )
    await check(results, 'FK aceita review_log órfão com foreign_keys = OFF', () =>
      checkForeignKeyOff(db),
    )
    await check(results, 'ON DELETE CASCADE apaga os review_logs', () => checkCascade(db))
    await check(
      results,
      `RNF-03: fila de ${QUEUE_SIZE} itens abaixo de ${QUEUE_BUDGET_MS}ms`,
      () => checkQueueBudget(db),
    )
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }

  return results
}

async function main(): Promise<void> {
  const results = await probe()
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name} — ${result.detail}`)
  }
  const failures = results.filter((result) => !result.ok).length
  console.log(`\n${results.length - failures}/${results.length} verificações passaram`)
  if (failures > 0) process.exitCode = 1
}

if (import.meta.main) {
  await main()
}
