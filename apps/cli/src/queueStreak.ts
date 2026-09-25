import { advanceQueueStreak, hasDueItems, type QueueStreak } from '@study/core'
import { type Store } from './persistence/index.ts'

const STREAK_CURRENT = 'streak_current'
const STREAK_LAST_DAY = 'streak_last_day'

export function readQueueStreak(store: Store): QueueStreak {
  return {
    streak_current: numberMeta(store.getMeta(STREAK_CURRENT)),
    streak_last_day: store.getMeta(STREAK_LAST_DAY),
  }
}

export function rollQueueStreak(store: Store, today: string): void {
  const state = readQueueStreak(store)
  const queueIsEmpty = !hasDueItems(store.listItems(), today)
  const next = advanceQueueStreak(state, queueIsEmpty, today)

  store.transaction(() => {
    store.setMeta(STREAK_CURRENT, String(next.streak_current))
    store.setMeta(STREAK_LAST_DAY, next.streak_last_day ?? today)
  })
}

function numberMeta(raw: string | null): number {
  if (raw === null) return 0
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}
