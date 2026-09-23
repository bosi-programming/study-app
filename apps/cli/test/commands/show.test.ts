import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { dataOf, errorOf, historyOf, itemOf, runStudy, seed } from './helpers.ts'

const PAST_DUE = '2026-01-05'

describe('AC5 — show mostra vencimento e histórico (RF-06, RF-10, T-16)', () => {
  it('show-vencimento-gravado: exibe o due_date do banco, sem recalcular', () => {
    withDb((dbPath) => {
      const item = makeItem({ due_date: PAST_DUE, interval_days: 3, difficulty: 4 })
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'show')).toMatchObject({ due_date: PAST_DUE, interval_days: 3 })
    })
  })

  it('show-history: --history lista data, atraso e n', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item], logs: [makeLog()] })

      const result = runStudy(['show', item.id.slice(0, 8), '--history', '--db', dbPath, '--json'])
      const human = runStudy(['show', item.id.slice(0, 8), '--history', '--db', dbPath])

      expect(result.status).toBe(0)
      expect(historyOf(result)).toEqual([
        {
          id: makeLog().id,
          item_id: item.id,
          reviewed_at: '2026-09-06T22:10:00Z',
          due_date_at_review: '2026-09-06',
          interval_after: 6,
          review_count_after: 2,
          late: false,
        },
      ])
      expect(human.stdout).toContain('Histórico (1)')
      expect(human.stdout).toContain('2026-09-06')
      expect(human.stdout).toContain('n=2')
      expect(human.stdout).toContain('no prazo')
    })
  })

  it('show-sem-history: sem a flag não existe a seção nem a chave', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item], logs: [makeLog()] })

      const result = runStudy(['show', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(dataOf(result, 'show')).not.toHaveProperty('history')
      expect(runStudy(['show', item.id.slice(0, 8), '--db', dbPath]).stdout).not.toContain('Histórico')
    })
  })

  it('show-history-vazio: lista vazia, exit 0', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id.slice(0, 8), '--history', '--db', dbPath, '--json'])
      const human = runStudy(['show', item.id.slice(0, 8), '--history', '--db', dbPath])

      expect(result.status).toBe(0)
      expect(historyOf(result)).toEqual([])
      expect(human.stdout).toContain('Histórico (0)')
    })
  })

  it('show-anota-atraso: vencimento no passado anota o atraso sem mudar o due_date', () => {
    withDb((dbPath) => {
      const item = makeItem({ due_date: PAST_DUE })
      seed(dbPath, { items: [item] })

      const human = runStudy(['show', item.id.slice(0, 8), '--db', dbPath])
      const json = runStudy(['show', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(human.stdout).toContain('atrasado')
      expect(itemOf(json, 'show')['due_date']).toBe(PAST_DUE)
    })
  })

  it('show-le-arquivado: lê o arquivado, sem guarda de status', () => {
    withDb((dbPath) => {
      const item = makeItem({ title: 'Item guardado', status: 'archived' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id.slice(0, 8), '--db', dbPath, '--json'])
      const human = runStudy(['show', item.id.slice(0, 8), '--db', dbPath])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'show')).toMatchObject({ status: 'archived', title: 'Item guardado' })
      expect(human.stdout).toContain('Item guardado')
    })
  })

  it('show-le-arquivo-morto: lê o item do cold, sem guarda de status', () => {
    withDb((dbPath) => {
      const item = makeItem({ status: 'cold' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'show')).toMatchObject({ status: 'cold' })
    })
  })

  it('show-ref-nao-encontrada: 4+ caracteres sem correspondência sai 3', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['show', 'abcd', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({ code: 'not-found', message: 'item não encontrado: abcd' })
    })
  })
})
