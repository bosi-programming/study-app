import { describe, expect, it } from 'vitest'
import { openStore } from '../../src/persistence/store.ts'
import { makeItem, makeLog } from './helpers.ts'
import { withDb, withNestedDb } from './helpers/db.ts'

describe('store items', () => {
  it('round-trips an item through save and get', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem({ note: 'cap. 3 do Stewart' })
        store.saveItem(item)
        expect(store.getItem(item.id)).toEqual(item)
        expect(store.getItem('nao-existe')).toBeNull()
      } finally {
        store.close()
      }
    })
  })

  it('upserts an existing item without touching its review logs', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem()
        store.saveItem(item)
        store.saveReviewLog(makeLog())
        store.saveItem({ ...item, title: 'Título novo' })
        expect(store.getItem(item.id)?.title).toBe('Título novo')
        expect(store.listReviewLogs(item.id)).toHaveLength(1)
      } finally {
        store.close()
      }
    })
  })

  it('keeps data after close and reopen', () => {
    withDb((dbPath) => {
      const first = openStore(dbPath)
      const item = makeItem()
      first.saveItem(item)
      first.close()

      const second = openStore(dbPath)
      try {
        expect(second.getItem(item.id)).toEqual(item)
      } finally {
        second.close()
      }
    })
  })

  it('creates missing parent directories', () => {
    withNestedDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        expect(store.schemaVersion()).toBe(1)
      } finally {
        store.close()
      }
    })
  })

  it('lists items filtered by status and subject key', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const active = makeItem({ id: 'a', subject: 'Cálculo', status: 'active' })
        const archived = makeItem({ id: 'b', subject: 'Inglês', status: 'archived' })
        store.saveItem(active)
        store.saveItem(archived)

        expect(store.listItems()).toEqual([active, archived])
        expect(store.listItems({ status: 'archived' })).toEqual([archived])
        expect(store.listItems({ subjectKey: 'ingles' })).toEqual([archived])
        expect(store.listItems({ status: 'active', subjectKey: 'ingles' })).toEqual([])
        expect(store.countItems('active')).toBe(1)
        expect(store.countItems('archived')).toBe(1)
        expect(store.countItems('cold')).toBe(0)
      } finally {
        store.close()
      }
    })
  })

  it('finds items by title substring without case or accents', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        store.saveItem(makeItem({ id: 'a', title: 'Derivadas Parciais' }))
        store.saveItem(makeItem({ id: 'b', title: 'Phrasal Verbs' }))

        expect(store.findItems('deriv')).toEqual([makeItem({ id: 'a', title: 'Derivadas Parciais' })])
        expect(store.findItems('DERIVADA')).toEqual([makeItem({ id: 'a', title: 'Derivadas Parciais' })])
        expect(store.findItems('verbo')).toEqual([])
      } finally {
        store.close()
      }
    })
  })

  it('filters find results by status and subject key', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        store.saveItem(makeItem({ id: 'a', title: 'Derivadas parciais', subject: 'Cálculo' }))
        store.saveItem(
          makeItem({ id: 'b', title: 'Derivadas implícitas', subject: 'Cálculo', status: 'archived' }),
        )
        store.saveItem(makeItem({ id: 'c', title: 'Derivadas', subject: 'Inglês' }))

        expect(store.findItems('derivadas', { status: 'active' }).map((item) => item.id)).toEqual([
          'a',
          'c',
        ])
        expect(store.findItems('derivadas', { subjectKey: 'calculo' }).map((item) => item.id)).toEqual(
          ['a', 'b'],
        )
        expect(
          store
            .findItems('derivadas', { status: 'archived', subjectKey: 'calculo' })
            .map((item) => item.id),
        ).toEqual(['b'])
      } finally {
        store.close()
      }
    })
  })

  it('combines the term and the filter keeping the due_date, id order', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const sameDayLateId = makeItem({
          id: 'b',
          title: 'Integrais',
          subject: 'Cálculo',
          due_date: '2026-09-10',
        })
        const sameDayEarlyId = makeItem({
          id: 'a',
          title: 'Integrais duplas',
          subject: 'Cálculo',
          due_date: '2026-09-10',
        })
        const earliest = makeItem({
          id: 'c',
          title: 'Integrais triplas',
          subject: 'Cálculo',
          due_date: '2026-09-05',
        })
        const otherSubject = makeItem({
          id: 'd',
          title: 'Integrais',
          subject: 'Inglês',
          due_date: '2026-09-01',
        })
        for (const item of [sameDayLateId, sameDayEarlyId, earliest, otherSubject]) store.saveItem(item)

        expect(
          store.findItems('integrais', { subjectKey: 'calculo' }).map((item) => item.id),
        ).toEqual(['c', 'a', 'b'])
      } finally {
        store.close()
      }
    })
  })

  it('returns only active overdue items in the due queue, ordered by due_date and id', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const overdue = makeItem({ id: 'a', due_date: '2026-09-01' })
        const today = makeItem({ id: 'b', due_date: '2026-09-12' })
        const future = makeItem({ id: 'c', due_date: '2026-09-20' })
        const archivedOverdue = makeItem({ id: 'd', due_date: '2026-09-01', status: 'archived' })
        for (const item of [overdue, today, future, archivedOverdue]) store.saveItem(item)

        expect(store.dueItems('2026-09-12')).toEqual([overdue, today])
      } finally {
        store.close()
      }
    })
  })
})

describe('store review logs', () => {
  it('round-trips a log with late as a boolean', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem()
        store.saveItem(item)
        const log = makeLog({ late: true })
        store.saveReviewLog(log)
        expect(store.listReviewLogs(item.id)).toEqual([log])
      } finally {
        store.close()
      }
    })
  })

  it('rejects an orphan log through the foreign key', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        expect(() => store.saveReviewLog(makeLog({ item_id: 'nao-existe' }))).toThrow()
      } finally {
        store.close()
      }
    })
  })

  it('deletes an item together with its review logs', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem()
        store.saveItem(item)
        store.saveReviewLog(makeLog())
        store.deleteItem(item.id)
        expect(store.getItem(item.id)).toBeNull()
        expect(store.listReviewLogs(item.id)).toEqual([])
      } finally {
        store.close()
      }
    })
  })
})

describe('store transactions', () => {
  it('commits item + log together on success', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem()
        const log = makeLog()
        const result = store.transaction(() => {
          store.saveItem(item)
          store.saveReviewLog(log)
          return 'done'
        })
        expect(result).toBe('done')
        expect(store.getItem(item.id)).toEqual(item)
        expect(store.listReviewLogs(item.id)).toEqual([log])
      } finally {
        store.close()
      }
    })
  })

  it('rolls back every write when the middle of the transaction fails', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const item = makeItem()
        expect(() =>
          store.transaction(() => {
            store.saveItem(item)
            store.saveReviewLog(makeLog({ item_id: 'nao-existe' }))
          }),
        ).toThrow()
        expect(store.getItem(item.id)).toBeNull()
        expect(store.listReviewLogs(item.id)).toEqual([])
      } finally {
        store.close()
      }
    })
  })
})

describe('store meta and cold archive', () => {
  it('round-trips meta values and returns null for a missing key', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        expect(store.getMeta('locale')).toBeNull()
        store.setMeta('locale', 'pt-BR')
        expect(store.getMeta('locale')).toBe('pt-BR')
      } finally {
        store.close()
      }
    })
  })

  it('stores, lists and purges cold archive payloads', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        store.saveColdArchive({ id: 'cold-1', payload: '{"title":"A"}', cold_archived_at: '2026-09-01T00:00:00Z' })
        store.saveColdArchive({ id: 'cold-2', payload: '{"title":"B"}', cold_archived_at: '2026-09-02T00:00:00Z' })
        expect(store.listColdArchive().map((entry) => entry.id)).toEqual(['cold-1', 'cold-2'])
        store.deleteColdArchive('cold-1')
        expect(store.listColdArchive().map((entry) => entry.id)).toEqual(['cold-2'])
      } finally {
        store.close()
      }
    })
  })
})