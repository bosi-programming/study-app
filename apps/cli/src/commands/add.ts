import { createItem } from '@study/core'
import { assertAllowedFlags, assertPositionals, requireValue, valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { createdLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { promptDifficulty } from '../prompt.ts'
import { type Command, type CommandArgs } from './types.ts'
import { type CommandContext } from '../context.ts'

export const addCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['subject', 'difficulty', 'note', 'link'], 'add')
  assertPositionals(args, 1, 1, 'add')

  const item = createItem(
    {
      title: args.positionals[0] ?? '',
      subject: requireValue(args, 'subject', 'add exige -s <matéria>'),
      difficulty: resolveDifficulty(args, ctx),
      note: valueOf(args, 'note') ?? null,
      link: valueOf(args, 'link') ?? null,
    },
    ctx.deps,
  )
  ctx.store.saveItem(item)

  return { json: { item: toItemJson(item) }, human: createdLine(item) }
}

function resolveDifficulty(args: CommandArgs, ctx: CommandContext): number {
  const raw = valueOf(args, 'difficulty')
  if (raw !== undefined) return Number(raw)
  if (!ctx.interactive) throw CliError.usage('-d é obrigatório sem terminal interativo')
  return promptDifficulty()
}
