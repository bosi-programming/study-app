import { resolveRef } from '@study/core'
import { assertAllowedFlags, assertPositionals, hasFlag, valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { type ItemPatch, updatedItem } from '../model/editItem.ts'
import { toItemJson } from '../model/json.ts'
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

  const result = updatedItem(current, patchOf(args), ctx.deps)
  ctx.store.saveItem(result)

  return { json: { item: toItemJson(result) }, view: { kind: 'item-updated', item: result } }
}

function patchOf(args: CommandArgs): ItemPatch {
  const difficulty = valueOf(args, 'difficulty')
  return {
    title: valueOf(args, 'title'),
    subject: valueOf(args, 'subject'),
    note: valueOf(args, 'note'),
    link: valueOf(args, 'link'),
    ...(difficulty === undefined ? {} : { difficulty: Number(difficulty) }),
  }
}
