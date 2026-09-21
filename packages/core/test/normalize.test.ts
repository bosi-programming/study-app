import { describe, expect, it } from 'vitest'
import { normalizeText, subjectKey, titleKey } from '@study/core'

describe('C-04 normalizeText', () => {
  it.each([
    ['Derivadas Parciais', 'derivadas parciais'],
    ['Análise', 'analise'],
    ['CÁLCULO', 'calculo'],
    ['  Função  ', 'funcao'],
    ['ÁÀÂÃÄÅ', 'aaaaaa'],
  ])('%s normalizes to %s', (input, expected) => {
    expect(normalizeText(input)).toBe(expected)
  })
})

describe('C-05 accent-insensitive keys', () => {
  it('gives Função and Funcao the same key', () => {
    expect(titleKey({ title: 'Função' })).toBe(titleKey({ title: 'Funcao' }))
    expect(subjectKey({ subject: 'Função' })).toBe(subjectKey({ subject: 'funcao' }))
  })

  it('contains deriv for Derivadas parciais', () => {
    expect(titleKey({ title: 'Derivadas parciais' })).toContain('deriv')
  })
})

describe('C-06 over-normalization guard', () => {
  it('keeps symbols instead of stripping them', () => {
    expect(normalizeText('C++')).toBe('c++')
    expect(normalizeText('a-b')).toBe('a-b')
  })

  it('does not collapse inner whitespace into nothing', () => {
    expect(normalizeText('a-b')).not.toBe(normalizeText('a b'))
  })
})

describe('C-07 empty input', () => {
  it('normalizes to an empty string without throwing', () => {
    expect(normalizeText('')).toBe('')
    expect(normalizeText('   ')).toBe('')
  })
})
