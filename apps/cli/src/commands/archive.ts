import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { CliError } from '../errors.ts'
import { archiveItem } from '../model/coldArchive.ts'
import { toItemJson } from '../model/json.ts'
import { type Command } from './types.ts'

export const archiveCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'archive')
  assertPositionals(args, 1, 1, 'archive')

  const ref = args.positionals[0] ?? ''
  const item = resolveRef(ref, ctx.store.listItems())
  if (item.status === 'archived') throw CliError.invalidState(`item já está arquivado: ${ref}`)
  if (item.status === 'cold') {
    throw CliError.invalidState(`item no arquivo morto; use study cold restore ${ref}`)
  }

  const archived = archiveItem(item, ctx.deps.clock.nowUtc())
  ctx.store.saveItem(archived)

  return {
    json: { action: 'archive', item: toItemJson(archived) },
    view: { kind: 'item-archived', item: archived },
  }
}
