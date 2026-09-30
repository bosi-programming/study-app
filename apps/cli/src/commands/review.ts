import {
  type Difficulty,
  recordReview,
  reevaluateDifficulty,
  resolveRef,
  toDifficulty,
} from '@study/core'
import { assertAllowedFlags, assertPositionals, valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { toItemJson } from '../model/json.ts'
import { promptDifficulty } from '../prompt.ts'
import { type Command } from './types.ts'

export const reviewCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['difficulty'], 'review')
  assertPositionals(args, 1, 1, 'review')

  const flagged = difficultyFromFlag(valueOf(args, 'difficulty'))
  if (flagged === undefined && !ctx.interactive) {
    throw CliError.usage('-d é obrigatório sem terminal interativo')
  }

  const item = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())
  const checkedIn = recordReview(item, ctx.deps)
  ctx.store.transaction(() => {
    ctx.store.saveItem(checkedIn.item)
    ctx.store.saveReviewLog(checkedIn.log)
  })

  ctx.emit?.checkin(checkedIn.item)

  const chosen = flagged ?? promptDifficulty(checkedIn.item.difficulty)
  const reviewed = reevaluateDifficulty(checkedIn.item, chosen, ctx.deps)
  if (reviewed !== checkedIn.item) ctx.store.saveItem(reviewed)

  return { json: { item: toItemJson(reviewed) }, view: { kind: 'item-reviewed', item: reviewed } }
}

function difficultyFromFlag(value: string | undefined): Difficulty | undefined {
  if (value === undefined) return undefined
  return toDifficulty(Number(value))
}
