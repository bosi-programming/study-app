import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { CliError } from '../errors.ts'
import { itemTable } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { itemFilter } from './filter.ts'
import { type Command } from './types.ts'

export const findCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['status', 'subject'], 'find')
  assertPositionals(args, 1, 1, 'find')

  const term = (args.positionals[0] ?? '').trim()
  if (term.length === 0) throw CliError.usage('find exige um termo não vazio')

  const items = ctx.store.findItems(term, itemFilter(args))
  return { json: { items: items.map(toItemJson) }, human: itemTable(items) }
}
