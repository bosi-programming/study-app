import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type Item, type ReviewLog } from '@study/core'
import { toItemJson, toReviewLogJson } from '../../src/features/data/model/json.ts'
import { type FileGateway } from '../../src/files.ts'
import { strings } from '../../src/strings.ts'
import { type Store } from '../../src/store/index.ts'
import {
  makeItem,
  makeLog,
  openTestStore,
  renderApp,
  seed,
  storeWith,
  testDeps,
  testFiles,
  type TestFiles,
} from '../helpers.tsx'

const STAMP = '2026-10-01T12:00:00Z'

afterEach(cleanup)

async function seedLogs(store: Store, logs: readonly ReviewLog[]): Promise<void> {
  await store.transaction(async (scoped) => {
    for (const log of logs) await scoped.saveReviewLog(log)
  })
}

async function seedCold(
  store: Store,
  item: Item,
  logs: readonly ReviewLog[],
  stamp: string,
): Promise<void> {
  await store.transaction(async (scoped) => {
    await scoped.saveColdArchive({
      id: item.id,
      payload: JSON.stringify({ item: toItemJson(item), review_logs: logs.map(toReviewLogJson) }),
      cold_archived_at: stamp,
    })
  })
}

function dumpText(items: readonly Item[] = [], logs: readonly ReviewLog[] = []): string {
  return JSON.stringify({
    schema_version: 1,
    exported_at: STAMP,
    meta: {},
    items: items.map(toItemJson),
    review_logs: logs.map(toReviewLogJson),
    cold_archive: [],
  })
}

function savedText(files: TestFiles): string {
  const first = files.saved[0]
  if (first === undefined) throw new Error('nenhum arquivo foi salvo')
  return first.content
}

async function openData(store: Store, files: TestFiles): Promise<void> {
  renderApp(store, testDeps(), '#/data', files)
  await screen.findByRole('heading', { name: strings.data.heading })
}

describe('AC1/AC4 export pela tela', () => {
  it('dataTelaConfirmaExportComContagens', async () => {
    const { store } = await openTestStore()
    const cold = makeItem('a-3', { status: 'cold', cold_archived_at: STAMP })
    await seed(store, [makeItem('a-1'), cold])
    await seedLogs(store, [makeLog('l-1', 'a-1')])
    await seedCold(store, cold, [], STAMP)
    const files = testFiles()

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.export }))

    expect(await screen.findByText(strings.data.exported)).toBeInTheDocument()
    const dump = JSON.parse(savedText(files)) as Record<string, unknown>
    expect(Object.keys(dump)).toEqual([
      'schema_version',
      'exported_at',
      'meta',
      'items',
      'review_logs',
      'cold_archive',
    ])
    expect((dump.items as unknown[]).length).toBe(2)
    expect((dump.review_logs as unknown[]).length).toBe(1)
    expect((dump.cold_archive as unknown[]).length).toBe(1)
    expect(screen.getByText(`${strings.data.countsItems}: 2`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsCheckins}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsCold}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsWritten}: 4`)).toBeInTheDocument()
  })
})

describe('AC2/AC4 import pela tela', () => {
  it('dataTelaMostraContagensDoImport', async () => {
    const { store } = await openTestStore()
    const files = testFiles()
    files.setPicked(dumpText([makeItem('a-1')], [makeLog('l-1', 'a-1')]))

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByText(strings.data.imported)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsItems}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsCheckins}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsWritten}: 2`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsSkipped}: 0`)).toBeInTheDocument()
    expect(await store.listItems()).toHaveLength(1)
  })

  it('dataImportDuasVezesNaoDuplica', async () => {
    const { store } = await openTestStore()
    const files = testFiles()
    files.setPicked(dumpText([makeItem('a-1')], [makeLog('l-1', 'a-1')]))

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))
    await screen.findByText(strings.data.imported)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByText(`${strings.data.countsWritten}: 0`)).toBeInTheDocument()
    expect(await store.listItems()).toHaveLength(1)
    expect(await store.listReviewLogs()).toHaveLength(1)
  })

  it('dataImportSegundaRodadaGravaZero', async () => {
    const { store } = await openTestStore()
    const files = testFiles()
    files.setPicked(dumpText([makeItem('a-1')], [makeLog('l-1', 'a-1')]))

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))
    await screen.findByText(strings.data.imported)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByText(`${strings.data.countsSkipped}: 2`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.data.countsWritten}: 0`)).toBeInTheDocument()
  })
})

describe('AC7 recusa pela tela', () => {
  it('importEscritaRodaNumaTransacaoUnica', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('local-1')])
    const before = await store.listItems()
    const files = testFiles()
    files.setPicked(
      dumpText([makeItem('a-1', { updated_at: STAMP })], [makeLog('l-1', 'sumido')]),
    )

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.data.invalidFile)
    expect(await store.listItems()).toEqual(before)
    expect(await store.listReviewLogs()).toEqual([])
  })
})

describe('AC7 erros e cancelamento do controller na tela', () => {
  it('dataImportCanceladoVoltaAoInicioSemErro', async () => {
    const { store } = await openTestStore()
    const files = testFiles()
    files.setPicked(null)

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(strings.data.imported)).not.toBeInTheDocument()
  })

  it('dataPickFileQuebradoMostraFalhaDeStore', async () => {
    const { store } = await openTestStore()
    const files: FileGateway = {
      saveFile: async () => {},
      pickFile: () => Promise.reject(new Error('leitor explodiu')),
    }
    renderApp(store, testDeps(), '#/data', files)
    await screen.findByRole('heading', { name: strings.data.heading })

    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
  })

  it('dataExportComStoreQuebradoMostraFalhaDeExport', async () => {
    const { store } = await openTestStore()
    const broken = storeWith(store, {
      listReviewLogs: () => Promise.reject(new Error('leitura explodiu')),
    })
    const files = testFiles()

    await openData(broken, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.export }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.data.exportFailed)
    expect(files.saved).toHaveLength(0)
  })

  it('dataSchemaVersionFuturoMostraMensagemTraduzida', async () => {
    const { store } = await openTestStore()
    const files = testFiles()
    files.setPicked(JSON.stringify({ schema_version: 2 }))

    await openData(store, files)
    fireEvent.click(screen.getByRole('button', { name: strings.data.import }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.data.unsupportedSchema(2))
  })
})
