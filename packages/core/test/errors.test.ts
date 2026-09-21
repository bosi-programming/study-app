import { describe, expect, it } from 'vitest'
import {
  AmbiguousRefError,
  CoreError,
  InvalidDifficultyError,
  InvalidFieldError,
  InvalidRefError,
  ItemNotActiveError,
  NotFoundError,
} from '@study/core'
import { makeItem } from './helpers.ts'

describe('C-52 error subclasses', () => {
  const cases = [
    { error: new InvalidFieldError('title', 'título é obrigatório'), kind: 'invalid-field' },
    { error: new InvalidDifficultyError(7), kind: 'invalid-difficulty' },
    { error: new InvalidRefError('ab'), kind: 'invalid-ref' },
    { error: new NotFoundError('nada'), kind: 'not-found' },
    {
      error: new AmbiguousRefError('derivada', [makeItem()]),
      kind: 'ambiguous-ref',
    },
    { error: new ItemNotActiveError('archived'), kind: 'item-not-active' },
  ]

  it.each(cases)('$kind sets kind, context and name', ({ error, kind }) => {
    expect(error).toBeInstanceOf(CoreError)
    expect(error).toBeInstanceOf(Error)
    expect(error.kind).toBe(kind)
    expect(error.name).toBe(error.constructor.name)
    expect(error.context).toBeTypeOf('object')
    expect(error.context).not.toBeNull()
  })

  it('keeps the field that failed in context', () => {
    expect(new InvalidFieldError('subject', 'matéria é obrigatória').context).toEqual({
      field: 'subject',
    })
  })

  it('keeps the candidates in context for an ambiguous reference', () => {
    const candidates = [makeItem(), makeItem({ id: 'a1b2c3d4-0000-4000-8000-000000000000' })]
    expect(new AmbiguousRefError('derivadas parciais', candidates).context).toEqual({
      ref: 'derivadas parciais',
      candidates,
    })
  })
})

describe('C-53 error messages', () => {
  it('reproduces the CLI.md error table verbatim', () => {
    expect(new NotFoundError('2f1c9c1e').message).toBe('item não encontrado: 2f1c9c1e')
    expect(new AmbiguousRefError('2f1c9c1e', [makeItem()]).message).toBe(
      'referência ambígua: 2f1c9c1e',
    )
    expect(new InvalidDifficultyError(7).message).toBe('dificuldade inválida: use 1 a 5')
    expect(new ItemNotActiveError('archived').message).toBe(
      'item arquivado; use study unarchive <ref>',
    )
  })

  it('uses the approved invented wording for the remaining failures', () => {
    expect(new InvalidFieldError('title', 'título é obrigatório').message).toBe(
      'título é obrigatório',
    )
    expect(new InvalidRefError('ab').message).toBe(
      'referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato',
    )
    expect(new ItemNotActiveError('cold').message).toBe(
      'item no arquivo morto; use study cold restore <ref>',
    )
  })
})
