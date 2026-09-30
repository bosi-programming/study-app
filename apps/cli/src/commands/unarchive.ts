import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { CliError } from '../errors.ts'
import { unarchiveItem } from '../model/coldArchive.ts'
import { toItemJson } from '../model/json.ts'
import { type Command } from './types.ts'

export const unarchiveCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'unarchive')
  assertPositionals(args, 1, 1, 'unarchive')

  const ref = args.positionals[0] ?? ''
  const item = resolveRef(ref, ctx.store.listItems())
  if (item.status === 'active') throw CliError.invalidState(`item já está ativo: ${ref}`)
  if (item.status === 'cold') {
    throw CliError.invalidState(`item no arquivo morto; use study cold restore ${ref}`)
  }

  const unarchived = unarchiveItem(item, ctx.deps.clock.nowUtc())
  ctx.store.saveItem(unarchived)

  return {
    json: { action: 'unarchive', item: toItemJson(unarchived) },
    view: { kind: 'item-unarchived', item: unarchived },
  }
}
