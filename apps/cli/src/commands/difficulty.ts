import { reevaluateDifficulty, resolveRef, toDifficulty } from '@study/core'
import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { toItemJson } from '../model/json.ts'
import { type Command } from './types.ts'

export const difficultyCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'difficulty')
  assertPositionals(args, 2, 2, 'difficulty')

  const value = toDifficulty(Number(args.positionals[1] ?? ''))
  const item = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())
  const reviewed = reevaluateDifficulty(item, value, ctx.deps)
  if (reviewed !== item) ctx.store.saveItem(reviewed)

  return { json: { item: toItemJson(reviewed) }, view: { kind: 'item-reviewed', item: reviewed } }
}
