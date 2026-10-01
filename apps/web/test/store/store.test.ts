import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Item } from '@study/core'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { makeItem, makeLog, openTestStore, type TestStore } from './helpers.ts'
import { IndexedDbUnavailableError, browserIdb } from '../../src/store/idb.ts'

type MutableGlobal = { indexedDB?: unknown; IDBKeyRange?: unknown }

function withoutIndexedDb(run: () => void): void {
  const scope = globalThis as MutableGlobal
  const hadFactory = 'indexedDB' in scope
  const factory = scope.indexedDB
  const hadKeyRange = 'IDBKeyRange' in scope
  const keyRange = scope.IDBKeyRange
  delete scope.indexedDB
  delete scope.IDBKeyRange
  try {
    run()
  } finally {
    if (hadFactory) scope.indexedDB = factory
    if (hadKeyRange) scope.IDBKeyRange = keyRange
  }
}

function withoutKeyRange(run: () => void): void {
  const scope = globalThis as MutableGlobal
  const hadFactory = 'indexedDB' in scope
  const factory = scope.indexedDB
  const hadKeyRange = 'IDBKeyRange' in scope
  const keyRange = scope.IDBKeyRange
  scope.indexedDB = new IDBFactory()
  delete scope.IDBKeyRange
  try {
    run()
  } finally {
    if (hadFactory) scope.indexedDB = factory
    else delete scope.indexedDB
    if (hadKeyRange) scope.IDBKeyRange = keyRange
  }
}

const ITEM: Item = makeItem('2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60', {
  title: 'Derivadas Parciais',
  subject: 'Cálculo',
  difficulty: 3,
  note: 'cap. 3 do Stewart',
  link: 'https://example.com/calculo',
  interval_days: 6,
  due_date: '2026-09-12',
  review_count: 2,
  on_time_streak: 2,
  last_reviewed_at: '2026-09-06T22:10:00Z',
  created_at: '2026-08-30T09:00:00Z',
  updated_at: '2026-09-06T22:10:00Z',
})
const LOG = makeLog('9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d', ITEM.id, {
  reviewed_at: '2026-09-06T22:10:00Z',
  due_date_at_review: '2026-09-06',
  interval_after: 6,
  review_count_after: 2,
  late: true,
})

let context: TestStore

beforeEach(async () => {
  context = await openTestStore()
})

afterEach(() => {
  context.store.close()
})

describe('W-11.15 store-sem-indexeddb', () => {
  it('lança IndexedDbUnavailableError com mensagem clara sem globalThis.indexedDB', () => {
    withoutIndexedDb(() => {
      expect(() => browserIdb()).toThrow(IndexedDbUnavailableError)
      expect(() => browserIdb()).toThrow('IndexedDB indisponível')
    })
  })
})

describe('W-11.21 store-sem-key-range', () => {
  it('lança IndexedDbUnavailableError sem globalThis.IDBKeyRange, com o factory presente', () => {
    withoutKeyRange(() => {
      expect(() => browserIdb()).toThrow(IndexedDbUnavailableError)
      expect(() => browserIdb()).toThrow('IndexedDB indisponível')
    })
  })
})

describe('browserIdb com os globais do navegador', () => {
  it('devolve o factory e o keyRange de globalThis quando existem', () => {
    const scope = globalThis as MutableGlobal
    const hadFactory = 'indexedDB' in scope
    const factory = scope.indexedDB
    const hadKeyRange = 'IDBKeyRange' in scope
    const keyRange = scope.IDBKeyRange
    scope.indexedDB = new IDBFactory()
    scope.IDBKeyRange = IDBKeyRange
    try {
      const environment = browserIdb()

      expect(environment.factory).toBe(scope.indexedDB)
      expect(environment.keyRange).toBe(IDBKeyRange)
    } finally {
      if (hadFactory) scope.indexedDB = factory
      else delete scope.indexedDB
      if (hadKeyRange) scope.IDBKeyRange = keyRange
      else delete scope.IDBKeyRange
    }
  })
})

describe('W-11.6 store-round-trip-por-entidade', () => {
  it('persiste e devolve o item igual ao gravado', async () => {
    await context.store.saveItem(ITEM)
    expect(await context.store.getItem(ITEM.id)).toEqual(ITEM)
  })

  it('persiste e devolve o log igual ao gravado', async () => {
    await context.store.saveItem(ITEM)
    await context.store.saveReviewLog(LOG)
    expect(await context.store.listReviewLogs(ITEM.id)).toEqual([LOG])
  })
})

describe('W-11.7 store-meta-schema-version', () => {
  it('num banco novo schemaVersion devolve 1', async () => {
    expect(await context.store.schemaVersion()).toBe(1)
  })

  it('setMeta/getMeta faz round-trip de outra chave', async () => {
    await context.store.setMeta('locale', 'pt-BR')

    expect(await context.store.getMeta('locale')).toBe('pt-BR')
    expect(await context.store.getMeta('ausente')).toBeNull()
  })
})

describe('W-11.17 store-transaction-atomica', () => {
  it('commita item e log juntos', async () => {
    await context.store.transaction(async (scoped) => {
      await scoped.saveItem(ITEM)
      await scoped.saveReviewLog(LOG)
    })

    expect(await context.store.getItem(ITEM.id)).toEqual(ITEM)
    expect(await context.store.listReviewLogs(ITEM.id)).toEqual([LOG])
  })

  it('desfaz os dois quando o corpo falha', async () => {
    await expect(
      context.store.transaction(async (scoped) => {
        await scoped.saveItem(ITEM)
        await scoped.saveReviewLog(LOG)
        throw new Error('falha proposital')
      }),
    ).rejects.toThrow('falha proposital')

    expect(await context.store.getItem(ITEM.id)).toBeNull()
    expect(await context.store.listReviewLogs(ITEM.id)).toEqual([])
  })

  it('recusa transação aninhada', async () => {
    await expect(
      context.store.transaction(async (scoped) => {
        await scoped.transaction(async () => undefined)
      }),
    ).rejects.toThrow('transação aninhada')
  })
})

describe('W-11.22 store-fecha-em-transacao', () => {
  it('recusa fechar a view de dentro da transação', async () => {
    await expect(
      context.store.transaction(async (scoped) => {
        scoped.close()
      }),
    ).rejects.toThrow('não é possível fechar o store dentro de uma transação')
  })
})

describe('W-11.23 store-requisicao-com-falha', () => {
  it('rejeita a requisição pendente quando a transação aborta', async () => {
    const pending: Promise<unknown>[] = []
    const failure = context.store.transaction(async (scoped) => {
      pending.push(scoped.getItem(ITEM.id))
      throw new Error('aborta a transação')
    })

    await expect(failure).rejects.toThrow('aborta a transação')
    await expect(pending[0]).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('W-11.18 store-remove-cascata', () => {
  it('remove o item e os logs dele, sem tocar nos de outro', async () => {
    const other = makeItem('other-item')
    const otherLog = makeLog('other-log', other.id)
    await context.store.saveItem(ITEM)
    await context.store.saveItem(other)
    await context.store.saveReviewLog(LOG)
    await context.store.saveReviewLog(otherLog)

    await context.store.deleteItem(ITEM.id)

    expect(await context.store.getItem(ITEM.id)).toBeNull()
    expect(await context.store.listReviewLogs(ITEM.id)).toEqual([])
    expect(await context.store.getItem(other.id)).toEqual(other)
    expect(await context.store.listReviewLogs(other.id)).toEqual([otherLog])
  })
})

describe('W-11.19 store-arquivo-morto-ciclo', () => {
  it('ordena o arquivo morto por cold_archived_at e id', async () => {
    await context.store.saveColdArchive({ id: 'c1', payload: '{}', cold_archived_at: '2026-09-02T00:00:00Z' })
    await context.store.saveColdArchive({ id: 'c2', payload: '{}', cold_archived_at: '2026-09-01T00:00:00Z' })
    await context.store.saveColdArchive({ id: 'c3', payload: '{}', cold_archived_at: '2026-09-01T00:00:00Z' })

    expect((await context.store.listColdArchive()).map((entry) => entry.id)).toEqual(['c2', 'c3', 'c1'])
  })

  it('purga a entrada e o restore devolve o item a ativo', async () => {
    const entry = { id: ITEM.id, payload: JSON.stringify(ITEM), cold_archived_at: '2026-09-01T00:00:00Z' }
    await context.store.saveColdArchive(entry)
    await context.store.saveItem({ ...ITEM, status: 'active' })

    await context.store.deleteColdArchive(entry.id)

    expect(await context.store.listColdArchive()).toEqual([])
    expect((await context.store.getItem(ITEM.id))?.status).toBe('active')
  })
})

describe('W-11.20 store-historico-por-item', () => {
  it('devolve só os logs do item, ordenados por reviewed_at e id', async () => {
    const other = makeItem('other-item')
    const logA1 = makeLog('log-a1', ITEM.id, { reviewed_at: '2026-09-02T10:00:00Z' })
    const logA2 = makeLog('log-a2', ITEM.id, { reviewed_at: '2026-09-01T10:00:00Z' })
    const logB = makeLog('log-b', other.id, { reviewed_at: '2026-09-03T10:00:00Z' })
    await context.store.saveItem(ITEM)
    await context.store.saveItem(other)
    for (const log of [logA1, logA2, logB]) await context.store.saveReviewLog(log)

    expect((await context.store.listReviewLogs(ITEM.id)).map((log) => log.id)).toEqual(['log-a2', 'log-a1'])
    expect((await context.store.listReviewLogs()).map((log) => log.id)).toEqual(['log-a2', 'log-a1', 'log-b'])
  })
})
