import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION_KEY } from '../../src/store/schema.ts'
import { SchemaVersionError, openStore } from '../../src/store/store.ts'
import { freshEnvironment, uniqueDbName } from './helpers.ts'

describe('AC6 abertura relaxada do store', () => {
  it('openStoreRelaxadoLeBancoComSchemaDivergente', async () => {
    const environment = freshEnvironment()
    const name = uniqueDbName()
    const store = await openStore(environment, name)
    await store.setMeta(SCHEMA_VERSION_KEY, '2')
    store.close()

    await expect(openStore(environment, name)).rejects.toBeInstanceOf(SchemaVersionError)

    const relaxed = await openStore(environment, name, { checkSchema: false })

    expect(await relaxed.schemaVersion()).toBe(2)
    relaxed.close()
  })
})
