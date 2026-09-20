import type { Deps } from './clock.ts'
import { ItemNotActiveError } from './errors.ts'
import type { Difficulty, Item } from './item.ts'
import { toDifficulty } from './item.ts'
import { addDays, compareDates, daysBetween } from './localDate.ts'

export const BASE_INTERVAL_DAYS: Record<Difficulty, number> = {
  1: 10,
  2: 7,
  3: 5,
  4: 3,
  5: 2,
}

export const MAX_INTERVAL_DAYS = 365

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'muito fácil',
  2: 'fácil',
  3: 'média',
  4: 'difícil',
  5: 'muito difícil',
}

export function intervalFor(difficulty: Difficulty, n: number): number {
  return Math.min(MAX_INTERVAL_DAYS, BASE_INTERVAL_DAYS[difficulty] * 2 ** n)
}

export function initialDueDate(difficulty: Difficulty, from: string): string {
  return addDays(from, BASE_INTERVAL_DAYS[difficulty])
}

export function nextDueDate(basis: string, intervalDays: number): string {
  return addDays(basis, intervalDays)
}

export type ReviewLog = {
  readonly id: string
  readonly item_id: string
  readonly reviewed_at: string
  readonly due_date_at_review: string
  readonly interval_after: number
  readonly review_count_after: number
  readonly late: boolean
}

export type ReviewResult = {
  readonly item: Item
  readonly log: ReviewLog
}

export function isLate(item: Item, today: string): boolean {
  return compareDates(item.due_date, today) < 0
}

export function daysLate(item: Item, today: string): number {
  return Math.max(0, daysBetween(item.due_date, today))
}

export function isDue(item: Item, today: string): boolean {
  return item.status === 'active' && compareDates(item.due_date, today) <= 0
}

export function recordReview(item: Item, deps: Deps): ReviewResult {
  if (item.status !== 'active') throw new ItemNotActiveError(item.status)

  const today = deps.clock.todayLocalDate()
  const reviewedAt = deps.clock.nowUtc()
  const late = isLate(item, today)

  const reviewCountAfter = item.review_count + 1
  const intervalAfter = intervalFor(item.difficulty, reviewCountAfter)

  return {
    item: {
      ...item,
      interval_days: intervalAfter,
      due_date: nextDueDate(today, intervalAfter),
      review_count: reviewCountAfter,
      on_time_streak: late ? 0 : item.on_time_streak + 1,
      last_reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    },
    log: {
      id: deps.ids(),
      item_id: item.id,
      reviewed_at: reviewedAt,
      due_date_at_review: item.due_date,
      interval_after: intervalAfter,
      review_count_after: reviewCountAfter,
      late,
    },
  }
}

export function reevaluateDifficulty(item: Item, difficulty: number, deps: Deps): Item {
  const next = toDifficulty(difficulty)
  if (next === item.difficulty) return item

  const interval = intervalFor(next, item.review_count)

  return {
    ...item,
    difficulty: next,
    interval_days: interval,
    due_date: nextDueDate(deps.clock.todayLocalDate(), interval),
    updated_at: deps.clock.nowUtc(),
  }
}
