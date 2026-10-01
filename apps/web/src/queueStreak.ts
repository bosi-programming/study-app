import { advanceQueueStreak, hasDueItems, type QueueStreak } from '@study/core'
import { type Store } from './store/index.ts'

const STREAK_CURRENT = 'streak_current'
const STREAK_LAST_DAY = 'streak_last_day'

export async function readQueueStreak(store: Store): Promise<QueueStreak> {
  return {
    streak_current: numberMeta(await store.getMeta(STREAK_CURRENT)),
    streak_last_day: await store.getMeta(STREAK_LAST_DAY),
  }
}

export async function rollQueueStreak(store: Store, today: string): Promise<QueueStreak> {
  const state = await readQueueStreak(store)
  const queueIsEmpty = !hasDueItems(await store.listItems(), today)
  const next = advanceQueueStreak(state, queueIsEmpty, today)

  await store.transaction(async (scoped) => {
    await scoped.setMeta(STREAK_CURRENT, String(next.streak_current))
    await scoped.setMeta(STREAK_LAST_DAY, next.streak_last_day ?? today)
  })

  return next
}

function numberMeta(raw: string | null): number {
  if (raw === null) return 0
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}
