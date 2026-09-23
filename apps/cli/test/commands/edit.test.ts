import { intervalFor, nextDueDate } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, itemOf, runStudy, seed, todayLocalDate, withStore } from './helpers.ts'

describe('AC6 — edit altera e recalcula (RF-03, T-13)', () => {
  it('edit-titulo: muda o título, preserva o vencimento e sobe o updated_at', () => {
    withDb((dbPath) => {
      const item = makeItem({ due_date: '2026-09-12', updated_at: '2026-08-30T09:00:00Z' })
      seed(dbPath, { items: [item] })

      const result = runStudy([
        'edit',
        item.id.slice(0, 8),
        '--title',
        'Derivadas parciais II',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(0)
      const updated = itemOf(result, 'edit')
      expect(updated.title).toBe('Derivadas parciais II')
      expect(updated.due_date).toBe('2026-09-12')
      expect(updated.updated_at).not.toBe('2026-08-30T09:00:00Z')
    })
  })

  it('edit-materia-nota-link: os três numa chamada e -n "" zera a nota', () => {
    withDb((dbPath) => {
      const item = makeItem({ note: 'antiga', link: null })
      seed(dbPath, { items: [item] })

      const result = runStudy([
        'edit',
        item.id.slice(0, 8),
        '-s',
        'Inglês',
        '-n',
        '',
        '-l',
        'https://exemplo.test',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'edit')).toMatchObject({
        subject: 'Inglês',
        note: null,
        link: 'https://exemplo.test',
      })
    })
  })

  it('edit-dificuldade: -d recalcula com o mesmo n e rebaseia em hoje', () => {
    withDb((dbPath) => {
      const item = makeItem({ difficulty: 4, review_count: 2, interval_days: 3 })
      seed(dbPath, { items: [item] })

      const result = runStudy(['edit', item.id.slice(0, 8), '-d', '5', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      const expectedInterval = intervalFor(5, 2)
      expect(itemOf(result, 'edit')).toMatchObject({
        difficulty: 5,
        interval_days: expectedInterval,
        due_date: nextDueDate(todayLocalDate(), expectedInterval),
        review_count: 2,
      })
    })
  })

  it('edit-dificuldade-igual: -d com o valor atual não move vencimento nem updated_at', () => {
    withDb((dbPath) => {
      const item = makeItem({
        difficulty: 4,
        review_count: 2,
        due_date: '2026-09-12',
        updated_at: '2026-08-30T09:00:00Z',
      })
      seed(dbPath, { items: [item] })

      const result = runStudy(['edit', item.id.slice(0, 8), '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'edit')).toMatchObject({
        due_date: '2026-09-12',
        updated_at: '2026-08-30T09:00:00Z',
      })
    })
  })

  it('edit-sem-flag: sai 1 de uso sem escrita', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['edit', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('edit-dificuldade-invalida: sai 2 antes de qualquer saveItem', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['edit', item.id.slice(0, 8), '-d', '7', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result).code).toBe('invalid-difficulty')
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('edit-edita-arquivado: altera o arquivado, sem guarda de status', () => {
    withDb((dbPath) => {
      const item = makeItem({ status: 'archived' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['edit', item.id.slice(0, 8), '-d', '5', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'edit')).toMatchObject({ difficulty: 5, status: 'archived' })
      expect(withStore(dbPath, (store) => store.getItem(item.id))?.difficulty).toBe(5)
    })
  })

  it('edit-titulo-longo: sai 2 com a mensagem do domínio e não muda o item', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy([
        'edit',
        item.id.slice(0, 8),
        '--title',
        'a'.repeat(201),
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(2)
      expect(errorOf(result).message).toBe('título deve ter no máximo 200 caracteres')
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })
})
