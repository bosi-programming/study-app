import { type ParsedArgs } from '../args.ts'
import { type CommandContext } from '../context.ts'

export type CommandArgs = ParsedArgs

export type CommandResult = {
  readonly json: Record<string, unknown>
  readonly human: string
}

export type Command = (args: CommandArgs, ctx: CommandContext) => CommandResult
