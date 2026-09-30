import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { toItemJson } from '../model/json.ts'
import { itemFilter } from './filter.ts'
import { type Command } from './types.ts'

export const listCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['status', 'subject'], 'list')
  assertPositionals(args, 0, 0, 'list')

  const items = ctx.store.listItems(itemFilter(args))
  return {
    json: { items: items.map(toItemJson) },
    view: { kind: 'items', items, today: ctx.deps.clock.todayLocalDate() },
  }
}
