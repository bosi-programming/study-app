import { readFileSync } from 'node:fs'
import { CliError } from './errors.ts'
import { type ParsedDumpV1, parseDumpV1 } from './output/json.ts'
import { type Store } from './persistence/index.ts'

export type ImportCounts = {
  readonly items: number
  readonly review_logs: number
  readonly cold_archive: number
  readonly written: number
  readonly skipped: number
}

type MergeCount = {
  readonly written: number
  readonly skipped: number
}

const META_KEYS = ['cold_archive_after_days', 'locale', 'streak_current', 'streak_last_day'] as const

export function readDumpFile(path: string): ParsedDumpV1 {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    throw CliError.invalidState(`arquivo não encontrado: ${path}`)
  }
  return parseDumpV1(text, path)
}

export function validateReferences(
  dump: ParsedDumpV1,
  localItemIds: ReadonlySet<string>,
  path: string,
): void {
  const known = new Set<string>(localItemIds)
  for (const item of dump.items) known.add(item.id)
  const orphan = dump.review_logs.some((log) => !known.has(log.item_id))
  if (orphan) throw CliError.invalidValue(`arquivo inválido: ${path}`)
}

export function applyDump(store: Store, dump: ParsedDumpV1): ImportCounts {
  return store.transaction(() => {
    const items = applyItems(store, dump)
    const reviewLogs = applyReviewLogs(store, dump)
    const coldArchive = applyColdArchive(store, dump)
    writeMeta(store, dump)
    return {
      items: items.written,
      review_logs: reviewLogs.written,
      cold_archive: coldArchive.written,
      written: items.written + reviewLogs.written + coldArchive.written,
      skipped: items.skipped + reviewLogs.skipped + coldArchive.skipped,
    }
  })
}

function applyItems(store: Store, dump: ParsedDumpV1): MergeCount {
  let written = 0
  let skipped = 0
  for (const item of dump.items) {
    const local = store.getItem(item.id)
    if (local !== null && !isNewer(item.updated_at, local.updated_at)) {
      skipped += 1
      continue
    }
    store.saveItem(item)
    written += 1
  }
  return { written, skipped }
}

function applyReviewLogs(store: Store, dump: ParsedDumpV1): MergeCount {
  const known = new Set(store.listReviewLogs().map((log) => log.id))
  let written = 0
  let skipped = 0
  for (const log of dump.review_logs) {
    if (known.has(log.id)) {
      skipped += 1
      continue
    }
    store.saveReviewLog(log)
    known.add(log.id)
    written += 1
  }
  return { written, skipped }
}

function applyColdArchive(store: Store, dump: ParsedDumpV1): MergeCount {
  const known = new Map(store.listColdArchive().map((entry) => [entry.id, entry]))
  let written = 0
  let skipped = 0
  for (const entry of dump.cold_archive) {
    const local = known.get(entry.id)
    if (local !== undefined && !isNewer(entry.cold_archived_at, local.cold_archived_at)) {
      skipped += 1
      continue
    }
    store.saveColdArchive(entry)
    known.set(entry.id, entry)
    written += 1
  }
  return { written, skipped }
}

function writeMeta(store: Store, dump: ParsedDumpV1): void {
  for (const key of META_KEYS) {
    const value = dump.meta[key]
    if (value === null || value === undefined) continue
    store.setMeta(key, String(value))
  }
}

function isNewer(incoming: string, local: string): boolean {
  return Date.parse(incoming) > Date.parse(local)
}
