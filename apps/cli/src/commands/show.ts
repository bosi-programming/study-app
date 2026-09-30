import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { toItemJson, toReviewLogJson } from '../model/json.ts'
import { type Command } from './types.ts'

export const showCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['history'], 'show')
  assertPositionals(args, 1, 1, 'show')

  const item = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())
  const today = ctx.deps.clock.todayLocalDate()

  if (!hasFlag(args, 'history')) {
    return {
      json: { item: toItemJson(item) },
      view: { kind: 'item-detail', item, today, history: null },
    }
  }

  const logs = ctx.store.listReviewLogs(item.id)
  return {
    json: { item: toItemJson(item), history: logs.map(toReviewLogJson) },
    view: { kind: 'item-detail', item, today, history: logs },
  }
}
