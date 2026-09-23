import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, itemsOf, runStudy, seed, withStore } from './helpers.ts'

describe('AC7 — remove é definitivo (RF-04, T-14)', () => {
  it('remove-sem-yes: sai 1 e o item continua', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['remove', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({ code: 'usage', message: 'remove exige --yes' })
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('remove-happy: --yes apaga e tira do list', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['remove', item.id.slice(0, 8), '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('"removed":true')
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toBeNull()
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toEqual([])
    })
  })

  it('remove-cascade-logs: o log some junto com o item', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item], logs: [makeLog()] })

      const result = runStudy(['remove', item.id.slice(0, 8), '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(withStore(dbPath, (store) => store.listReviewLogs(item.id))).toEqual([])
    })
  })

  it('remove-nao-toca-no-cold-archive: a entrada permanece', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })
      withStore(dbPath, (store) =>
        store.saveColdArchive({
          id: 'cold-1',
          payload: '{"title":"A"}',
          cold_archived_at: '2026-09-01T00:00:00Z',
        }),
      )

      const result = runStudy(['remove', item.id.slice(0, 8), '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(withStore(dbPath, (store) => store.listColdArchive().map((entry) => entry.id))).toEqual([
        'cold-1',
      ])
    })
  })

  it('remove-item-arquivado: resolve e apaga sem guarda de status', () => {
    withDb((dbPath) => {
      const item = makeItem({ status: 'archived' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['remove', item.id.slice(0, 8), '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toBeNull()
    })
  })

  it('remove-ref-nao-encontrada: sai 3', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['remove', 'abcd', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({ code: 'not-found', message: 'item não encontrado: abcd' })
    })
  })
})
