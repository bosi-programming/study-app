import { describe, expect, it } from 'vitest'
import { CliError } from '../../src/errors.ts'
import { coldArchivePayload } from '../../src/coldArchive.ts'
import { CURRENT_SCHEMA_VERSION, migrateDump, type MigrationTable } from '../../src/output/migrations.ts'
import {
  fromColdArchiveJson,
  fromItemJson,
  fromReviewLogJson,
  parseDumpV1,
  toItemJson,
  toReviewLogJson,
} from '../../src/output/json.ts'
import { makeItem, makeLog } from '../persistence/helpers.ts'

const FILE_PATH = '/tmp/backup.json'

function dump(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: 1,
    exported_at: '2026-09-23T12:00:00Z',
    meta: { locale: 'pt-BR', cold_archive_after_days: 180 },
    items: [],
    review_logs: [],
    cold_archive: [],
    ...overrides,
  }
}

function expectInvalidDump(text: string): void {
  try {
    parseDumpV1(text, FILE_PATH)
  } catch (error) {
    expect(error).toBeInstanceOf(CliError)
    const cliError = error as CliError
    expect(cliError.code).toBe('invalid-value')
    expect(cliError.exitCode).toBe(2)
    expect(cliError.message).toBe(`arquivo inválido: ${FILE_PATH}`)
    return
  }
  throw new Error('parseDumpV1 aceitou um arquivo fora do contrato')
}

describe('AC6 — a escada de migrações (t13)', () => {
  it('escada-migra-em-ordem: aplica de from + 1 até a versão atual, em ordem', () => {
    const applied: number[] = []
    const migrations: MigrationTable = {
      2: (value) => {
        applied.push(2)
        return { ...value, two: true }
      },
      3: (value) => {
        applied.push(3)
        return { ...value, three: true }
      },
      4: (value) => {
        applied.push(4)
        return { ...value, four: true }
      },
    }

    const migrated = migrateDump({ schema_version: 1, mark: 'v1' }, 1, migrations, 3)

    expect(applied).toEqual([2, 3])
    expect(migrated).toEqual({ schema_version: 3, mark: 'v1', two: true, three: true })
  })

  it('escada-parada-na-atual: um dump já na versão atual não sobe degrau nenhum', () => {
    const applied: number[] = []
    const migrations: MigrationTable = {
      1: (value) => {
        applied.push(1)
        return value
      },
    }

    const migrated = migrateDump({ schema_version: 1 }, 1, migrations, 1)

    expect(applied).toEqual([])
    expect(migrated).toEqual({ schema_version: 1 })
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
  })
})

describe('AC6/AC10 — o leitor recusa o arquivo fora do contrato', () => {
  it('schema-version-ausente-invalido: ausente, string e float são arquivo inválido', () => {
    const withoutVersion = dump()
    delete withoutVersion.schema_version
    expectInvalidDump(JSON.stringify(withoutVersion))
    expectInvalidDump(JSON.stringify(dump({ schema_version: '1' })))
    expectInvalidDump(JSON.stringify(dump({ schema_version: 1.5 })))
    expectInvalidDump(JSON.stringify(dump({ schema_version: 0 })))
  })

  it('parse-dump-rejeita-forma: JSON malformado, coleção ausente e tipo errado caem no mesmo erro', () => {
    expectInvalidDump('{ nao é json')
    expectInvalidDump(JSON.stringify(dump({ items: {} })))
    expectInvalidDump(JSON.stringify(dump({ meta: [] })))
    expectInvalidDump(JSON.stringify(dump({ exported_at: 3 })))
    expectInvalidDump(JSON.stringify(dump({ items: [{ id: 'a' }] })))
    expectInvalidDump(JSON.stringify(dump({ items: [{ ...toItemJson(makeItem()), status: 'sumido' }] })))
    expectInvalidDump(JSON.stringify(dump({ review_logs: [{ ...makeLog(), late: 'sim' }] })))
    expectInvalidDump(JSON.stringify(dump({ cold_archive: [{ cold_archived_at: 'x' }] })))
  })

  it('schema-futuro-rejeitado-no-leitor: versão acima da atual para antes da escada', () => {
    expect(() => parseDumpV1(JSON.stringify(dump({ schema_version: 2 })), FILE_PATH)).toThrowError(
      'schema_version 2 não suportado',
    )
  })
})

describe('AC6 — o leitor aceita o que o MODELO-DE-DADOS documenta', () => {
  it('chaves-opcionais-ausentes: o item do exemplo do doc importa com nulos', () => {
    const example = {
      id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
      title: 'Derivadas parciais',
      subject: 'Cálculo',
      difficulty: 4,
      interval_days: 6,
      due_date: '2026-09-12',
      review_count: 2,
      on_time_streak: 2,
      status: 'active',
      created_at: '2026-08-30T09:00:00Z',
      updated_at: '2026-09-06T22:10:00Z',
    }

    const parsed = parseDumpV1(JSON.stringify(dump({ items: [example] })), FILE_PATH)

    expect(parsed.items[0]).toEqual({
      ...example,
      note: null,
      link: null,
      last_reviewed_at: null,
      archived_at: null,
      cold_archived_at: null,
    })
  })
})

describe('AC2/AC11 — o leitor é o inverso exato do escritor', () => {
  it('leitor-inverso-do-escritor: item e review_log voltam idênticos', () => {
    const item = makeItem()
    const log = makeLog()

    expect(fromItemJson(JSON.parse(JSON.stringify(toItemJson(item))))).toEqual(item)
    expect(fromReviewLogJson(JSON.parse(JSON.stringify(toReviewLogJson(log))))).toEqual(log)
  })

  it('payload-cold-reconstruido: o payload volta a ser {item, review_logs}', () => {
    const item = makeItem({ status: 'cold', cold_archived_at: '2026-09-01T12:00:00Z' })
    const logs = [makeLog()]
    const stamp = '2026-09-01T12:00:00Z'
    const exported = { ...(JSON.parse(coldArchivePayload(item, logs)) as Record<string, unknown>), cold_archived_at: stamp }

    const entry = fromColdArchiveJson(exported)

    expect(entry).toEqual({ id: item.id, payload: coldArchivePayload(item, logs), cold_archived_at: stamp })
    expect(Object.keys(JSON.parse(entry.payload) as Record<string, unknown>)).toEqual([
      'item',
      'review_logs',
    ])
  })
})
