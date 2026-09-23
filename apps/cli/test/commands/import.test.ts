import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { type Item, type ReviewLog, addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { toItemJson, toReviewLogJson } from '../../src/output/json.ts'
import {
  errorOf,
  jsonOf,
  runStudy,
  seed,
  todayLocalDate,
  withStore,
} from './helpers.ts'

const STAMP = '2026-09-01T12:00:00Z'

type DumpFile = {
  schema_version: number
  exported_at: string
  meta: Record<string, unknown>
  items: unknown[]
  review_logs: unknown[]
  cold_archive: unknown[]
}

function emptyDump(): DumpFile {
  return {
    schema_version: 1,
    exported_at: '2026-09-23T12:00:00Z',
    meta: {},
    items: [],
    review_logs: [],
    cold_archive: [],
  }
}

function dumpWith(
  items: readonly Item[],
  logs: readonly ReviewLog[] = [],
  cold: readonly unknown[] = [],
): DumpFile {
  return {
    ...emptyDump(),
    items: items.map(toItemJson),
    review_logs: logs.map(toReviewLogJson),
    cold_archive: [...cold],
  }
}

function writeDump(dbPath: string, name: string, value: unknown): string {
  const path = join(dirname(dbPath), name)
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value))
  return path
}

function readDump(path: string): DumpFile {
  return JSON.parse(readFileSync(path, 'utf8')) as DumpFile
}

function withoutExportedAt(path: string): DumpFile {
  const value = readDump(path)
  delete (value as Partial<DumpFile>).exported_at
  return value
}

function coldEntry(item: Item, logs: readonly ReviewLog[] = []): Record<string, unknown> {
  return {
    item: toItemJson(item),
    review_logs: logs.map(toReviewLogJson),
    cold_archived_at: item.cold_archived_at ?? STAMP,
  }
}

function richSeed(dbPath: string): void {
  const active = makeItem({ id: 'active-1' })
  const archived = makeItem({ id: 'archived-1', status: 'archived', archived_at: STAMP })
  const cold = makeItem({ id: 'cold-1', status: 'cold', cold_archived_at: STAMP, review_count: 1 })
  const activeLog = makeLog({ id: 'log-active', item_id: 'active-1' })
  const coldLog = makeLog({ id: 'log-cold', item_id: 'cold-1', reviewed_at: '2026-09-05T22:10:00Z' })

  withStore(dbPath, (store) => {
    store.transaction(() => {
      store.saveItem(active)
      store.saveItem(archived)
      store.saveItem(cold)
      store.saveReviewLog(activeLog)
      store.saveReviewLog(coldLog)
      store.saveColdArchive({
        id: 'cold-1',
        payload: JSON.stringify({ item: toItemJson(cold), review_logs: [toReviewLogJson(coldLog)] }),
        cold_archived_at: STAMP,
      })
    })
  })
}

describe('AC2/AC11 — round-trip completo (T-09)', () => {
  it('export-import-export-mesmo-conteudo: ativos, arquivados, arquivo morto e histórico', () => {
    withDb((dbPath) => {
      richSeed(dbPath)
      const first = join(dirname(dbPath), 'a.json')
      const second = join(dirname(dbPath), 'b.json')
      const target = join(dirname(dbPath), 'target.db')

      expect(runStudy(['export', first, '--db', dbPath, '--json']).status).toBe(0)
      expect(runStudy(['import', first, '--db', target, '--json']).status).toBe(0)
      expect(runStudy(['export', second, '--db', target, '--json']).status).toBe(0)

      expect(withoutExportedAt(second)).toEqual(withoutExportedAt(first))
    })
  })

  it('round-trip-preserva-cold: o item cold volta com o histórico e o snapshot', () => {
    withDb((dbPath) => {
      richSeed(dbPath)
      const dump = join(dirname(dbPath), 'a.json')
      const target = join(dirname(dbPath), 'target.db')

      runStudy(['export', dump, '--db', dbPath, '--json'])
      const result = runStudy(['import', dump, '--db', target, '--json'])

      expect(result.status).toBe(0)
      const cold = withStore(target, (store) => store.getItem('cold-1'))
      expect(cold).not.toBeNull()
      expect(cold?.status).toBe('cold')
      expect(cold?.cold_archived_at).toBe(STAMP)
      expect(withStore(target, (store) => store.listReviewLogs('cold-1'))).toHaveLength(1)
    })
  })
})

describe('AC3/CA-11 — import é idempotente (T-10)', () => {
  it('import-duas-vezes-nao-duplica: a segunda rodada escreve zero', () => {
    withDb((dbPath) => {
      richSeed(dbPath)
      const dump = join(dirname(dbPath), 'a.json')
      const target = join(dirname(dbPath), 'target.db')
      runStudy(['export', dump, '--db', dbPath, '--json'])

      const first = runStudy(['import', dump, '--db', target, '--json'])
      const second = runStudy(['import', dump, '--db', target, '--json'])

      expect(jsonOf(first).import).toEqual({
        path: dump,
        items: 3,
        review_logs: 2,
        cold_archive: 1,
        written: 6,
        skipped: 0,
      })
      expect(first.status).toBe(0)
      expect(second.status).toBe(0)
      expect(jsonOf(second).import).toMatchObject({ written: 0, skipped: 6 })
      expect(withStore(target, (store) => store.listItems())).toHaveLength(3)
      expect(withStore(target, (store) => store.listReviewLogs())).toHaveLength(2)
    })
  })

  it('import-humano-linha: sem --json a linha conta itens e check-ins', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()], logs: [makeLog()] })
      const dump = join(dirname(dbPath), 'a.json')
      runStudy(['export', dump, '--db', dbPath, '--json'])
      const target = join(dirname(dbPath), 'target.db')

      const result = runStudy(['import', dump, '--db', target])

      expect(result.stdout).toBe('Import: 1 itens, 1 check-ins\n')
    })
  })

  it('import-id-repetido-no-arquivo: dois logs com o mesmo id viram uma linha só', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'i-1' })
      const log = makeLog({ id: 'l-1', item_id: 'i-1' })
      const dump = writeDump(dbPath, 'dup.json', {
        ...dumpWith([item], [log]),
        review_logs: [
          toReviewLogJson(log),
          toReviewLogJson({ ...log, reviewed_at: '2026-09-07T22:10:00Z' }),
        ],
      })
      const target = join(dirname(dbPath), 'target.db')

      const result = runStudy(['import', dump, '--db', target, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result).import).toMatchObject({ review_logs: 1, written: 2, skipped: 1 })
      expect(withStore(target, (store) => store.listReviewLogs())).toHaveLength(1)
    })
  })
})

describe('AC4 — conflito de UUID resolvido pelo updated_at', () => {
  it('conflito-updated-at-mais-novo-vence: os dois sentidos', () => {
    withDb((dbPath) => {
      const local = makeItem({ id: 'i-1', title: 'Banco', updated_at: '2026-09-01T10:00:00Z' })
      const newer = makeItem({ id: 'i-1', title: 'Arquivo', updated_at: '2026-09-02T10:00:00Z' })
      const older = makeItem({ id: 'i-1', title: 'Antigo', updated_at: '2026-08-30T10:00:00Z' })
      seed(dbPath, { items: [local] })

      const forward = writeDump(dbPath, 'forward.json', dumpWith([newer]))
      const first = runStudy(['import', forward, '--db', dbPath, '--json'])
      expect(first.status).toBe(0)
      expect(jsonOf(first).import).toMatchObject({ written: 1, skipped: 0 })
      expect(withStore(dbPath, (store) => store.getItem('i-1'))?.title).toBe('Arquivo')

      const backward = writeDump(dbPath, 'backward.json', dumpWith([older]))
      const second = runStudy(['import', backward, '--db', dbPath, '--json'])
      expect(jsonOf(second).import).toMatchObject({ written: 0, skipped: 1 })
      expect(withStore(dbPath, (store) => store.getItem('i-1'))?.title).toBe('Arquivo')
    })
  })

  it('conflito-empate-mantem-local: updated_at igual não toca no banco', () => {
    withDb((dbPath) => {
      const sameStamp = '2026-09-02T10:00:00Z'
      seed(dbPath, { items: [makeItem({ id: 'i-1', title: 'Banco', updated_at: sameStamp })] })
      const dump = writeDump(
        dbPath,
        'tie.json',
        dumpWith([makeItem({ id: 'i-1', title: 'Arquivo', updated_at: sameStamp })]),
      )

      const first = runStudy(['import', dump, '--db', dbPath, '--json'])
      const second = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(jsonOf(first).import).toMatchObject({ written: 0, skipped: 1 })
      expect(jsonOf(second).import).toMatchObject({ written: 0, skipped: 1 })
      expect(withStore(dbPath, (store) => store.getItem('i-1'))?.title).toBe('Banco')
    })
  })

  it('conflito-comparacao-por-data: +00:00 decide pelo instante, não pela string', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'i-1', title: 'Banco', updated_at: '2026-09-06T22:10:00Z' })] })
      const dump = writeDump(
        dbPath,
        'offset.json',
        dumpWith([
          makeItem({ id: 'i-1', title: 'Arquivo', updated_at: '2026-09-06T22:10:30+00:00' }),
        ]),
      )

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(jsonOf(result).import).toMatchObject({ written: 1 })
      expect(withStore(dbPath, (store) => store.getItem('i-1'))?.title).toBe('Arquivo')
    })
  })
})

describe('AC5/AC6 — a versão do schema decide o que entra', () => {
  it('schema-futuro-rejeitado: v2 sai 2 com o banco intacto', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'local-1' })] })
      const dump = writeDump(dbPath, 'futuro.json', {
        ...dumpWith([makeItem({ id: 'i-1' })]),
        schema_version: 2,
      })

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'unsupported-schema',
        message: 'schema_version 2 não suportado',
      })
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.id)).toEqual(['local-1'])
    })
  })

  it('schema-version-igual-aceita: v1 passa pela escada e importa', () => {
    withDb((dbPath) => {
      const dump = writeDump(dbPath, 'v1.json', dumpWith([makeItem({ id: 'i-1' })]))
      const target = join(dirname(dbPath), 'target.db')

      const result = runStudy(['import', dump, '--db', target, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result).import).toMatchObject({ items: 1, written: 1 })
    })
  })

  it('schema-version-ausente-invalido: ausente, string e float são arquivo inválido', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'local-1' })] })
      const cases: unknown[] = [
        { ...dumpWith([]), schema_version: undefined },
        { ...dumpWith([]), schema_version: '1' },
        { ...dumpWith([]), schema_version: 1.5 },
      ]

      for (const [index, value] of cases.entries()) {
        const dump = writeDump(dbPath, `invalido-${index}.json`, value)
        const result = runStudy(['import', dump, '--db', dbPath, '--json'])

        expect(result.status, `caso ${index}`).toBe(2)
        expect(errorOf(result)).toEqual({
          code: 'invalid-value',
          message: `arquivo inválido: ${dump}`,
        })
      }
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.id)).toEqual(['local-1'])
    })
  })
})

describe('AC9/AC10 — import é aditivo e nunca escreve com arquivo fora do contrato', () => {
  it('import-aditivo-nao-apaga-local: o que só existe no banco sobrevive', () => {
    withDb((dbPath) => {
      const localOnly = makeItem({ id: 'local-1', title: 'Só no banco' })
      const shared = makeItem({ id: 'shared-1', title: 'Banco', updated_at: '2026-09-09T10:00:00Z' })
      const localLog = makeLog({ id: 'log-1', item_id: 'shared-1', interval_after: 6 })
      seed(dbPath, { items: [localOnly, shared], logs: [localLog] })

      const dump = writeDump(
        dbPath,
        'aditivo.json',
        dumpWith(
          [
            makeItem({ id: 'shared-1', title: 'Arquivo', updated_at: '2026-09-08T10:00:00Z' }),
            makeItem({ id: 'file-1', title: 'Só no arquivo' }),
          ],
          [{ ...localLog, interval_after: 99 }],
        ),
      )

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(withStore(dbPath, (store) => store.getItem('local-1'))).not.toBeNull()
      expect(withStore(dbPath, (store) => store.getItem('shared-1'))?.title).toBe('Banco')
      expect(withStore(dbPath, (store) => store.getItem('file-1'))?.title).toBe('Só no arquivo')
      expect(withStore(dbPath, (store) => store.listReviewLogs('shared-1'))[0]?.interval_after).toBe(6)
    })
  })

  it('import-nada-escrito-quando-arquivo-invalido: review_log órfão recusa o arquivo inteiro', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'local-1' })] })
      const orphan = makeLog({ id: 'log-1', item_id: 'nao-existe' })
      const dump = writeDump(dbPath, 'orfao.json', dumpWith([makeItem({ id: 'i-1' })], [orphan]))

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-value',
        message: `arquivo inválido: ${dump}`,
      })
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.id)).toEqual(['local-1'])
      expect(withStore(dbPath, (store) => store.listReviewLogs())).toEqual([])
    })
  })

  it('import-arquivo-inexistente: sai 3 com arquivo não encontrado', () => {
    withDb((dbPath) => {
      seed(dbPath, {})
      const missing = join(dirname(dbPath), 'nao-existe.json')

      const result = runStudy(['import', missing, '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'invalid-state',
        message: `arquivo não encontrado: ${missing}`,
      })
    })
  })

  it('import-json-malformado: sai 2 com arquivo inválido', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'local-1' })] })
      const dump = writeDump(dbPath, 'malformado.json', '{ nao é json')

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-value',
        message: `arquivo inválido: ${dump}`,
      })
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.id)).toEqual(['local-1'])
    })
  })
})

describe('AC11/AC12 — cold_archive reconstruído e as isenções do contexto', () => {
  it('import-reconstroi-cold-archive: a linha volta com {item, review_logs} e o cold restore funciona', () => {
    withDb((dbPath) => {
      const cold = makeItem({
        id: 'cold-1',
        status: 'cold',
        cold_archived_at: STAMP,
        review_count: 1,
      })
      const log = makeLog({ id: 'log-1', item_id: 'cold-1' })
      const dump = writeDump(dbPath, 'cold.json', dumpWith([cold], [log], [coldEntry(cold, [log])]))
      const target = join(dirname(dbPath), 'target.db')

      const result = runStudy(['import', dump, '--db', target, '--json'])

      expect(result.status).toBe(0)
      const entries = withStore(target, (store) => store.listColdArchive())
      expect(entries).toEqual([
        {
          id: 'cold-1',
          payload: JSON.stringify({ item: toItemJson(cold), review_logs: [toReviewLogJson(log)] }),
          cold_archived_at: STAMP,
        },
      ])

      const restored = runStudy(['cold', 'restore', 'cold-1', '--db', target, '--json'])
      expect(restored.status).toBe(0)
      expect(withStore(target, (store) => store.getItem('cold-1'))?.status).toBe('active')
    })
  })

  it('import-respeita-portao-de-schema: destino v2 sai 2 antes de qualquer escrita', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'local-1' })] })
      withStore(dbPath, (store) => store.setMeta('schema_version', '2'))
      const dump = writeDump(dbPath, 'v1.json', dumpWith([makeItem({ id: 'i-1' })]))

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'unsupported-schema',
        message: 'schema_version 2 não suportado',
      })
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.id)).toEqual(['local-1'])
    })
  })

  it('import-fora-do-gancho-de-migracao: nada migra e nenhum export automático é escrito', () => {
    const oldArchive = `${addDays(todayLocalDate(), -400)}T12:00:00Z`
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'old-1', status: 'archived', archived_at: oldArchive })] })
      const dump = writeDump(dbPath, 'v1.json', dumpWith([makeItem({ id: 'i-1' })]))

      const result = runStudy(['import', dump, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(result.stderr).toBe('')
      expect(existsSync(join(dirname(dbPath), 'exports'))).toBe(false)
      expect(withStore(dbPath, (store) => store.countItems('cold'))).toBe(0)
      expect(withStore(dbPath, (store) => store.listColdArchive())).toEqual([])
    })
  })

  it('import-banco-vazio: importar um dump vazio é sucesso com zero escritos', () => {
    withDb((dbPath) => {
      const dump = writeDump(dbPath, 'vazio.json', emptyDump())
      const target = join(dirname(dbPath), 'target.db')

      const result = runStudy(['import', dump, '--db', target, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result).import).toMatchObject({ written: 0, skipped: 0 })
    })
  })

  it('import-recusa-flag: --yes não existe em import', () => {
    withDb((dbPath) => {
      const dump = writeDump(dbPath, 'v1.json', emptyDump())
      seed(dbPath, {})

      const result = runStudy(['import', dump, '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })
})
