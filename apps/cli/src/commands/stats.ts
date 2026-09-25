import { type ReviewLog } from '@study/core'
import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { localDateOf } from '../deps.ts'
import { type StatsCounts, statsLines } from '../output/human.ts'
import { type ItemFilter, type Store } from '../persistence/index.ts'
import { readQueueStreak } from '../queueStreak.ts'
import { subjectFilter } from './filter.ts'
import { type Command } from './types.ts'

export const statsCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['subject'], 'stats')
  assertPositionals(args, 0, 0, 'stats')

  const today = ctx.deps.clock.todayLocalDate()
  const filter = subjectFilter(args)
  const streak = readQueueStreak(ctx.store)
  const checkins = checkinTotals(ctx.store, filter, today)
  const items: StatsCounts = {
    active: ctx.store.countItems('active', filter),
    archived: ctx.store.countItems('archived', filter),
    cold: ctx.store.countItems('cold', filter),
  }

  return {
    json: {
      date: today,
      streak: { current: streak.streak_current, last_day: streak.streak_last_day },
      items,
      checkins_today: checkins.today,
      checkins_by_subject: checkins.bySubject,
    },
    human: statsLines(streak.streak_current, items, checkins.today, checkins.bySubject),
  }
}

type CheckinTotals = {
  readonly today: number
  readonly bySubject: Record<string, number>
}

function checkinTotals(store: Store, filter: ItemFilter, today: string): CheckinTotals {
  const logsByItem = logsByItemId(store.listReviewLogs())
  const bySubject: Record<string, number> = {}
  let countToday = 0

  for (const item of store.listItems(filter)) {
    const logs = logsByItem.get(item.id)
    if (logs === undefined) continue

    bySubject[item.subject] = (bySubject[item.subject] ?? 0) + logs.length
    countToday += logs.filter((log) => localDateOf(log.reviewed_at) === today).length
  }

  return { today: countToday, bySubject }
}

function logsByItemId(logs: readonly ReviewLog[]): Map<string, readonly ReviewLog[]> {
  const byItem = new Map<string, ReviewLog[]>()
  for (const log of logs) {
    const itemLogs = byItem.get(log.item_id)
    if (itemLogs === undefined) byItem.set(log.item_id, [log])
    else itemLogs.push(log)
  }
  return byItem
}
