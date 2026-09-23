import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { itemTable } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { itemFilter } from './filter.ts'
import { type Command } from './types.ts'

export const listCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['status', 'subject'], 'list')
  assertPositionals(args, 0, 0, 'list')

  const items = ctx.store.listItems(itemFilter(args))
  return { json: { items: items.map(toItemJson) }, human: itemTable(items) }
}
