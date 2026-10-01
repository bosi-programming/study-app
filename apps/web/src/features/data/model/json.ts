import { type Difficulty, type Item, type ItemStatus, type ReviewLog, toDifficulty } from '@study/core'
import { CURRENT_SCHEMA_VERSION, migrateDump } from './migrations.ts'

export type ItemJson = {
  readonly id: string
  readonly title: string
  readonly subject: string
  readonly difficulty: number
  readonly note: string | null
  readonly link: string | null
  readonly interval_days: number
  readonly due_date: string
  readonly review_count: number
  readonly on_time_streak: number
  readonly status: string
  readonly last_reviewed_at: string | null
  readonly archived_at: string | null
  readonly cold_archived_at: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type ReviewLogJson = {
  readonly id: string
  readonly item_id: string
  readonly reviewed_at: string
  readonly due_date_at_review: string
  readonly interval_after: number
  readonly review_count_after: number
  readonly late: boolean
}

export type ColdArchiveRecord = {
  readonly id: string
  readonly payload: string
  readonly cold_archived_at: string
}

export type DumpJsonV1 = {
  readonly schema_version: 1
  readonly exported_at: string
  readonly meta: Record<string, string | number | null>
  readonly items: readonly ItemJson[]
  readonly review_logs: readonly ReviewLogJson[]
  readonly cold_archive: readonly Record<string, unknown>[]
}

export type ParsedDumpV1 = {
  readonly schema_version: number
  readonly exported_at: string
  readonly meta: Record<string, string | number | null>
  readonly items: readonly Item[]
  readonly review_logs: readonly ReviewLog[]
  readonly cold_archive: readonly ColdArchiveRecord[]
}

export type DumpSnapshot = {
  readonly exportedAt: string
  readonly meta: Record<string, string | null>
  readonly items: readonly Item[]
  readonly reviewLogs: readonly ReviewLog[]
  readonly coldArchive: readonly ColdArchiveRecord[]
}

const DEFAULT_LOCALE = 'pt-BR'
const DEFAULT_COLD_ARCHIVE_AFTER_DAYS = 180
const DEFAULT_STREAK_CURRENT = 0
const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 5
const ITEM_STATUSES: readonly ItemStatus[] = ['active', 'archived', 'cold']

export class InvalidDumpError extends Error {
  constructor() {
    super('arquivo fora do contrato JSON v1')
    this.name = 'InvalidDumpError'
  }
}

export class UnsupportedSchemaError extends Error {
  readonly version: number

  constructor(version: number) {
    super(`schema_version ${version} nao suportado`)
    this.name = 'UnsupportedSchemaError'
    this.version = version
  }
}

function invalidDump(): never {
  throw new InvalidDumpError()
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidDump()
  return value as Record<string, unknown>
}

function asArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) invalidDump()
  return value
}

function asString(value: unknown): string {
  if (typeof value !== 'string') invalidDump()
  return value
}

function asOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  return asString(value)
}

function asInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) invalidDump()
  return value
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalidDump()
  return value
}

function asDifficulty(value: unknown): Difficulty {
  const difficulty = asInteger(value)
  if (difficulty < MIN_DIFFICULTY || difficulty > MAX_DIFFICULTY) invalidDump()
  return toDifficulty(difficulty)
}

function asStatus(value: unknown): ItemStatus {
  const status = asString(value)
  if (!ITEM_STATUSES.includes(status as ItemStatus)) invalidDump()
  return status as ItemStatus
}

function decode(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return invalidDump()
  }
}

export function schemaVersionOf(value: unknown): number {
  const version = asRecord(value)['schema_version']
  const parsed = asInteger(version)
  if (parsed < 1) invalidDump()
  return parsed
}

export function fromItemJson(value: unknown): Item {
  const record = asRecord(value)
  return {
    id: asString(record.id),
    title: asString(record.title),
    subject: asString(record.subject),
    difficulty: asDifficulty(record.difficulty),
    note: asOptionalString(record.note),
    link: asOptionalString(record.link),
    interval_days: asInteger(record.interval_days),
    due_date: asString(record.due_date),
    review_count: asInteger(record.review_count),
    on_time_streak: asInteger(record.on_time_streak),
    status: asStatus(record.status),
    last_reviewed_at: asOptionalString(record.last_reviewed_at),
    archived_at: asOptionalString(record.archived_at),
    cold_archived_at: asOptionalString(record.cold_archived_at),
    created_at: asString(record.created_at),
    updated_at: asString(record.updated_at),
  }
}

export function fromReviewLogJson(value: unknown): ReviewLog {
  const record = asRecord(value)
  return {
    id: asString(record.id),
    item_id: asString(record.item_id),
    reviewed_at: asString(record.reviewed_at),
    due_date_at_review: asString(record.due_date_at_review),
    interval_after: asInteger(record.interval_after),
    review_count_after: asInteger(record.review_count_after),
    late: asBoolean(record.late),
  }
}

export function fromColdArchiveJson(value: unknown): ColdArchiveRecord {
  const record = asRecord(value)
  const item = fromItemJson(record.item)
  const reviewLogs = asArray(record.review_logs).map(fromReviewLogJson)
  return {
    id: item.id,
    payload: JSON.stringify({ item, review_logs: reviewLogs }),
    cold_archived_at: asString(record.cold_archived_at),
  }
}

function parseMeta(value: unknown): Record<string, string | number | null> {
  const record = asRecord(value)
  const meta: Record<string, string | number | null> = {}
  for (const [key, entry] of Object.entries(record)) meta[key] = metaValue(entry)
  return meta
}

function metaValue(value: unknown): string | number | null {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  return invalidDump()
}

export function parseDumpV1(text: string): ParsedDumpV1 {
  const record = asRecord(decode(text))
  const version = schemaVersionOf(record)
  if (version > CURRENT_SCHEMA_VERSION) throw new UnsupportedSchemaError(version)
  const migrated = migrateDump(record, version)
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    exported_at: asString(migrated.exported_at),
    meta: parseMeta(migrated.meta),
    items: asArray(migrated.items).map(fromItemJson),
    review_logs: asArray(migrated.review_logs).map(fromReviewLogJson),
    cold_archive: asArray(migrated.cold_archive).map(fromColdArchiveJson),
  }
}

export function toItemJson(item: Item): ItemJson {
  return {
    id: item.id,
    title: item.title,
    subject: item.subject,
    difficulty: item.difficulty,
    note: item.note,
    link: item.link,
    interval_days: item.interval_days,
    due_date: item.due_date,
    review_count: item.review_count,
    on_time_streak: item.on_time_streak,
    status: item.status,
    last_reviewed_at: item.last_reviewed_at,
    archived_at: item.archived_at,
    cold_archived_at: item.cold_archived_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }
}

export function toReviewLogJson(log: ReviewLog): ReviewLogJson {
  return {
    id: log.id,
    item_id: log.item_id,
    reviewed_at: log.reviewed_at,
    due_date_at_review: log.due_date_at_review,
    interval_after: log.interval_after,
    review_count_after: log.review_count_after,
    late: log.late,
  }
}

export function dumpJsonV1(snapshot: DumpSnapshot): DumpJsonV1 {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    exported_at: snapshot.exportedAt,
    meta: {
      cold_archive_after_days: windowMeta(snapshot.meta['cold_archive_after_days'] ?? null),
      locale: snapshot.meta['locale'] ?? DEFAULT_LOCALE,
      streak_current: numberMeta(snapshot.meta['streak_current'] ?? null, DEFAULT_STREAK_CURRENT),
      streak_last_day: snapshot.meta['streak_last_day'] ?? null,
    },
    items: snapshot.items.map(toItemJson),
    review_logs: snapshot.reviewLogs.map(toReviewLogJson),
    cold_archive: snapshot.coldArchive.map(coldArchiveJson),
  }
}

function coldArchiveJson(entry: ColdArchiveRecord): Record<string, unknown> {
  return {
    ...(JSON.parse(entry.payload) as Record<string, unknown>),
    cold_archived_at: entry.cold_archived_at,
  }
}

function windowMeta(value: string | null): number {
  if (value === null) return DEFAULT_COLD_ARCHIVE_AFTER_DAYS
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return DEFAULT_COLD_ARCHIVE_AFTER_DAYS
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_COLD_ARCHIVE_AFTER_DAYS
  return parsed
}

function numberMeta(value: string | null, fallback: number): number {
  if (value === null || value.length === 0) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
