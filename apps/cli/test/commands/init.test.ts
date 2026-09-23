import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, jsonOf, runStudy, seed, withStore } from './helpers.ts'

const BACKUP_PATTERN = /^pre-reset-\d{8}T\d{6}Z\.json$/

describe('AC1 — init cria e recria com backup (T-24)', () => {
  it('init-banco-novo: cria o banco e o schema num caminho novo', () => {
    withDb((dbPath) => {
      const result = runStudy(['init', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result)).toMatchObject({
        schema_version: 1,
        init: { action: 'created', db_path: dbPath },
      })
      expect(existsSync(dbPath)).toBe(true)
      expect(withStore(dbPath, (store) => store.schemaVersion())).toBe(1)
    })
  })

  it('init-banco-existente-sem-flags: sai 1 sem prompt e mantém o banco', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['init', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
      expect(result.stderr).not.toContain('Dificuldade')
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('init-reset-sem-yes: --reset sozinho sai 1 e mantém o banco', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['init', '--reset', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('init-reset-com-yes: exporta o backup antes de recriar vazio', () => {
    withDb((dbPath) => {
      const item = makeItem({ title: 'Derivadas parciais' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['init', '--reset', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      const backupDir = join(dirname(dbPath), 'backups')
      const backups = readdirSync(backupDir).filter((name) => BACKUP_PATTERN.test(name))
      expect(backups).toHaveLength(1)
      const dump = JSON.parse(readFileSync(join(backupDir, backups[0] ?? ''), 'utf8')) as {
        schema_version: number
        items: Array<{ id: string }>
      }
      expect(dump.schema_version).toBe(1)
      expect(dump.items.map((entry) => entry.id)).toEqual([item.id])
      expect(withStore(dbPath, (store) => store.listItems())).toEqual([])
    })
  })

  it('init-backup-falho: sai 3 com o banco intacto', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })
      writeFileSync(join(dirname(dbPath), 'backups'), 'bloqueio')

      const result = runStudy(['init', '--reset', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'backup-failed',
        message: 'backup falhou; banco não foi alterado',
      })
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('init-reset-remove-wal-e-shm: os arquivos obsoletos somem na recriação', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })
      writeFileSync(`${dbPath}-wal`, '')
      writeFileSync(`${dbPath}-shm`, '')

      const result = runStudy(['init', '--reset', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(existsSync(`${dbPath}-wal`)).toBe(false)
      expect(existsSync(`${dbPath}-shm`)).toBe(false)
      expect(withStore(dbPath, (store) => store.listItems())).toEqual([])
    })
  })
})

describe('AC1 — init recusa o backup que não serializa', () => {
  it('init-backup-invalido: dump corrompido também sai 3 sem tocar no banco', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })
      withStore(dbPath, (store) =>
        store.saveColdArchive({
          id: 'cold-1',
          payload: 'nao-e-json',
          cold_archived_at: '2026-09-01T00:00:00Z',
        }),
      )

      const result = runStudy(['init', '--reset', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'backup-failed',
        message: 'backup falhou; banco não foi alterado',
      })
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })
})
