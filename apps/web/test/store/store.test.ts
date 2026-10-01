import { describe, expect, it } from 'vitest'
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

describe('W-11.15 store-sem-indexeddb', () => {
  it('lança IndexedDbUnavailableError com mensagem clara sem globalThis.indexedDB', () => {
    withoutIndexedDb(() => {
      expect(() => browserIdb()).toThrow(IndexedDbUnavailableError)
      expect(() => browserIdb()).toThrow('IndexedDB indisponível')
    })
  })
})
