import { describe, expect, it } from 'vitest'
import { type Item, type ReviewLog } from '@study/core'
import {
  type ColdArchiveRecord,
  type DumpSnapshot,
  InvalidDumpError,
  UnsupportedSchemaError,
  dumpJsonV1,
  parseDumpV1,
  toItemJson,
  toReviewLogJson,
} from '../../src/features/data/model/json.ts'
import {
  META_KEYS,
  mergeColdArchive,
  mergeItems,
  mergeMeta,
  mergeReviewLogs,
  validateReferences,
} from '../../src/features/data/model/merge.ts'
import { migrateDump } from '../../src/features/data/model/migrations.ts'
import { makeItem, makeLog } from '../store/helpers.ts'

const STAMP = '2026-10-01T12:00:00Z'

const COLD_ITEM_LITERAL = {
  id: 'a-3',
  title: 'Item a-3',
  subject: 'Cálculo',
  difficulty: 3,
  note: null,
  link: null,
  interval_days: 3,
  due_date: '2026-09-30',
  review_count: 0,
  on_time_streak: 0,
  status: 'cold',
  last_reviewed_at: null,
  archived_at: null,
  cold_archived_at: STAMP,
  created_at: '2026-09-01T09:00:00Z',
  updated_at: '2026-09-01T09:00:00Z',
}

const LOG_LITERAL = {
  id: 'l-1',
  item_id: 'a-3',
  reviewed_at: '2026-09-06T22:10:00Z',
  due_date_at_review: '2026-09-06',
  interval_after: 6,
  review_count_after: 1,
  late: false,
}

function makeSnapshot(
  options: {
    readonly exportedAt?: string
    readonly meta?: Record<string, string | null>
    readonly items?: readonly Item[]
    readonly reviewLogs?: readonly ReviewLog[]
    readonly coldArchive?: readonly ColdArchiveRecord[]
  } = {},
): DumpSnapshot {
  return {
    exportedAt: options.exportedAt ?? STAMP,
    meta: options.meta ?? {},
    items: options.items ?? [],
    reviewLogs: options.reviewLogs ?? [],
    coldArchive: options.coldArchive ?? [],
  }
}

function dumpJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema_version: 1,
    exported_at: STAMP,
    meta: {},
    items: [],
    review_logs: [],
    cold_archive: [],
    ...overrides,
  })
}

function coldRecord(
  item: Item,
  logs: readonly ReviewLog[],
  coldArchivedAt: string,
): ColdArchiveRecord {
  return {
    id: item.id,
    payload: JSON.stringify({ item: toItemJson(item), review_logs: logs.map(toReviewLogJson) }),
    cold_archived_at: coldArchivedAt,
  }
}

function coldJson(record: ColdArchiveRecord): Record<string, unknown> {
  return { ...(JSON.parse(record.payload) as Record<string, unknown>), cold_archived_at: record.cold_archived_at }
}

describe('AC1 contrato do export', () => {
  it('dataExportCriaArquivoComSeisChaves', () => {
    const dump = dumpJsonV1(makeSnapshot())

    expect(Object.keys(dump)).toEqual([
      'schema_version',
      'exported_at',
      'meta',
      'items',
      'review_logs',
      'cold_archive',
    ])
    expect(dump.schema_version).toBe(1)
    expect(dump.exported_at).toBe(STAMP)
  })

  it('dataExportIncluiAtivosArquivadosColdHistorico', () => {
    const active = makeItem('a-1')
    const archived = makeItem('a-2', { status: 'archived', archived_at: STAMP })
    const cold = makeItem('a-3', { status: 'cold', cold_archived_at: STAMP })
    const log = makeLog('l-1', 'a-3')

    const dump = dumpJsonV1(
      makeSnapshot({
        items: [active, archived, cold],
        reviewLogs: [log],
        coldArchive: [coldRecord(cold, [log], STAMP)],
      }),
    )

    expect(dump.items.map((item) => item.id)).toEqual(['a-1', 'a-2', 'a-3'])
    expect(dump.items.map((item) => item.status)).toEqual(['active', 'archived', 'cold'])
    expect(dump.review_logs).toEqual([LOG_LITERAL])
    expect(dump.cold_archive).toEqual([
      { item: COLD_ITEM_LITERAL, review_logs: [LOG_LITERAL], cold_archived_at: STAMP },
    ])
  })

  const windows: readonly (readonly [string, string | null, number])[] = [
    ['ausente', null, 180],
    ['aceita', '90', 90],
    ['recusa zero', '0', 180],
    ['recusa negativo', '-5', 180],
    ['recusa fracionário', '1.5', 180],
    ['recusa texto', 'abc', 180],
  ]

  it.each(windows)('dataExportNormalizaAJanelaDoArquivoMorto (%s)', (_label, raw, expected) => {
    const dump = dumpJsonV1(makeSnapshot({ meta: { cold_archive_after_days: raw } }))

    expect(dump.meta['cold_archive_after_days']).toBe(expected)
  })

  it('dataExportZeraOStreakQuandoNaoEhNumero', () => {
    const dump = dumpJsonV1(makeSnapshot({ meta: { streak_current: 'abc' } }))

    expect(dump.meta['streak_current']).toBe(0)
  })

  it('dataExportMetaGravaPadroesQuandoFaltaChave', () => {
    const dump = dumpJsonV1(makeSnapshot({ meta: {} }))

    expect(dump.meta).toEqual({
      cold_archive_after_days: 180,
      locale: 'pt-BR',
      streak_current: 0,
      streak_last_day: null,
    })
  })
})

describe('AC2 idempotencia', () => {
  it('mergeImportArquivoEmpateNaoEscreve', () => {
    const local = makeItem('a-1', { updated_at: STAMP })
    const itemPlan = mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(local)] })), [local])
    const coldLocal = coldRecord(local, [], STAMP)
    const coldPlan = mergeColdArchive(
      parseDumpV1(dumpJson({ cold_archive: [coldJson(coldLocal)] })),
      [coldLocal],
    )

    expect(itemPlan.write).toEqual([])
    expect(itemPlan.skipped).toBe(1)
    expect(coldPlan.write).toEqual([])
    expect(coldPlan.skipped).toBe(1)
  })
})

describe('AC3 conflito por updated_at e historico', () => {
  it('mergeItemArquivoVenceSoSeEstritamenteMaisNovo', () => {
    const local = makeItem('a-1', { updated_at: '2026-09-01T00:00:00Z' })
    const older = makeItem('a-1', { updated_at: '2026-08-01T00:00:00Z' })
    const tie = makeItem('a-1', { updated_at: '2026-09-01T00:00:00Z' })
    const newer = makeItem('a-1', { title: 'Item novo', updated_at: '2026-10-01T00:00:00Z' })

    expect(mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(older)] })), [local]).write).toEqual([])
    expect(mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(tie)] })), [local]).write).toEqual([])
    expect(mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(newer)] })), [local]).write).toEqual([
      newer,
    ])
  })

  it('mergeTimestampComparaPorInstanteNaoPorString', () => {
    const local = makeItem('a-1', { updated_at: '2026-09-06T22:10:00Z' })
    const incoming = makeItem('a-1', { updated_at: '2026-09-06T22:10:30+00:00' })

    expect(mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(incoming)] })), [local]).write).toEqual([
      incoming,
    ])
  })

  it('mergeReviewLogInsereSoSeIdNaoExiste', () => {
    const local = makeLog('l-1', 'a-1')
    const repeated = makeLog('l-1', 'a-1', { interval_after: 99 })
    const other = makeLog('l-2', 'a-1')
    const dump = parseDumpV1(
      dumpJson({
        items: [toItemJson(makeItem('a-1'))],
        review_logs: [toReviewLogJson(repeated), toReviewLogJson(other)],
      }),
    )

    const plan = mergeReviewLogs(dump, [local])

    expect(plan.write).toEqual([other])
    expect(plan.skipped).toBe(1)
  })

  it('mergeReviewLogDedupDentroDoMesmoArquivo', () => {
    const log = makeLog('l-1', 'a-1')
    const dump = parseDumpV1(
      dumpJson({
        items: [toItemJson(makeItem('a-1'))],
        review_logs: [toReviewLogJson(log), toReviewLogJson(log)],
      }),
    )

    const plan = mergeReviewLogs(dump, [])

    expect(plan.write).toEqual([log])
    expect(plan.skipped).toBe(1)
  })

  it('mergeColdArchiveUsaColdArchivedAtEstrito', () => {
    const local = coldRecord(makeItem('a-1'), [], STAMP)
    const parseCold = (record: ColdArchiveRecord): ReturnType<typeof parseDumpV1> =>
      parseDumpV1(dumpJson({ cold_archive: [coldJson(record)] }))

    expect(mergeColdArchive(parseCold(coldRecord(makeItem('a-1'), [], STAMP)), [local]).write).toEqual([])
    expect(
      mergeColdArchive(parseCold(coldRecord(makeItem('a-1'), [], '2026-09-01T00:00:00Z')), [local]).write,
    ).toEqual([])
    expect(
      mergeColdArchive(parseCold(coldRecord(makeItem('a-1'), [], '2026-10-02T00:00:00Z')), [local]).write,
    ).toEqual([coldRecord(makeItem('a-1'), [], '2026-10-02T00:00:00Z')])
  })
})

describe('AC7 bordas herdadas', () => {
  it('importReviewLogOrfaoRecusaArquivoInteiro', () => {
    const dump = parseDumpV1(
      dumpJson({ review_logs: [toReviewLogJson(makeLog('l-1', 'sumido'))] }),
    )

    expect(() => validateReferences(dump, new Set())).toThrowError(InvalidDumpError)
    expect(() => validateReferences(dump, new Set(['sumido']))).not.toThrow()
  })

  it('importSchemaVersionFuturoRecusa', () => {
    expect(() => parseDumpV1(dumpJson({ schema_version: 2 }))).toThrowError(UnsupportedSchemaError)
    expect(() => parseDumpV1(dumpJson({ schema_version: 7 }))).toThrowError(
      new UnsupportedSchemaError(7),
    )
  })

  const item = toItemJson(makeItem('a-1'))
  const invalidBodies: readonly (readonly [string, string])[] = [
    ['json inválido', '{ nao eh json'],
    ['schema_version texto', dumpJson({ schema_version: '1' })],
    ['schema_version zero', dumpJson({ schema_version: 0 })],
    ['schema_version fracionário', dumpJson({ schema_version: 1.5 })],
    ['items não-lista', dumpJson({ items: {} })],
    ['meta não-registro', dumpJson({ meta: [] })],
    ['exported_at não-texto', dumpJson({ exported_at: 3 })],
    ['status fora do contrato', dumpJson({ items: [{ ...item, status: 'sumido' }] })],
    ['dificuldade fora do contrato', dumpJson({ items: [{ ...item, difficulty: 9 }] })],
    ['cold_archive sem carimbo', dumpJson({ cold_archive: [{ cold_archived_at: 'x' }] })],
  ]

  it.each(invalidBodies)('importArquivoForaDoContratoRecusa (%s)', (_label, text) => {
    expect(() => parseDumpV1(text)).toThrowError(InvalidDumpError)
  })

  it('importMetaGravaSoChavesConhecidas', () => {
    const dump = parseDumpV1(
      dumpJson({
        meta: {
          locale: 'en-US',
          cold_archive_after_days: 30,
          streak_current: 2,
          streak_last_day: '2026-09-12',
          schema_version: 99,
          last_cold_archive_export_at: STAMP,
          extra: 'x',
        },
      }),
    )

    const writes = mergeMeta(dump)

    expect(writes.map((entry) => entry.key).toSorted()).toEqual([...META_KEYS].toSorted())
    expect(writes.find((entry) => entry.key === 'schema_version')).toBeUndefined()
    expect(writes.find((entry) => entry.key === 'last_cold_archive_export_at')).toBeUndefined()
    expect(writes.find((entry) => entry.key === 'locale')?.value).toBe('en-US')
  })

  it('importAditivoNaoApagaItemSoLocal', () => {
    const localOnly = makeItem('a-local')
    const incoming = makeItem('a-new', { updated_at: '2026-10-01T00:00:00Z' })
    const dump = parseDumpV1(dumpJson({ items: [toItemJson(incoming)] }))

    const plan = mergeItems(dump, [localOnly])

    expect(plan.write).toEqual([incoming])
    expect(plan.write.some((item) => item.id === 'a-local')).toBe(false)
  })

  it('mergeItemComTimestampInvalidoNaoEscreve', () => {
    const local = makeItem('a-1', { updated_at: '2026-09-01T00:00:00Z' })
    const broken = makeItem('a-1', { updated_at: 'nao-e-data' })

    const plan = mergeItems(parseDumpV1(dumpJson({ items: [toItemJson(broken)] })), [local])

    expect(plan.write).toEqual([])
    expect(plan.skipped).toBe(1)
  })

  it('importArquivoMortoOrfaoNaoRecusa', () => {
    const dump = parseDumpV1(
      dumpJson({ cold_archive: [coldJson(coldRecord(makeItem('sumido'), [], STAMP))] }),
    )

    expect(() => validateReferences(dump, new Set())).not.toThrow()
  })
})

describe('AC1 escada de migracoes', () => {
  it('migrateDumpAplicaPassoEAjustaSchemaVersion', () => {
    const table = {
      2: (dump: Record<string, unknown>): Record<string, unknown> => ({
        ...dump,
        meta: { locale: 'en-US' },
      }),
    }

    const migrated = migrateDump({ schema_version: 1, meta: {} }, 1, table, 2)

    expect(migrated.schema_version).toBe(2)
    expect(migrated.meta).toEqual({ locale: 'en-US' })
  })
})
