import {
  type Item,
  reevaluateDifficulty,
  resolveRef,
  toDifficulty,
  validateLink,
  validateNote,
  validateSubject,
  validateTitle,
} from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag, valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { updatedLine } from '../output/human.ts'
import { toItemJson } from '../output/json.ts'
import { type Command, type CommandArgs } from './types.ts'
import { type CommandContext } from '../context.ts'

const EDITABLE_FLAGS = ['title', 'subject', 'note', 'link', 'difficulty']

export const editCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, EDITABLE_FLAGS, 'edit')
  assertPositionals(args, 1, 1, 'edit')

  if (!EDITABLE_FLAGS.some((name) => hasFlag(args, name))) {
    throw CliError.usage('edit exige ao menos uma flag: --title, -s, -n, -l ou -d')
  }

  const current = resolveRef(args.positionals[0] ?? '', ctx.store.listItems())

  const result = updatedItem(args, current, ctx)
  ctx.store.saveItem(result)

  return { json: { item: toItemJson(result) }, human: updatedLine(result) }
}

function updatedItem(args: CommandArgs, current: Item, ctx: CommandContext): Item {
  const titleValue = valueOf(args, 'title')
  const subjectValue = valueOf(args, 'subject')
  const noteValue = valueOf(args, 'note')
  const linkValue = valueOf(args, 'link')
  const difficultyValue = valueOf(args, 'difficulty')

  const next: Item = {
    ...current,
    title: titleValue === undefined ? current.title : validateTitle(titleValue),
    subject: subjectValue === undefined ? current.subject : validateSubject(subjectValue),
    note: noteValue === undefined ? current.note : validateNote(noteValue),
    link: linkValue === undefined ? current.link : validateLink(linkValue),
  }

  const difficulty =
    difficultyValue === undefined ? current.difficulty : toDifficulty(Number(difficultyValue))

  if (difficulty !== current.difficulty) return reevaluateDifficulty(next, difficulty, ctx.deps)

  const fieldsChanged =
    next.title !== current.title ||
    next.subject !== current.subject ||
    next.note !== current.note ||
    next.link !== current.link

  return fieldsChanged ? { ...next, updated_at: ctx.deps.clock.nowUtc() } : next
}
