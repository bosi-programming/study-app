import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { archiveItem } from '../coldArchive.ts'
import { CliError } from '../errors.ts'
import { archivedLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
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

  return { json: { action: 'archive', item: toItemJson(archived) }, human: archivedLine(archived) }
}
