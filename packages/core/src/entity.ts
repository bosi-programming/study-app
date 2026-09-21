export type Difficulty = 1 | 2 | 3 | 4 | 5

export type ItemStatus = 'active' | 'archived' | 'cold'

export type Item = {
  readonly id: string
  readonly title: string
  readonly subject: string
  readonly difficulty: Difficulty
  readonly note: string | null
  readonly link: string | null
  readonly interval_days: number
  readonly due_date: string
  readonly review_count: number
  readonly on_time_streak: number
  readonly status: ItemStatus
  readonly last_reviewed_at: string | null
  readonly archived_at: string | null
  readonly cold_archived_at: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type ItemInput = {
  readonly title: string
  readonly subject: string
  readonly difficulty: number
  readonly note?: string | null
  readonly link?: string | null
}
