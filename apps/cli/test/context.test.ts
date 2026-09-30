import { writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type Deps, addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { openContext, resolveDbPath, runEntryHooks, withContext } from '../src/context.ts'
import { openStore } from '../src/persistence/index.ts'
import { makeItem } from './persistence/helpers.ts'
import { withDb } from './persistence/helpers/db.ts'
import { todayLocalDate, withStore } from './commands/helpers.ts'

const TODAY = '2026-09-20'

function fixedDeps(): Deps {
  return {
    clock: { nowUtc: () => `${TODAY}T12:00:00Z`, todayLocalDate: () => TODAY },
    ids: () => 'generated-id',
  }
}

function openOptions(dbPath: string, overrides: Partial<Parameters<typeof openContext>[0]> = {}) {
  return {
    dbPath,
    exportDir: undefined,
    deps: fixedDeps(),
    skipSchemaGate: false,
    skipMigrationHook: false,
    skipStreakHook: false,
    ...overrides,
  }
}

describe('context — caminho do banco', () => {
  it('db-padrao-darwin: sem --db e sem STUDY_DB, o macOS usa Application Support', () => {
    expect(resolveDbPath(undefined, {}, 'darwin')).toBe(
      join(homedir(), 'Library', 'Application Support', 'study-app', 'study.db'),
    )
  })

  it('db-precedencia: --db vence STUDY_DB, que vence o padrão por plataforma', () => {
    const env = { STUDY_DB: '/tmp/env.db', XDG_DATA_HOME: '/tmp/xdg' }

    expect(resolveDbPath('/tmp/explicit.db', env, 'linux')).toBe('/tmp/explicit.db')
    expect(resolveDbPath(undefined, env, 'linux')).toBe('/tmp/env.db')
    expect(resolveDbPath(undefined, { XDG_DATA_HOME: '/tmp/xdg' }, 'linux')).toBe(
      '/tmp/xdg/study-app/study.db',
    )
  })
})

describe('AC7 — a porta de abertura do contexto', () => {
  it('context-openContext-abre-com-ganchos: devolve a abertura com os ganchos de entrada rodados', () => {
    withDb((dbPath) => {
      withStore(dbPath, (store) => {
        store.saveItem(
          makeItem({
            id: 'a-1',
            status: 'archived',
            archived_at: `${addDays(TODAY, -181)}T12:00:00Z`,
          }),
        )
      })

      const opened = openContext(openOptions(dbPath))
      try {
        expect(opened.dbPath).toBe(dbPath)
        expect(opened.dbExisted).toBe(true)
        expect(opened.deps).toBeDefined()
        expect(opened.exportDir).toBeNull()
        expect(opened.migrationLine).not.toBeNull()
        expect(opened.store.getItem('a-1')?.status).toBe('cold')
        expect(opened.store.getMeta('streak_current')).toBe('1')
      } finally {
        opened.close()
      }
    })
  })

  it('context-openContext-recusa-schema: schema fora e banco corrompido saem pela porta, sem vazar o store', () => {
    withDb((schemaPath) => {
      const store = openStore(schemaPath)
      store.setMeta('schema_version', '2')
      store.close()

      expect(() => openContext(openOptions(schemaPath))).toThrowError(
        expect.objectContaining({ code: 'unsupported-schema' }),
      )
      const reopened = openStore(schemaPath)
      reopened.close()
    })

    withDb((corruptPath) => {
      openStore(corruptPath).close()
      writeFileSync(corruptPath, 'não é um banco sqlite')

      expect(() => openContext(openOptions(corruptPath))).toThrowError(
        expect.objectContaining({ code: 'invalid-state' }),
      )
    })
  })

  it('context-runEntryHooks-migra-e-carimba: migra o arquivo morto e rola o streak, devolvendo a linha', () => {
    withDb((dbPath) => {
      withStore(dbPath, (store) => {
        store.saveItem(
          makeItem({
            id: 'a-1',
            status: 'archived',
            archived_at: `${addDays(TODAY, -181)}T12:00:00Z`,
          }),
        )

        const line = runEntryHooks(
          { store, deps: fixedDeps(), exportDir: null, dbPath },
          TODAY,
        )

        expect(line).not.toBeNull()
        expect(store.getItem('a-1')?.status).toBe('cold')
        expect(store.getMeta('streak_current')).toBe('1')
      })
    })
  })

  it('context-withContext-preserva-a-ordem: entrada → run → streak de saída → close, com as isenções', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      withStore(dbPath, (store) => {
        store.setMeta('streak_current', '4')
        store.setMeta('streak_last_day', addDays(today, -1))
      })

      let insideCurrent: string | null = null
      withContext(
        {
          dbPath,
          json: false,
          noInput: true,
          exportDir: undefined,
          skipSchemaGate: false,
          skipMigrationHook: false,
          skipStreakHook: false,
        },
        (ctx) => {
          insideCurrent = ctx.store.getMeta('streak_current')
          ctx.store.saveItem(makeItem({ id: 'due-1', due_date: today }))
        },
      )

      expect(insideCurrent).toBe('5')
      withStore(dbPath, (store) => {
        expect(store.getMeta('streak_current')).toBe('0')
      })

      withContext(
        {
          dbPath,
          json: false,
          noInput: true,
          exportDir: undefined,
          skipSchemaGate: false,
          skipMigrationHook: true,
          skipStreakHook: true,
        },
        (ctx) => {
          expect(ctx.store.getMeta('streak_current')).toBe('0')
        },
      )
    })
  })

  it('context-close-idempotente: fechar duas vezes é seguro', () => {
    withDb((dbPath) => {
      const opened = openContext(openOptions(dbPath))
      opened.close()
      expect(() => opened.close()).not.toThrow()
    })
  })
})
