import { ItemNotActiveError, resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { historySection, itemBlock } from '../output/human.ts'
import { toItemJson, toReviewLogJson } from '../output/json.ts'
import { type Command } from './types.ts'

export const showCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['history'], 'show')
  assertPositionals(args, 1, 1, 'show')

  const item = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())
  if (item.status !== 'active') throw new ItemNotActiveError(item.status)

  const block = itemBlock(item, ctx.deps.clock.todayLocalDate())
  if (!hasFlag(args, 'history')) {
    return { json: { item: toItemJson(item) }, human: block }
  }

  const logs = ctx.store.listReviewLogs(item.id)
  return {
    json: { item: toItemJson(item), history: logs.map(toReviewLogJson) },
    human: `${block}\n\n${historySection(logs)}`,
  }
}
