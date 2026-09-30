import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { toQueueItemJson } from '../model/json.ts'
import { countBySubject, splitQueue } from '../model/queue.ts'
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
    view: { kind: 'queue', overdue, dueToday, today, bySubject },
  }
}
