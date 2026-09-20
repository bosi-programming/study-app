import type { Difficulty } from './item.ts'
import { addDays } from './localDate.ts'

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
