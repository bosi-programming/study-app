import { CoreError } from '@study/core'
import { strings } from './strings.ts'

export type FieldError = {
  readonly field: string
  readonly message: string
}

export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError
}

export function messageForError(error: unknown): string {
  if (!isCoreError(error)) return strings.errors.store

  switch (error.kind) {
    case 'invalid-field':
    case 'invalid-difficulty':
      return error.message
    case 'invalid-ref':
      return strings.errors.invalidRef
    case 'not-found':
      return strings.errors.notFound
    case 'ambiguous-ref':
      return strings.errors.ambiguousRef
    case 'item-not-active':
      return error.context['status'] === 'cold' ? strings.errors.itemCold : strings.errors.itemArchived
  }
}

export function fieldErrorOf(error: unknown): FieldError | null {
  if (!isCoreError(error)) return null
  if (error.kind === 'invalid-difficulty') {
    return { field: 'difficulty', message: error.message }
  }
  if (error.kind !== 'invalid-field') return null

  const field = error.context['field']
  return typeof field === 'string' ? { field, message: error.message } : null
}
