import { describe, expect, it } from 'vitest'
import { resolveRef } from '@study/core'
import type { Item } from '@study/core'
import { makeItem, SAMPLE_ID } from './helpers.ts'

const DOCUMENTED_ID = SAMPLE_ID

function pool(): Item[] {
  return [
    makeItem({ id: DOCUMENTED_ID, title: 'Derivadas parciais', subject: 'Cálculo' }),
    makeItem({ id: 'b0000000-0000-4000-8000-000000000001', title: 'Integrais por partes', subject: 'Cálculo' }),
    makeItem({ id: 'c0000000-0000-4000-8000-000000000002', title: 'Phrasal verbs', subject: 'Inglês' }),
  ]
}

function throws(fn: () => unknown): unknown {
  try {
    fn()
    return null
  } catch (thrown) {
    return thrown
  }
}

describe('C-38 an exact id wins', () => {
  it('beats a prefix match and a matching title', () => {
    const items = [
      makeItem({ id: 'abcd', title: 'Derivadas parciais' }),
      makeItem({ id: 'abcdef', title: 'Integrais' }),
      makeItem({ id: 'c0000000-0000-4000-8000-000000000002', title: 'ABCD' }),
    ]

    expect(resolveRef('abcd', items).title).toBe('Derivadas parciais')
  })

  it('beats a title that repeats the id', () => {
    const items = [
      makeItem({ id: DOCUMENTED_ID, title: 'Derivadas parciais' }),
      makeItem({ id: 'b0000000-0000-4000-8000-000000000001', title: DOCUMENTED_ID }),
    ]

    expect(resolveRef(DOCUMENTED_ID, items).id).toBe(DOCUMENTED_ID)
  })
})

describe('C-39 unique prefix', () => {
  it('resolves the documented eight-character prefix', () => {
    expect(resolveRef('2f1c9c1e', pool()).id).toBe(DOCUMENTED_ID)
  })

  it('resolves the shortest allowed prefix, at four characters', () => {
    expect(resolveRef('2f1c', pool()).id).toBe(DOCUMENTED_ID)
  })
})

describe('C-40 ambiguous prefix', () => {
  it('refuses and lists both candidates', () => {
    const items = [
      makeItem({ id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60', title: 'A' }),
      makeItem({ id: '2f1c8b2d-0000-4000-8000-000000000002', title: 'B' }),
    ]
    const error = throws(() => resolveRef('2f1c', items))

    expect(error).toMatchObject({ kind: 'ambiguous-ref', message: 'referência ambígua: 2f1c' })
    expect((error as { context: { candidates: Item[] } }).context.candidates).toEqual(items)
  })
})

describe('C-41 short reference that matches nothing', () => {
  it('throws invalid-ref', () => {
    expect(throws(() => resolveRef('2f1', pool()))).toMatchObject({ kind: 'invalid-ref' })
    expect(throws(() => resolveRef('ab', pool()))).toMatchObject({ kind: 'invalid-ref' })
  })
})

describe('C-42 short reference that is an exact title', () => {
  it('resolves, so short titles stay reachable', () => {
    const items = pool()
    items.push(makeItem({ id: 'd0000000-0000-4000-8000-000000000003', title: 'Vet', subject: 'Física' }))

    expect(resolveRef('Vet', items).title).toBe('Vet')
    expect(resolveRef('vet', items).title).toBe('Vet')
  })
})

describe('C-43 exact normalized title', () => {
  it('resolves across case and accents', () => {
    const items = [makeItem({ title: 'Análise Real', subject: 'Cálculo' })]

    expect(resolveRef('ANALISE real', items).id).toBe(items[0]?.id)
    expect(resolveRef('análise real', items).title).toBe('Análise Real')
    expect(resolveRef('  Análise Real  ', items).title).toBe('Análise Real')
  })
})

describe('C-44 duplicate titles', () => {
  it('refuses a title shared by two items, with candidates', () => {
    const items = [
      makeItem({ id: 'a0000000-0000-4000-8000-000000000001', title: 'Derivadas parciais' }),
      makeItem({ id: 'a0000000-0000-4000-8000-000000000002', title: 'derivadas parciais' }),
    ]
    const error = throws(() => resolveRef('Derivadas Parciais', items))

    expect(error).toMatchObject({
      kind: 'ambiguous-ref',
      message: 'referência ambígua: Derivadas Parciais',
    })
    expect((error as { context: { candidates: Item[] } }).context.candidates).toEqual(items)
  })
})

describe('C-45 no match at all', () => {
  it('throws not-found with the documented message', () => {
    const error = throws(() => resolveRef('nada disso', pool()))

    expect(error).toMatchObject({
      kind: 'not-found',
      message: 'item não encontrado: nada disso',
      context: { ref: 'nada disso' },
    })
  })

  it('reports the trimmed reference', () => {
    expect(throws(() => resolveRef('  nada disso  ', pool()))).toMatchObject({
      message: 'item não encontrado: nada disso',
    })
  })
})

describe('C-46 case-insensitive references', () => {
  it('resolves an uppercase id and an uppercase prefix', () => {
    expect(resolveRef(DOCUMENTED_ID.toUpperCase(), pool()).title).toBe('Derivadas parciais')
    expect(resolveRef('2F1C9C1E', pool()).title).toBe('Derivadas parciais')
  })
})

describe('C-47 first match wins across steps', () => {
  it('prefers a single prefix match over a title that equals the same text', () => {
    const items = [
      makeItem({ id: 'abcd1234-0000-4000-8000-000000000001', title: 'Integrais' }),
      makeItem({ id: 'e0000000-0000-4000-8000-000000000002', title: 'abcd' }),
    ]

    expect(resolveRef('abcd', items).title).toBe('Integrais')
  })

  it('prefers an exact id over an equal title without cross-step ambiguity', () => {
    const items = [
      makeItem({ id: 'ffff0000-0000-4000-8000-000000000001', title: 'Derivadas parciais' }),
      makeItem({ id: 'e0000000-0000-4000-8000-000000000002', title: 'ffff0000' }),
    ]

    expect(resolveRef('ffff0000', items).title).toBe('Derivadas parciais')
  })
})

describe('C-48 blank references and status', () => {
  it.each(['', '   '])('rejects %j as invalid-ref', (ref) => {
    expect(throws(() => resolveRef(ref, pool()))).toMatchObject({ kind: 'invalid-ref' })
  })

  it('resolves an archived item, because the pool is the caller’s choice', () => {
    const archived = makeItem({ id: 'a0000000-0000-4000-8000-000000000009', status: 'archived' })

    expect(resolveRef('a0000000', [archived]).status).toBe('archived')
  })

  it('resolves nothing from an empty pool', () => {
    expect(throws(() => resolveRef('2f1c', []))).toMatchObject({ kind: 'not-found' })
  })
})
