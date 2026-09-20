import type { Item } from './item.ts'
import { previousDay } from './localDate.ts'
import { isDue } from './schedule.ts'

/** The `Meta` pair from `docs/MODELO-DE-DADOS.md` that the streak lives in. */
export type QueueStreak = {
  readonly streak_current: number
  readonly streak_last_day: string | null
}

/** RF-05 — the queue, defined once in core so the streak and the CLI agree. */
export function hasDueItems(items: readonly Item[], today: string): boolean {
  return items.some((item) => isDue(item, today))
}

/**
 * RN-14 / CA-16 — advances the empty-queue streak for one local day, over the
 * four documented branches. The caller says whether the queue was empty, so
 * "queue" keeps a single definition in core.
 */
export function advanceQueueStreak(
  state: QueueStreak,
  queueIsEmpty: boolean,
  today: string,
): QueueStreak {
  if (!queueIsEmpty) {
    return { streak_current: 0, streak_last_day: today }
  }

  if (state.streak_last_day === today) {
    return { streak_current: state.streak_current, streak_last_day: today }
  }

  if (state.streak_last_day === previousDay(today)) {
    return { streak_current: state.streak_current + 1, streak_last_day: today }
  }

  return { streak_current: 1, streak_last_day: today }
}
