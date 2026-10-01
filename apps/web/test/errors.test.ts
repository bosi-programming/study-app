import {
  AmbiguousRefError,
  CoreError,
  InvalidDifficultyError,
  InvalidFieldError,
  InvalidRefError,
  ItemNotActiveError,
  NotFoundError,
} from '@study/core'
import { describe, expect, it } from 'vitest'
import { fieldErrorOf, isCoreError, messageForError } from '../src/errors.ts'
import { strings } from '../src/strings.ts'

describe('AC-9 tradução dos erros do core', () => {
  it('errors-traduz-cada-kind-do-core', () => {
    expect(messageForError(new InvalidFieldError('title', 'título é obrigatório'))).toBe(
      'título é obrigatório',
    )
    expect(messageForError(new InvalidDifficultyError(6))).toBe('dificuldade inválida: use 1 a 5')
    expect(messageForError(new InvalidRefError('x'))).toBe(strings.errors.invalidRef)
    expect(messageForError(new NotFoundError('x'))).toBe(strings.errors.notFound)
    expect(messageForError(new AmbiguousRefError('x', []))).toBe(strings.errors.ambiguousRef)
    expect(messageForError(new ItemNotActiveError('archived'))).toBe(strings.errors.itemArchived)
    expect(messageForError(new ItemNotActiveError('cold'))).toBe(strings.errors.itemCold)
  })

  it('errors-falha-que-nao-e-do-core-vira-a-mensagem-do-web-md', () => {
    expect(messageForError(new Error('IndexedDB explodiu'))).toBe(strings.errors.store)
    expect(messageForError('qualquer coisa')).toBe(strings.errors.store)
    expect(isCoreError(new Error('x'))).toBe(false)
    expect(isCoreError(new InvalidRefError('x'))).toBe(true)
  })

  it('errors-so-aponta-campo-quando-o-kind-e-de-campo', () => {
    expect(fieldErrorOf(new InvalidFieldError('subject', 'matéria longa'))).toEqual({
      field: 'subject',
      message: 'matéria longa',
    })
    expect(fieldErrorOf(new InvalidDifficultyError(0))).toEqual({
      field: 'difficulty',
      message: 'dificuldade inválida: use 1 a 5',
    })
    expect(fieldErrorOf(new NotFoundError('x'))).toBeNull()
    expect(fieldErrorOf(new Error('x'))).toBeNull()
    expect(fieldErrorOf(new CoreError('invalid-field', 'campo sem nome', { field: 42 }))).toBeNull()
  })
})
