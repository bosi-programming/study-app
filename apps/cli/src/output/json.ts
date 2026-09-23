import { type Deps, type Item, type ReviewLog } from '@study/core'
import { type Store } from '../persistence/index.ts'

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

export type DumpJsonV1 = {
  readonly schema_version: 1
  readonly exported_at: string
  readonly meta: Record<string, string | number | null>
  readonly items: readonly ItemJson[]
  readonly review_logs: readonly ReviewLogJson[]
  readonly cold_archive: readonly Record<string, unknown>[]
}

const SCHEMA_VERSION = 1
const DEFAULT_COLD_ARCHIVE_DAYS = 180
const DEFAULT_LOCALE = 'pt-BR'

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

export function envelope(command: string, value: unknown): Record<string, unknown> {
  return { schema_version: SCHEMA_VERSION, [command]: value }
}

export function dumpJsonV1(store: Store, deps: Deps): DumpJsonV1 {
  return {
    schema_version: SCHEMA_VERSION,
    exported_at: deps.clock.nowUtc(),
    meta: {
      cold_archive_after_days: numberMeta(
        store.getMeta('cold_archive_after_days'),
        DEFAULT_COLD_ARCHIVE_DAYS,
      ),
      locale: store.getMeta('locale') ?? DEFAULT_LOCALE,
      streak_current: numberMeta(store.getMeta('streak_current'), 0),
      streak_last_day: store.getMeta('streak_last_day'),
    },
    items: store.listItems().map(toItemJson),
    review_logs: store.listReviewLogs().map(toReviewLogJson),
    cold_archive: store.listColdArchive().map(coldArchiveJson),
  }
}

function coldArchiveJson(entry: {
  readonly id: string
  readonly payload: string
  readonly cold_archived_at: string
}): Record<string, unknown> {
  return {
    ...(JSON.parse(entry.payload) as Record<string, unknown>),
    cold_archived_at: entry.cold_archived_at,
  }
}

function numberMeta(value: string | null, fallback: number): number {
  if (value === null || value.length === 0) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
