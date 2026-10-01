import { type Item, type QueueStreak, type ReviewLog } from '@study/core'

export type StatsCounts = {
  readonly active: number
  readonly archived: number
  readonly cold: number
}

export type SubjectCheckins = {
  readonly subject: string
  readonly count: number
}

export type Stats = {
  readonly streak: number
  readonly lastDay: string | null
  readonly counts: StatsCounts
  readonly checkinsToday: number
  readonly bySubject: readonly SubjectCheckins[]
}

export type StatsInput = {
  readonly items: readonly Item[]
  readonly logs: readonly ReviewLog[]
  readonly streak: QueueStreak
  readonly today: string
  readonly localDayOf: (instant: string) => string | null
}

export function buildStats(input: StatsInput): Stats {
  const subjects = new Map(input.items.map((item) => [item.id, item.subject]))
  const bySubject = new Map<string, number>()
  let checkinsToday = 0

  for (const log of input.logs) {
    const localDay = input.localDayOf(log.reviewed_at)
    if (localDay === input.today) checkinsToday += 1

    const subject = subjects.get(log.item_id)
    if (subject !== undefined) bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1)
  }

  return {
    streak: input.streak.streak_current,
    lastDay: input.streak.streak_last_day,
    counts: {
      active: countStatus(input.items, 'active'),
      archived: countStatus(input.items, 'archived'),
      cold: countStatus(input.items, 'cold'),
    },
    checkinsToday,
    bySubject: [...bySubject].map(([subject, count]) => ({ subject, count })),
  }
}

function countStatus(items: readonly Item[], status: Item['status']): number {
  return items.filter((item) => item.status === status).length
}
