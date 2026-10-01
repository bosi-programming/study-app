import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import {
  COLD_ARCHIVE_STORE,
  IDB_SCHEMA,
  IDB_VERSION,
  ITEMS_STORE,
  META_STORE,
  REVIEW_LOGS_STORE,
  SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
  applySchema,
} from '../../src/store/schema.ts'
import { SchemaMismatchError, SchemaVersionError, openStore } from '../../src/store/store.ts'

type IdbEnvironment = { factory: IDBFactory; keyRange: typeof IDBKeyRange }

function freshEnvironment(): IdbEnvironment {
  return { factory: new IDBFactory(), keyRange: IDBKeyRange }
}

function openWithSchema(environment: IdbEnvironment, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = environment.factory.open(name, IDB_VERSION)
    request.onupgradeneeded = () => {
      const transaction = request.transaction
      if (transaction === null) throw new Error('transação de upgrade ausente')
      applySchema(transaction)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function indexNames(store: IDBObjectStore): string[] {
  return Array.from(store.indexNames)
}

async function readSchemaVersion(db: IDBDatabase): Promise<unknown> {
  const transaction = db.transaction(META_STORE, 'readonly')
  const row = await readRequest(transaction.objectStore(META_STORE).get(SCHEMA_VERSION_KEY))
  return (row as { readonly value?: unknown } | undefined)?.value
}

describe('W-11.1 store-cria-o-schema', () => {
  it('cria os quatro stores com os índices do documento e semeia schema_version', async () => {
    const environment = freshEnvironment()
    const db = await openWithSchema(environment, 'schema-fresh')
    try {
      expect(Array.from(db.objectStoreNames).toSorted()).toEqual(
        [COLD_ARCHIVE_STORE, ITEMS_STORE, META_STORE, REVIEW_LOGS_STORE].toSorted(),
      )

      for (const spec of IDB_SCHEMA) {
        const transaction = db.transaction(spec.name, 'readonly')
        const store = transaction.objectStore(spec.name)
        expect(store.keyPath).toEqual(spec.keyPath)
        expect(indexNames(store).toSorted()).toEqual(spec.indexes.map((index) => index.name).toSorted())
        for (const index of spec.indexes) {
          expect(store.index(index.name).keyPath).toEqual([...index.keyPath])
        }
      }

      expect(await readSchemaVersion(db)).toBe(SCHEMA_VERSION)
    } finally {
      db.close()
    }
  })
})

type DocStore = {
  readonly name: string
  readonly keyPath: string
  readonly indexNames: readonly string[]
}

function indexedDbSection(): string {
  const doc = readFileSync(
    resolve(import.meta.dirname, '../../../../docs/especificacao/MODELO-DE-DADOS.md'),
    'utf8',
  )
  const section = doc.split('\n## ').find((chunk) => chunk.startsWith('IndexedDB (web e desktop)'))
  if (section === undefined) throw new Error('seção IndexedDB ausente no MODELO-DE-DADOS.md')
  return section
}

function docStores(): DocStore[] {
  return indexedDbSection()
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.includes('---') && !line.includes('| Store |'))
    .map((line) => {
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
      const indexes = cells[2] === '—' || cells[2] === '' ? [] : cells[2]!.split(',').map((index) => index.trim())
      return { name: cells[0] ?? '', keyPath: cells[1] ?? '', indexNames: indexes }
    })
}

describe('W-11.2 store-schema-pinado-ao-doc', () => {
  const expected = docStores().toSorted((left, right) => left.name.localeCompare(right.name))

  it('lista os quatro stores do documento', () => {
    expect(expected.map((store) => store.name)).toEqual(
      [COLD_ARCHIVE_STORE, ITEMS_STORE, META_STORE, REVIEW_LOGS_STORE].toSorted(),
    )
  })

  it('IDB_SCHEMA casa com store, keyPath e índices do documento', () => {
    const coded = [...IDB_SCHEMA]
      .map((store) => ({
        name: store.name,
        keyPath: store.keyPath,
        indexNames: store.indexes.map((index) => index.name).toSorted(),
      }))
      .toSorted((left, right) => left.name.localeCompare(right.name))

    expect(coded).toEqual(expected.map((store) => ({ ...store, indexNames: [...store.indexNames].toSorted() })))
  })

  it('nomeia cada índice pela chave composta que ele indexa', () => {
    for (const store of IDB_SCHEMA) {
      for (const index of store.indexes) {
        expect(index.name).toBe([...index.keyPath].join('+'))
      }
    }
  })
})

function openDiverged(
  environment: IdbEnvironment,
  name: string,
  upgrade: (transaction: IDBTransaction) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = environment.factory.open(name, IDB_VERSION)
    request.onupgradeneeded = () => {
      const transaction = request.transaction
      if (transaction === null) throw new Error('transação de upgrade ausente')
      upgrade(transaction)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

describe('W-11.16 store-schema-divergente', () => {
  it('rejeita um banco com schema_version diferente de 1', async () => {
    const environment = freshEnvironment()
    const name = 'schema-version-divergent'
    const db = await openDiverged(environment, name, (transaction) => {
      applySchema(transaction)
      transaction.objectStore(META_STORE).put({ key: SCHEMA_VERSION_KEY, value: '2' })
    })
    db.close()

    await expect(openStore(environment, name)).rejects.toThrow(SchemaVersionError)
  })

  it('rejeita um banco com store faltando', async () => {
    const environment = freshEnvironment()
    const name = 'schema-store-missing'
    const db = await openDiverged(environment, name, (transaction) => {
      transaction.db.createObjectStore(ITEMS_STORE, { keyPath: 'id' })
    })
    db.close()

    await expect(openStore(environment, name)).rejects.toThrow(SchemaMismatchError)
  })

  it('rejeita um banco com keyPath divergente no store', async () => {
    const environment = freshEnvironment()
    const name = 'schema-key-path'
    const db = await openDiverged(environment, name, (transaction) => {
      for (const spec of IDB_SCHEMA) {
        const keyPath = spec.name === ITEMS_STORE ? 'uuid' : spec.keyPath
        const objectStore = transaction.db.createObjectStore(spec.name, { keyPath })
        for (const index of spec.indexes) objectStore.createIndex(index.name, [...index.keyPath])
      }
      transaction.objectStore(META_STORE).put({ key: SCHEMA_VERSION_KEY, value: SCHEMA_VERSION })
    })
    db.close()

    await expect(openStore(environment, name)).rejects.toThrow(SchemaMismatchError)
  })

  it('rejeita um banco com índice a mais', async () => {
    const environment = freshEnvironment()
    const name = 'schema-index-extra'
    const db = await openDiverged(environment, name, (transaction) => {
      applySchema(transaction)
      transaction.objectStore(ITEMS_STORE).createIndex('extra', 'title')
    })
    db.close()

    await expect(openStore(environment, name)).rejects.toThrow(SchemaMismatchError)
  })
})
