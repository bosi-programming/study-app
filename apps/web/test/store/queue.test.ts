import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Item, type ItemStatus } from '@study/core'
import { makeItem, openTestStore, seed, type TestStore } from './helpers.ts'

let context: TestStore

beforeEach(async () => {
  context = await openTestStore()
})

afterEach(() => {
  context.store.close()
})

const TODAY = '2026-09-30'

function smallQueue(): Item[] {
  return [
    makeItem('a', { due_date: '2026-09-10', status: 'active', subject: 'Cálculo' }),
    makeItem('b', { due_date: TODAY, status: 'active', subject: 'Álgebra Linear' }),
    makeItem('c', { due_date: '2026-10-05', status: 'active', subject: 'Cálculo' }),
    makeItem('d', { due_date: '2026-09-01', status: 'archived', subject: 'Cálculo' }),
    makeItem('e', { due_date: '2026-09-25', status: 'active', subject: 'Cálculo' }),
  ]
}

describe('W-11.8 fila-filtra-e-ordena', () => {
  beforeEach(async () => {
    await seed(context.store, smallQueue())
  })

  it('dueItems devolve só ativos vencidos, ordenados por vencimento e id', async () => {
    const queue = await context.store.dueItems(TODAY)
    expect(queue.map((item) => item.id)).toEqual(['a', 'e', 'b'])
  })

  it('listItems filtra por status e por matéria', async () => {
    expect((await context.store.listItems({ status: 'archived' })).map((item) => item.id)).toEqual(['d'])
    expect((await context.store.listItems({ subjectKey: 'calculo' })).map((item) => item.id)).toEqual([
      'd',
      'a',
      'e',
      'c',
    ])
  })

  it('countItems conta os ativos', async () => {
    expect(await context.store.countItems('active')).toBe(4)
  })

  it('dueItems aceita filtro por matéria', async () => {
    expect((await context.store.dueItems(TODAY, { subjectKey: 'calculo' })).map((item) => item.id)).toEqual([
      'a',
      'e',
    ])
  })

  it('countItems aceita filtro por matéria', async () => {
    expect(await context.store.countItems('active', { subjectKey: 'calculo' })).toBe(3)
  })
})

function bigQueue(): Item[] {
  const items: Item[] = []
  const push = (index: number, dueDate: string, status: ItemStatus): void => {
    items.push(makeItem(`item-${String(index).padStart(4, '0')}`, { due_date: dueDate, status }))
  }
  for (let index = 0; index < 2500; index += 1) push(index, '2026-09-01', 'active')
  for (let index = 2500; index < 3500; index += 1) push(index, TODAY, 'active')
  for (let index = 3500; index < 4500; index += 1) push(index, '2026-10-15', 'active')
  for (let index = 4500; index < 5000; index += 1) push(index, '2026-09-01', 'archived')
  return items
}

describe('W-11.9 fila-5000-correcao', () => {
  it('devolve exatamente o conjunto vencido, na ordem', async () => {
    await seed(context.store, bigQueue())

    const queue = await context.store.dueItems(TODAY)
    const expected = Array.from({ length: 3500 }, (_, index) => `item-${String(index).padStart(4, '0')}`)

    expect(queue.map((item) => item.id)).toEqual(expected)
  })
})

describe('findItems', () => {
  beforeEach(async () => {
    await seed(context.store, [
      makeItem('calc-1', { title: 'Derivadas Parciais', subject: 'Cálculo', due_date: '2026-09-10' }),
      makeItem('calc-2', { title: 'Cálculo Vetorial', subject: 'Cálculo', due_date: '2026-09-15' }),
      makeItem('alg-1', { title: 'Autovalores', subject: 'Álgebra Linear', due_date: '2026-09-20' }),
      makeItem('arch-1', {
        title: 'Derivadas Direcionais',
        subject: 'Cálculo',
        status: 'archived',
        due_date: '2026-09-01',
      }),
    ])
  })

  it('busca substring sem caixa, ordenado por vencimento e id', async () => {
    expect((await context.store.findItems('DERIVADAS')).map((item) => item.id)).toEqual(['arch-1', 'calc-1'])
  })

  it('normaliza acento no termo', async () => {
    expect((await context.store.findItems('calculo')).map((item) => item.id)).toEqual(['calc-2'])
  })

  it('aplica o filtro de matéria junto do termo', async () => {
    expect((await context.store.findItems('a', { subjectKey: 'algebra linear' })).map((item) => item.id)).toEqual([
      'alg-1',
    ])
  })
})
