import { dirname, join } from 'node:path'
import { type Deps, type Item, type ReviewLog, daysBetween } from '@study/core'
import { readColdArchiveWindow } from './config.ts'
import { localDateOf } from './deps.ts'
import { writeJsonAtomic } from './output/file.ts'
import { dumpJsonV1, toItemJson, toReviewLogJson } from './output/json.ts'
import { type Store } from './persistence/index.ts'

export const LAST_COLD_ARCHIVE_EXPORT_AT = 'last_cold_archive_export_at'
const EXPORT_DIR = 'exports'
const EXPORT_PREFIX = 'cold-archive-'
const EXPORT_SUFFIX = '.json'

export type ColdArchiveMigration = {
  readonly migrated: number
  readonly exportPath: string | null
  readonly exportError: string | null
}

export type MigrateOptions = {
  readonly store: Store
  readonly deps: Deps
  readonly exportDir: string | null
  readonly dbPath: string
  readonly today: string
}

export function coldArchiveExportPath(
  exportDir: string | null,
  dbPath: string,
  today: string,
): string {
  const dir = exportDir ?? join(dirname(dbPath), EXPORT_DIR)
  return join(dir, `${EXPORT_PREFIX}${today}${EXPORT_SUFFIX}`)
}

export function itemsDueForColdArchive(
  items: readonly Item[],
  today: string,
  window: number,
): Item[] {
  return items.filter((item) => {
    if (item.status !== 'archived') return false
    if (item.archived_at === null) return false
    return daysBetween(localDateOf(item.archived_at), today) > window
  })
}

export function coldArchivePayload(item: Item, logs: readonly ReviewLog[]): string {
  return JSON.stringify({ item: toItemJson(item), review_logs: logs.map(toReviewLogJson) })
}

export function archiveItem(item: Item, now: string): Item {
  return { ...item, status: 'archived', archived_at: now, updated_at: now }
}

export function unarchiveItem(item: Item, now: string): Item {
  return { ...item, status: 'active', archived_at: null, updated_at: now }
}

export function restoreItem(item: Item, now: string): Item {
  return { ...item, status: 'active', archived_at: null, cold_archived_at: null, updated_at: now }
}

export function purgeItem(store: Store, item: Item): void {
  store.transaction(() => {
    store.deleteItem(item.id)
    store.deleteColdArchive(item.id)
  })
}

export function migrateColdArchive(options: MigrateOptions): ColdArchiveMigration {
  const { store, deps, exportDir, dbPath, today } = options
  const candidates = itemsDueForColdArchive(store.listItems(), today, readColdArchiveWindow(store))
  if (candidates.length === 0) return { migrated: 0, exportPath: null, exportError: null }

  const exportPath = coldArchiveExportPath(exportDir, dbPath, today)
  try {
    writeJsonAtomic(exportPath, dumpJsonV1(store, deps))
  } catch (error) {
    const exportError = error instanceof Error ? error.message : String(error)
    return { migrated: 0, exportPath, exportError }
  }

  const now = deps.clock.nowUtc()
  store.transaction(() => {
    for (const candidate of candidates) {
      const cold = migrateItem(candidate, now)
      store.saveItem(cold)
      store.saveColdArchive({
        id: cold.id,
        payload: coldArchivePayload(cold, store.listReviewLogs(cold.id)),
        cold_archived_at: now,
      })
    }
    store.setMeta(LAST_COLD_ARCHIVE_EXPORT_AT, now)
  })

  return { migrated: candidates.length, exportPath, exportError: null }
}

function migrateItem(item: Item, now: string): Item {
  return { ...item, status: 'cold', cold_archived_at: now, updated_at: now }
}
