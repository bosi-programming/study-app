import { type ParsedArgs } from '../args.ts'
import { type CommandContext } from '../context.ts'
import { type CommandResult } from '../model/results.ts'

export type CommandArgs = ParsedArgs

export type { CommandResult }

export type Command = (args: CommandArgs, ctx: CommandContext) => CommandResult
