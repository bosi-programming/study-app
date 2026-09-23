import { CliError } from './errors.ts'

export type FlagSpec = {
  readonly name: string
  readonly short: string | null
  readonly takesValue: boolean
}

export type ParsedArgs = {
  readonly positionals: readonly string[]
  readonly flags: ReadonlyMap<string, string | true>
}

export const GLOBAL_FLAGS: readonly FlagSpec[] = [
  { name: 'json', short: null, takesValue: false },
  { name: 'no-input', short: null, takesValue: false },
  { name: 'db', short: null, takesValue: true },
  { name: 'export-dir', short: null, takesValue: true },
  { name: 'help', short: 'h', takesValue: false },
]

const COMMAND_FLAGS: readonly FlagSpec[] = [
  { name: 'subject', short: 's', takesValue: true },
  { name: 'difficulty', short: 'd', takesValue: true },
  { name: 'note', short: 'n', takesValue: true },
  { name: 'link', short: 'l', takesValue: true },
  { name: 'title', short: null, takesValue: true },
  { name: 'status', short: null, takesValue: true },
  { name: 'history', short: null, takesValue: false },
  { name: 'reset', short: null, takesValue: false },
  { name: 'yes', short: null, takesValue: false },
]

export const ALL_FLAGS: readonly FlagSpec[] = [...GLOBAL_FLAGS, ...COMMAND_FLAGS]

export function parseArgs(argv: readonly string[], spec: readonly FlagSpec[]): ParsedArgs {
  const positionals: string[] = []
  const flags = new Map<string, string | true>()
  let flagsEnded = false

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? ''

    if (flagsEnded || token === '-' || !token.startsWith('-')) {
      positionals.push(token)
      continue
    }
    if (token === '--') {
      flagsEnded = true
      continue
    }

    const { flag, inlineValue } = splitToken(token)
    const matched = spec.find((entry) => entry.name === flag || entry.short === flag)
    if (matched === undefined) throw CliError.usage(`flag desconhecida: ${token}`)

    if (!matched.takesValue) {
      if (inlineValue !== null) throw CliError.usage(`flag ${token} não aceita valor`)
      flags.set(matched.name, true)
      continue
    }

    if (flags.has(matched.name)) throw CliError.usage(`flag ${token} repetida`)

    if (inlineValue !== null) {
      flags.set(matched.name, inlineValue)
      continue
    }

    const value = argv[index + 1]
    if (value === undefined) throw CliError.usage(`flag ${token} exige um valor`)
    flags.set(matched.name, value)
    index += 1
  }

  return { positionals, flags }
}

function splitToken(token: string): { flag: string; inlineValue: string | null } {
  const body = token.startsWith('--') ? token.slice(2) : token.slice(1)
  const equals = body.indexOf('=')
  if (equals === -1) return { flag: body, inlineValue: null }
  return { flag: body.slice(0, equals), inlineValue: body.slice(equals + 1) }
}

export function valueOf(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name)
  return typeof value === 'string' ? value : undefined
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name)
}

export function requireValue(args: ParsedArgs, name: string, message: string): string {
  const value = valueOf(args, name)
  if (value === undefined) throw CliError.usage(message)
  return value
}

export function assertAllowedFlags(
  args: ParsedArgs,
  allowed: readonly string[],
  command: string,
): void {
  for (const name of args.flags.keys()) {
    if (allowed.includes(name)) continue
    if (GLOBAL_FLAGS.some((entry) => entry.name === name)) continue
    throw CliError.usage(`flag --${name} não existe em study ${command}`)
  }
}

export function assertPositionals(
  args: ParsedArgs,
  min: number,
  max: number,
  command: string,
): void {
  if (args.positionals.length < min) {
    throw CliError.usage(`study ${command} exige ${min} argumento(s)`)
  }
  if (args.positionals.length > max) {
    throw CliError.usage(`study ${command} aceita no máximo ${max} argumento(s)`)
  }
}
