import { CoreError, type CoreErrorKind } from '@study/core'

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
      message: error instanceof Error ? error.message : String(error),
    },
  }
}

function errorCode(error: CliError | CoreError): string {
  return error instanceof CliError ? error.code : error.kind
}
