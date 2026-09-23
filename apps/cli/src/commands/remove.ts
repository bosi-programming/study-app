import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { CliError } from '../errors.ts'
import { removedLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { type Command } from './types.ts'

export const removeCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['yes'], 'remove')
  assertPositionals(args, 1, 1, 'remove')

  if (!hasFlag(args, 'yes')) throw CliError.usage('remove exige --yes')

  const item = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())
  ctx.store.transaction(() => ctx.store.deleteItem(item.id))

  return { json: { removed: true, item: toItemJson(item) }, human: removedLine(item) }
}
