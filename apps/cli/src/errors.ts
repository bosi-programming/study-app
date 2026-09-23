import { AmbiguousRefError, CoreError, type CoreErrorKind, type Item } from '@study/core'

export type CliErrorCode =
  | 'usage'
  | 'invalid-status'
  | 'unsupported-schema'
  | 'backup-failed'
  | 'internal'

export type ErrorPayload = {
  readonly error: { readonly code: string; readonly message: string }
}

export class CliError extends Error {
  readonly code: CliErrorCode
  readonly exitCode: number

  constructor(code: CliErrorCode, exitCode: number, message: string) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.exitCode = exitCode
  }

  static usage(message: string): CliError {
    return new CliError('usage', 1, message)
  }

  static invalidStatus(): CliError {
    return new CliError('invalid-status', 2, 'status inválido: use active, archived ou cold')
  }

  static unsupportedSchema(version: number): CliError {
    return new CliError('unsupported-schema', 2, `schema_version ${version} não suportado`)
  }

  static backupFailed(): CliError {
    return new CliError('backup-failed', 3, 'backup falhou; banco não foi alterado')
  }

  static internal(message: string): CliError {
    return new CliError('internal', 1, message)
  }
}

const ID_PREFIX = 8

const CORE_EXIT_CODES: Record<CoreErrorKind, number> = {
  'invalid-field': 2,
  'invalid-difficulty': 2,
  'invalid-ref': 2,
  'not-found': 3,
  'ambiguous-ref': 3,
  'item-not-active': 3,
}

export function exitCodeFor(error: unknown): number {
  if (error instanceof CliError) return error.exitCode
  if (error instanceof CoreError) return CORE_EXIT_CODES[error.kind]
  return 1
}

export function errorPayload(error: unknown): ErrorPayload {
  return {
    error: {
      code: error instanceof CliError || error instanceof CoreError ? errorCode(error) : 'internal',
      message: messageOf(error),
    },
  }
}

function errorCode(error: CliError | CoreError): string {
  return error instanceof CliError ? error.code : error.kind
}

function messageOf(error: unknown): string {
  if (error instanceof AmbiguousRefError) return ambiguousRefMessage(error)
  if (error instanceof Error) return error.message
  return String(error)
}

function ambiguousRefMessage(error: AmbiguousRefError): string {
  const rawRef = error.context.ref
  const ref = typeof rawRef === 'string' ? rawRef : ''
  const candidates = Array.isArray(error.context.candidates)
    ? (error.context.candidates as readonly Item[])
    : []
  const lines = candidates.map(
    (candidate) =>
      `${candidate.id.slice(0, ID_PREFIX)} [${candidate.subject}] vence ${candidate.due_date}`,
  )
  return [`referência ambígua: ${ref}`, ...lines].join('\n')
}
