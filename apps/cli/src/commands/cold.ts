import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { purgeItem, restoreItem } from '../coldArchive.ts'
import { CliError } from '../errors.ts'
import { coldTable, purgedLine, restoredLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { type Command, type CommandArgs } from './types.ts'

const NO_SUBCOMMAND = 'study cold exige um subcomando: list, restore ou purge'

export const coldCommand: Command = (args, ctx) => {
  const [subcommand, ...rest] = args.positionals
  if (subcommand === undefined) throw CliError.usage(NO_SUBCOMMAND)
  const subArgs: CommandArgs = { positionals: rest, flags: args.flags }
  if (subcommand === 'list') return coldList(subArgs, ctx)
  if (subcommand === 'restore') return coldRestore(subArgs, ctx)
  if (subcommand === 'purge') return coldPurge(subArgs, ctx)
  throw CliError.usage(`subcomando desconhecido: ${subcommand}`)
}

const coldList: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'cold list')
  assertPositionals(args, 0, 0, 'cold list')

  const items = ctx.store.listItems({ status: 'cold' })
  return { json: { action: 'list', items: items.map(toItemJson) }, human: coldTable(items) }
}

const coldRestore: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'cold restore')
  assertPositionals(args, 1, 1, 'cold restore')

  const ref = args.positionals[0] ?? ''
  const item = resolveRef(ref, ctx.store.listItems())
  if (item.status !== 'cold') throw CliError.invalidState(`item não está no arquivo morto: ${ref}`)

  const restored = restoreItem(item, ctx.deps.clock.nowUtc())
  ctx.store.transaction(() => {
    ctx.store.saveItem(restored)
    ctx.store.deleteColdArchive(restored.id)
  })

  return { json: { action: 'restore', item: toItemJson(restored) }, human: restoredLine(restored) }
}

const coldPurge: Command = (args, ctx) => {
  assertAllowedFlags(args, ['yes'], 'cold purge')
  assertPositionals(args, 1, 1, 'cold purge')
  if (!hasFlag(args, 'yes')) throw CliError.usage('cold purge exige --yes')

  const ref = args.positionals[0] ?? ''
  const item = resolveRef(ref, ctx.store.listItems())
  if (item.status !== 'cold') throw CliError.invalidState(`item não está no arquivo morto: ${ref}`)

  purgeItem(ctx.store, item)
  return { json: { action: 'purge', item: toItemJson(item) }, human: purgedLine(item) }
}
