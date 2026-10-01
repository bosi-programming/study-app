import { type Item, type ReviewLog } from '@study/core'
import { InvalidDumpError, type ColdArchiveRecord, type ParsedDumpV1 } from './json.ts'

export type ImportCounts = {
  readonly items: number
  readonly reviewLogs: number
  readonly coldArchive: number
  readonly written: number
  readonly skipped: number
}

export type MergeOutcome<T> = {
  readonly write: readonly T[]
  readonly skipped: number
}

export type MetaWrite = {
  readonly key: string
  readonly value: string
}

export const META_KEYS = [
  'cold_archive_after_days',
  'locale',
  'streak_current',
  'streak_last_day',
] as const

export function validateReferences(
  dump: ParsedDumpV1,
  localItemIds: ReadonlySet<string>,
): void {
  const known = new Set<string>(localItemIds)
  for (const item of dump.items) known.add(item.id)
  const orphan = dump.review_logs.some((log) => !known.has(log.item_id))
  if (orphan) throw new InvalidDumpError()
}

export function mergeItems(dump: ParsedDumpV1, localItems: readonly Item[]): MergeOutcome<Item> {
  const known = new Map(localItems.map((item) => [item.id, item]))
  const write: Item[] = []
  let skipped = 0
  for (const item of dump.items) {
    const local = known.get(item.id)
    if (local !== undefined && !isNewer(item.updated_at, local.updated_at)) {
      skipped += 1
      continue
    }
    write.push(item)
    known.set(item.id, item)
  }
  return { write, skipped }
}

export function mergeReviewLogs(
  dump: ParsedDumpV1,
  localLogs: readonly ReviewLog[],
): MergeOutcome<ReviewLog> {
  const known = new Set(localLogs.map((log) => log.id))
  const write: ReviewLog[] = []
  let skipped = 0
  for (const log of dump.review_logs) {
    if (known.has(log.id)) {
      skipped += 1
      continue
    }
    write.push(log)
    known.add(log.id)
  }
  return { write, skipped }
}

export function mergeColdArchive(
  dump: ParsedDumpV1,
  localEntries: readonly ColdArchiveRecord[],
): MergeOutcome<ColdArchiveRecord> {
  const known = new Map(localEntries.map((entry) => [entry.id, entry]))
  const write: ColdArchiveRecord[] = []
  let skipped = 0
  for (const entry of dump.cold_archive) {
    const local = known.get(entry.id)
    if (local !== undefined && !isNewer(entry.cold_archived_at, local.cold_archived_at)) {
      skipped += 1
      continue
    }
    write.push(entry)
    known.set(entry.id, entry)
  }
  return { write, skipped }
}

export function mergeMeta(dump: ParsedDumpV1): readonly MetaWrite[] {
  const write: MetaWrite[] = []
  for (const key of META_KEYS) {
    const value = dump.meta[key]
    if (value === null || value === undefined) continue
    write.push({ key, value: String(value) })
  }
  return write
}

export function isNewer(incoming: string, local: string): boolean {
  return Date.parse(incoming) > Date.parse(local)
}
