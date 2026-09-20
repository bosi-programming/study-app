import type { Deps } from './clock.ts'
import { ItemNotActiveError } from './errors.ts'
import type { Difficulty, Item } from './item.ts'
import { toDifficulty } from './item.ts'
import { addDays, compareDates, daysBetween } from './localDate.ts'

/** RN-01 — base interval per difficulty, in days. */
export const BASE_INTERVAL_DAYS: Record<Difficulty, number> = {
  1: 10,
  2: 7,
  3: 5,
  4: 3,
  5: 2,
}

/** RN-07 — the interval never grows past this, and check-ins keep being recorded. */
export const MAX_INTERVAL_DAYS = 365

/** RNF-06 — the single pt-BR copy for the 1–5 scale, shared by CLI and web. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'muito fácil',
  2: 'fácil',
  3: 'média',
  4: 'difícil',
  5: 'muito difícil',
}

/** RN-03 — interval after `n` check-ins: `min(365, base x 2^n)`. */
export function intervalFor(difficulty: Difficulty, n: number): number {
  return Math.min(MAX_INTERVAL_DAYS, BASE_INTERVAL_DAYS[difficulty] * 2 ** n)
}

/** RN-02 — the initial due date is the creation day plus the difficulty base. */
export function initialDueDate(difficulty: Difficulty, from: string): string {
  return addDays(from, BASE_INTERVAL_DAYS[difficulty])
}

/** ADR-004 — every due date is `basis + interval`; the basis is a local date. */
export function nextDueDate(basis: string, intervalDays: number): string {
  return addDays(basis, intervalDays)
}

/** RF-10 — one row per check-in, mirroring the canonical entity. */
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

/** RN-08 — lateness is date-only; `item.status` never enters this decision. */
export function isLate(item: Item, today: string): boolean {
  return compareDates(item.due_date, today) < 0
}

/** `docs/CLI.md`'s `days_late`: whole days past the due date, 0 when not late. */
export function daysLate(item: Item, today: string): number {
  return Math.max(0, daysBetween(item.due_date, today))
}

/** RF-05 / RN-09 — the single definition of "in the queue today". */
export function isDue(item: Item, today: string): boolean {
  return item.status === 'active' && compareDates(item.due_date, today) <= 0
}

/**
 * RF-08 / RN-04 / RN-13 — records a check-in. `n` always increments, the
 * interval doubles from the current difficulty, lateness only resets
 * `on_time_streak`, and the next due date is re-based on the review day even
 * when the previous one was still in the future.
 */
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

/**
 * RF-11 / RN-06 — standalone re-evaluation, separate from `recordReview` so an
 * aborted difficulty prompt after a check-in leaves the difficulty alone
 * (ADR-011). Keeping the current difficulty changes nothing at all.
 */
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
