import { type Item, type ItemStatus } from './entity.ts'

export type CoreErrorKind =
  | 'invalid-field'
  | 'invalid-difficulty'
  | 'invalid-ref'
  | 'not-found'
  | 'ambiguous-ref'
  | 'item-not-active'

export type CoreErrorContext = Readonly<Record<string, unknown>>

export class CoreError extends Error {
  readonly kind: CoreErrorKind
  readonly context: CoreErrorContext

  constructor(kind: CoreErrorKind, message: string, context: CoreErrorContext = {}) {
    super(message)
    this.name = new.target.name
    this.kind = kind
    this.context = context
  }
}

export class InvalidFieldError extends CoreError {
  constructor(field: string, message: string) {
    super('invalid-field', message, { field })
  }
}

export class InvalidDifficultyError extends CoreError {
  constructor(value: number) {
    super('invalid-difficulty', 'dificuldade inválida: use 1 a 5', { value })
  }
}

export class InvalidRefError extends CoreError {
  constructor(ref: string) {
    super(
      'invalid-ref',
      'referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato',
      { ref },
    )
  }
}

export class NotFoundError extends CoreError {
  constructor(ref: string) {
    super('not-found', `item não encontrado: ${ref}`, { ref })
  }
}

export class AmbiguousRefError extends CoreError {
  constructor(ref: string, candidates: readonly Item[]) {
    super('ambiguous-ref', `referência ambígua: ${ref}`, { ref, candidates })
  }
}

export class ItemNotActiveError extends CoreError {
  constructor(status: ItemStatus) {
    super('item-not-active', messageForStatus(status), { status })
  }
}

function messageForStatus(status: ItemStatus): string {
  return status === 'cold'
    ? 'item no arquivo morto; use study cold restore <ref>'
    : 'item arquivado; use study unarchive <ref>'
}
