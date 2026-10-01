import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { IDBKeyRange } from 'fake-indexeddb'
import { RecoveryScreen } from '../src/recovery.tsx'
import { SchemaVersionError, openStore, type IdbEnvironment } from '../src/store/index.ts'
import { SCHEMA_VERSION_KEY } from '../src/store/schema.ts'
import { strings } from '../src/strings.ts'
import { testDeps, testFiles, type TestFiles } from './helpers.tsx'
import { freshEnvironment, makeItem, uniqueDbName } from './store/helpers.ts'

afterEach(cleanup)

function savedText(files: TestFiles): string {
  const first = files.saved[0]
  if (first === undefined) throw new Error('nenhum arquivo foi salvo')
  return first.content
}

describe('AC6 recuperação do boot', () => {
  it('recoveryBootComSchemaDivergenteOfereceDownload', async () => {
    const environment = freshEnvironment()
    const name = uniqueDbName()
    const store = await openStore(environment, name)
    await store.transaction(async (scoped) => {
      await scoped.saveItem(makeItem('a-1'))
    })
    await store.setMeta(SCHEMA_VERSION_KEY, '2')
    store.close()
    const error = await openStore(environment, name).catch((thrown: unknown) => thrown)
    expect(error).toBeInstanceOf(SchemaVersionError)
    const files = testFiles()

    render(
      <RecoveryScreen
        error={error}
        environment={environment}
        name={name}
        deps={testDeps()}
        files={files}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: strings.data.export }))

    await waitFor(() => expect(files.saved).toHaveLength(1))
    const dump = JSON.parse(savedText(files)) as { items: unknown[]; schema_version: number }
    expect(dump.schema_version).toBe(1)
    expect(dump.items).toHaveLength(1)
  })

  it('recoveryStoreIlegivelMostraFalhaDeExport', async () => {
    const broken: IdbEnvironment = {
      factory: {
        open: () => {
          throw new Error('IndexedDB explodiu')
        },
      } as unknown as IDBFactory,
      keyRange: IDBKeyRange,
    }
    const files = testFiles()

    render(
      <RecoveryScreen
        error={new SchemaVersionError(2)}
        environment={broken}
        name="estudo"
        deps={testDeps()}
        files={files}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: strings.data.export }))

    expect(await screen.findByText(strings.data.exportFailed)).toBeInTheDocument()
    expect(files.saved).toHaveLength(0)
  })
})
