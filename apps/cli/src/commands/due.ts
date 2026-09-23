import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { countBySubject, dueQueue, splitQueue } from '../output/human.ts'
import { toQueueItemJson } from '../output/json.ts'
import { itemFilter } from './filter.ts'
import { type Command } from './types.ts'

export const dueCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['subject'], 'due')
  assertPositionals(args, 0, 0, 'due')

  const today = ctx.deps.clock.todayLocalDate()
  const items = ctx.store.dueItems(today, itemFilter(args))
  const { overdue, dueToday } = splitQueue(items, today)
  const bySubject = countBySubject(items)

  return {
    json: {
      date: today,
      overdue: overdue.map((item) => toQueueItemJson(item, today)),
      today: dueToday.map((item) => toQueueItemJson(item, today)),
      by_subject: bySubject,
    },
    human: dueQueue(overdue, dueToday, today, bySubject),
  }
}
