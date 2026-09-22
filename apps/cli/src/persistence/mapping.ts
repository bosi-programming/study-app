import {
  titleKey,
  subjectKey,
  toDifficulty,
  type Difficulty,
  type Item,
  type ItemStatus,
  type ReviewLog,
} from '@study/core'

export type ItemRow = {
  readonly id: string
  readonly title: string
  readonly title_key: string
  readonly subject: string
  readonly subject_key: string
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

export type ReviewLogRow = {
  readonly id: string
  readonly item_id: string
  readonly reviewed_at: string
  readonly due_date_at_review: string
  readonly interval_after: number
  readonly review_count_after: number
  readonly late: number
}

const ITEM_STATUSES: readonly ItemStatus[] = ['active', 'archived', 'cold']

function narrowStatus(value: string): ItemStatus {
  if (!ITEM_STATUSES.includes(value as ItemStatus)) {
    throw new Error(`status inválido: ${value}`)
  }
  return value as ItemStatus
}

function narrowLate(value: number): boolean {
  if (value !== 0 && value !== 1) {
    throw new Error(`late inválido: ${value}`)
  }
  return value === 1
}

export function itemToRow(item: Item): ItemRow {
  return {
    ...item,
    title_key: titleKey(item),
    subject_key: subjectKey(item),
  }
}

export function rowToItem(row: ItemRow): Item {
  const difficulty: Difficulty = toDifficulty(row.difficulty)
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    difficulty,
    note: row.note,
    link: row.link,
    interval_days: row.interval_days,
    due_date: row.due_date,
    review_count: row.review_count,
    on_time_streak: row.on_time_streak,
    status: narrowStatus(row.status),
    last_reviewed_at: row.last_reviewed_at,
    archived_at: row.archived_at,
    cold_archived_at: row.cold_archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function reviewLogToRow(log: ReviewLog): ReviewLogRow {
  return {
    id: log.id,
    item_id: log.item_id,
    reviewed_at: log.reviewed_at,
    due_date_at_review: log.due_date_at_review,
    interval_after: log.interval_after,
    review_count_after: log.review_count_after,
    late: log.late ? 1 : 0,
  }
}

export function rowToReviewLog(row: ReviewLogRow): ReviewLog {
  return {
    id: row.id,
    item_id: row.item_id,
    reviewed_at: row.reviewed_at,
    due_date_at_review: row.due_date_at_review,
    interval_after: row.interval_after,
    review_count_after: row.review_count_after,
    late: narrowLate(row.late),
  }
}