import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, jsonOf, runStudy, seed, todayLocalDate, withStore } from './helpers.ts'

const TOP_LEVEL_KEYS = [
  'cold_archive',
  'exported_at',
  'items',
  'meta',
  'review_logs',
  'schema_version',
]

function dumpOf(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

describe('AC1 — export escreve o contrato JSON v1 (RF-18)', () => {
  it('export-cria-arquivo-com-seis-chaves: banco com item e log vira um único JSON', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()], logs: [makeLog()] })
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      const dump = dumpOf(out)
      expect(Object.keys(dump).sort()).toEqual(TOP_LEVEL_KEYS)
      expect(dump.schema_version).toBe(1)
      expect(dump.exported_at).toEqual(expect.any(String))
      expect(dump.items).toHaveLength(1)
      expect(dump.review_logs).toHaveLength(1)
      expect(dump.cold_archive).toEqual([])
      expect(jsonOf(result).export).toEqual({
        path: out,
        items: 1,
        review_logs: 1,
        cold_archive: 0,
      })
    })
  })

  it('export-humano-linha: sem --json a linha é Export: <path>', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath])

      expect(result.status).toBe(0)
      expect(result.stdout).toBe(`Export: ${out}\n`)
    })
  })

  it('export-banco-vazio: as três coleções saem vazias', () => {
    withDb((dbPath) => {
      seed(dbPath, {})
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      const dump = dumpOf(out)
      expect(dump.items).toEqual([])
      expect(dump.review_logs).toEqual([])
      expect(dump.cold_archive).toEqual([])
    })
  })

  it('export-cria-diretorio-pai: um caminho aninhado é criado pelo writer', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      const out = join(dirname(dbPath), 'nested', 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(existsSync(out)).toBe(true)
    })
  })
})

describe('AC8 — export sobre arquivo existente exige --yes', () => {
  it('export-sobre-arquivo-existente-sem-yes: sai 1 e não encosta no destino', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      const out = join(dirname(dbPath), 'backup.json')
      writeFileSync(out, 'conteúdo anterior')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({
        code: 'usage',
        message: 'arquivo já existe; use --yes para sobrescrever',
      })
      expect(readFileSync(out, 'utf8')).toBe('conteúdo anterior')
    })
  })

  it('export-sobre-arquivo-existente-com-yes: sobrescreve o destino', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      const out = join(dirname(dbPath), 'backup.json')
      writeFileSync(out, 'conteúdo anterior')

      const result = runStudy(['export', out, '--db', dbPath, '--yes', '--json'])

      expect(result.status).toBe(0)
      const dump = dumpOf(out)
      expect(dump.items).toHaveLength(1)
      expect(existsSync(`${out}.tmp`)).toBe(false)
    })
  })
})

describe('AC7 — export continua possível quando o banco está fora do contrato (RNF-07)', () => {
  it('export-com-schema-diferente: schema_version 2 no banco ainda exporta', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      withStore(dbPath, (store) => store.setMeta('schema_version', '2'))
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result).export).toMatchObject({ items: 1 })
    })
  })

  it('export-nao-dispara-gancho: nada migra e nenhum export automático é escrito', () => {
    const oldArchive = `${addDays(todayLocalDate(), -400)}T12:00:00Z`
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ status: 'archived', archived_at: oldArchive })] })
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(result.stderr).toBe('')
      expect(existsSync(join(dirname(dbPath), 'exports'))).toBe(false)
      const dump = dumpOf(out)
      expect((dump.items as Array<Record<string, unknown>>)[0]?.status).toBe('archived')
      expect(dump.cold_archive).toEqual([])
      expect(withStore(dbPath, (store) => store.countItems('cold'))).toBe(0)
    })
  })

  it('banco-corrompido: arquivo que não abre como SQLite sai 3 em qualquer comando', () => {
    withDb((dbPath) => {
      writeFileSync(dbPath, 'isto não é um banco SQLite')
      const out = join(dirname(dbPath), 'backup.json')

      const exported = runStudy(['export', out, '--db', dbPath, '--json'])
      const listed = runStudy(['list', '--db', dbPath, '--json'])

      for (const result of [exported, listed]) {
        expect(result.status).toBe(3)
        expect(errorOf(result)).toEqual({
          code: 'invalid-state',
          message: `banco corrompido: ${dbPath}`,
        })
      }
      expect(existsSync(out)).toBe(false)
    })
  })
})

describe('AC1 — export recusa flag e aridade fora do contrato', () => {
  it('export-sem-caminho: sai 1 pedindo um argumento', () => {
    withDb((dbPath) => {
      seed(dbPath, {})

      const result = runStudy(['export', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({
        code: 'usage',
        message: 'study export exige 1 argumento(s)',
      })
    })
  })

  it('export-com-flag-desconhecida: --reset não existe em export', () => {
    withDb((dbPath) => {
      seed(dbPath, {})
      const out = join(dirname(dbPath), 'backup.json')

      const result = runStudy(['export', out, '--reset', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({
        code: 'usage',
        message: 'flag --reset não existe em study export',
      })
    })
  })
})
