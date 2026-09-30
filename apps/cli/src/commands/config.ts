import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { CliError } from '../errors.ts'
import {
  COLD_ARCHIVE_AFTER_DAYS,
  parseColdArchiveWindow,
  readColdArchiveWindow,
} from '../model/config.ts'
import { type Command, type CommandArgs } from './types.ts'

const NO_SUBCOMMAND = 'study config exige um subcomando: get ou set'

export const configCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'config')

  const [subcommand, ...rest] = args.positionals
  if (subcommand === undefined) throw CliError.usage(NO_SUBCOMMAND)
  const subArgs: CommandArgs = { positionals: rest, flags: args.flags }
  if (subcommand === 'get') return configGet(subArgs, ctx)
  if (subcommand === 'set') return configSet(subArgs, ctx)
  throw CliError.usage(`subcomando desconhecido: ${subcommand}`)
}

const configGet: Command = (args, ctx) => {
  assertPositionals(args, 1, 1, 'config get')

  const key = args.positionals[0] ?? ''
  assertKnownKey(key)
  const value = readColdArchiveWindow(ctx.store)

  return { json: { action: 'get', key, value }, view: { kind: 'config-value', key, value } }
}

const configSet: Command = (args, ctx) => {
  assertPositionals(args, 2, 2, 'config set')

  const key = args.positionals[0] ?? ''
  const raw = args.positionals[1] ?? ''
  assertKnownKey(key)
  const value = parseColdArchiveWindow(raw)
  if (value === null) throw CliError.invalidValue(`valor inválido para ${key}: ${raw}`)

  ctx.store.setMeta(key, String(value))
  return { json: { action: 'set', key, value }, view: { kind: 'config-value', key, value } }
}

function assertKnownKey(key: string): void {
  if (key !== COLD_ARCHIVE_AFTER_DAYS) throw CliError.invalidValue(`chave desconhecida: ${key}`)
}
