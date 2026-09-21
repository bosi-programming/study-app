import { type Item } from './entity.ts'
import { previousDay } from './localDate.ts'
import { isDue } from './schedule.ts'

export type QueueStreak = {
  readonly streak_current: number
  readonly streak_last_day: string | null
}

export function hasDueItems(items: readonly Item[], today: string): boolean {
  return items.some((item) => isDue(item, today))
}

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
