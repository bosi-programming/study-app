import { describe, expect, it } from 'vitest'
import { hrefFor, parseHash } from '../src/routing.ts'

describe('AC-1 roteamento por hash', () => {
  it('routing-le-as-seis-rotas-com-e-sem-parametro', () => {
    expect(parseHash('')).toEqual({ name: 'queue' })
    expect(parseHash('#/')).toEqual({ name: 'queue' })
    expect(parseHash('#/add')).toEqual({ name: 'add' })
    expect(parseHash('#/items')).toEqual({ name: 'items' })
    expect(parseHash('#/items/abc')).toEqual({ name: 'item', id: 'abc' })
    expect(parseHash('#/review/abc')).toEqual({ name: 'review', id: 'abc' })
    expect(parseHash('#/stats')).toEqual({ name: 'stats' })
  })

  it('routing-formata-o-hash-de-cada-tela', () => {
    expect(hrefFor({ name: 'queue' })).toBe('#/')
    expect(hrefFor({ name: 'add' })).toBe('#/add')
    expect(hrefFor({ name: 'items' })).toBe('#/items')
    expect(hrefFor({ name: 'stats' })).toBe('#/stats')
    expect(hrefFor({ name: 'item', id: 'abc' })).toBe('#/items/abc')
    expect(hrefFor({ name: 'review', id: 'abc' })).toBe('#/review/abc')
  })

  it('routing-cai-na-fila-em-hash-desconhecido', () => {
    expect(parseHash('#/desconhecido')).toEqual({ name: 'queue' })
    expect(parseHash('#/review')).toEqual({ name: 'queue' })
  })
})
