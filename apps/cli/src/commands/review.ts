import {
  type Difficulty,
  recordReview,
  reevaluateDifficulty,
  resolveRef,
  toDifficulty,
} from '@study/core'
import { assertAllowedFlags, assertPositionals, valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { checkinLine, nextDueLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { promptDifficulty, withPromptAbort } from '../prompt.ts'
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

  if (!ctx.json) process.stdout.write(`${checkinLine(checkedIn.item)}\n`)

  const chosen = flagged ?? withPromptAbort(() => promptDifficulty(checkedIn.item.difficulty))
  const reviewed = reevaluateDifficulty(checkedIn.item, chosen, ctx.deps)
  if (reviewed !== checkedIn.item) ctx.store.saveItem(reviewed)

  return { json: { item: toItemJson(reviewed) }, human: nextDueLine(reviewed) }
}

function difficultyFromFlag(value: string | undefined): Difficulty | undefined {
  if (value === undefined) return undefined
  return toDifficulty(Number(value))
}
