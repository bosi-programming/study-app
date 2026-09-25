import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { errorOf, itemsOf, jsonOf, runStudy, seed, todayLocalDate } from './commands/helpers.ts'
import { makeItem, makeLog } from './persistence/helpers.ts'
import { withDb } from './persistence/helpers/db.ts'

const repoRoot = resolve(import.meta.dirname, '../../..')
const binPath = resolve(repoRoot, 'node_modules/.bin/study')
const ITEM_ID = '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60'

const EMPTY_DUMP = {
  schema_version: 1,
  exported_at: '2026-09-23T12:00:00Z',
  meta: {},
  items: [],
  review_logs: [],
  cold_archive: [],
}

type EnvelopeCase = {
  readonly command: string
  readonly argv: (dbPath: string) => readonly string[]
  readonly seed?: (dbPath: string) => void
}

const ENVELOPE_CASES: readonly EnvelopeCase[] = [
  { command: 'init', argv: (dbPath) => ['init', '--db', dbPath] },
  { command: 'add', argv: (dbPath) => ['add', 'Título', '-s', 'Matéria', '-d', '4', '--db', dbPath] },
  { command: 'list', argv: (dbPath) => ['list', '--db', dbPath] },
  { command: 'find', argv: (dbPath) => ['find', 'título', '--db', dbPath] },
  { command: 'due', argv: (dbPath) => ['due', '--db', dbPath] },
  { command: 'review', argv: (dbPath) => ['review', '2f1c9c1e', '-d', '4', '--db', dbPath] },
  { command: 'show', argv: (dbPath) => ['show', '2f1c9c1e', '--db', dbPath] },
  { command: 'edit', argv: (dbPath) => ['edit', '2f1c9c1e', '-d', '3', '--db', dbPath] },
  { command: 'difficulty', argv: (dbPath) => ['difficulty', '2f1c9c1e', '2', '--db', dbPath] },
  { command: 'remove', argv: (dbPath) => ['remove', '2f1c9c1e', '--yes', '--db', dbPath] },
  { command: 'archive', argv: (dbPath) => ['archive', '2f1c9c1e', '--db', dbPath] },
  {
    command: 'unarchive',
    argv: (dbPath) => ['unarchive', '2f1c9c1e', '--db', dbPath],
    seed: (dbPath) => seed(dbPath, { items: [makeItem({ status: 'archived' })] }),
  },
  { command: 'cold', argv: (dbPath) => ['cold', 'list', '--db', dbPath] },
  {
    command: 'config',
    argv: (dbPath) => ['config', 'get', 'cold_archive_after_days', '--db', dbPath],
  },
  { command: 'stats', argv: (dbPath) => ['stats', '--db', dbPath] },
  {
    command: 'export',
    argv: (dbPath) => ['export', join(dirname(dbPath), 'export.json'), '--db', dbPath],
  },
  {
    command: 'import',
    argv: (dbPath) => {
      const dumpPath = join(dirname(dbPath), 'import.json')
      writeFileSync(dumpPath, JSON.stringify(EMPTY_DUMP))
      return ['import', dumpPath, '--db', dbPath]
    },
  },
]

const PAYLOAD_SHAPES: Record<string, readonly string[]> = {
  init: ['action', 'db_path'],
  add: ['item'],
  list: ['items'],
  find: ['items'],
  due: ['by_subject', 'date', 'overdue', 'today'],
  review: ['item'],
  show: ['item'],
  edit: ['item'],
  difficulty: ['item'],
  remove: ['item', 'removed'],
  archive: ['action', 'item'],
  unarchive: ['action', 'item'],
  cold: ['action', 'items'],
  config: ['action', 'key', 'value'],
  stats: ['checkins_by_subject', 'checkins_today', 'date', 'items', 'streak'],
  export: ['cold_archive', 'items', 'path', 'review_logs'],
  import: ['cold_archive', 'items', 'path', 'review_logs', 'skipped', 'written'],
}

function seedCase(entry: EnvelopeCase, dbPath: string): void {
  if (entry.command === 'init') return
  if (entry.seed === undefined) {
    seed(dbPath, { items: [makeItem()] })
    return
  }
  entry.seed(dbPath)
}

describe('S-06/S-07 cli bin', () => {
  it('bin-roda-fora-do-repo: o bin existe e roda de um cwd qualquer', () => {
    expect(existsSync(binPath)).toBe(true)

    const result = runStudy(['--help'], { cwd: '/tmp' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Uso:')
  })
})

describe('apoio — uso, dispatch e banco', () => {
  it('sem-comando-humano-uso: study sozinho imprime o uso no stderr e sai 1, sem envelope', () => {
    const result = runStudy([])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Uso:')
    expect(() => JSON.parse(result.stderr)).toThrow()
  })

  it('help-stdout: --help e -h imprimem o uso no stdout e saem 0', () => {
    for (const flag of ['--help', '-h']) {
      const result = runStudy([flag])

      expect(result.status, flag).toBe(0)
      expect(result.stdout, flag).toContain('Uso:')
      expect(result.stderr, flag).toBe('')
    }
  })

  it('comando-desconhecido: sai 1', () => {
    const result = runStudy(['bogus'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('comando desconhecido')
  })

  it('usage-lista-os-tres: o USAGE traz due, review e difficulty', () => {
    const stdout = runStudy(['--help']).stdout

    expect(stdout).toMatch(/\bdue\b/)
    expect(stdout).toContain('review <ref>')
    expect(stdout).toContain('difficulty <ref> <1-5>')
  })

  it('flag-desconhecida: sai 1', () => {
    const result = runStudy(['list', '--nope'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('flag desconhecida')
  })

  it('db-study_db-e-precedencia: STUDY_DB funciona e --db vence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'study-cli-db-'))
    try {
      const envPath = join(dir, 'env.db')
      const flagPath = join(dir, 'flag.db')
      seed(envPath, { items: [makeItem({ id: 'env', title: 'Do env' })] })
      seed(flagPath, { items: [makeItem({ id: 'flag', title: 'Da flag' })] })

      const fromEnv = runStudy(['list', '--json'], { env: { STUDY_DB: envPath } })
      const fromFlag = runStudy(['list', '--json', '--db', flagPath], {
        env: { STUDY_DB: envPath },
      })

      expect(itemsOf(fromEnv, 'list').map((item) => item.id)).toEqual(['env'])
      expect(itemsOf(fromFlag, 'list').map((item) => item.id)).toEqual(['flag'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('AC1 — o envelope --json', () => {
  it('envelope-dezessete: {schema_version: 1, <palavra>: ...} nas dezessete palavras', () => {
    expect(ENVELOPE_CASES).toHaveLength(17)

    for (const entry of ENVELOPE_CASES) {
      withDb((dbPath) => {
        seedCase(entry, dbPath)

        const result = runStudy([...entry.argv(dbPath), '--json'])
        const json = jsonOf(result)

        expect(result.status, entry.command).toBe(0)
        expect(Object.keys(json), entry.command).toEqual(['schema_version', entry.command])
        expect(json['schema_version'], entry.command).toBe(1)
      })
    }
  })

  it('envelope-stdout-um-objeto: o stdout tem um objeto JSON e nenhuma linha extra', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.stdout.trim().split('\n')).toHaveLength(1)
      expect(jsonOf(result)).toEqual({ schema_version: 1, list: { items: expect.any(Array) } })
    })
  })

  it('envelope-subcomando-raiz-action: cold e config usam a palavra como raiz, não o par', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const cold = jsonOf(runStudy(['cold', 'list', '--db', dbPath, '--json']))
      const config = jsonOf(
        runStudy(['config', 'get', 'cold_archive_after_days', '--db', dbPath, '--json']),
      )

      expect(Object.keys(cold)).toEqual(['schema_version', 'cold'])
      expect((cold['cold'] as Record<string, unknown>)['action']).toBe('list')
      expect(Object.keys(config)).toEqual(['schema_version', 'config'])
      expect((config['config'] as Record<string, unknown>)['action']).toBe('get')
      expect(cold).not.toHaveProperty('cold list')
    })
  })

  it('envelope-forma-por-comando: as chaves do payload batem palavra a palavra', () => {
    for (const entry of ENVELOPE_CASES) {
      withDb((dbPath) => {
        seedCase(entry, dbPath)

        const payload = jsonOf(runStudy([...entry.argv(dbPath), '--json']))[entry.command] as Record<
          string,
          unknown
        >

        expect(Object.keys(payload).sort(), entry.command).toEqual(PAYLOAD_SHAPES[entry.command])
      })
    }
  })

  it('envelope-export-contagens: export traz as contagens do arquivo', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'a' }), makeItem({ id: 'b' })],
        logs: [makeLog({ item_id: 'a' })],
      })
      const dumpPath = join(dirname(dbPath), 'export.json')

      const payload = jsonOf(runStudy(['export', dumpPath, '--db', dbPath, '--json']))[
        'export'
      ] as Record<string, unknown>

      expect(payload).toEqual({
        path: dumpPath,
        items: 2,
        review_logs: 1,
        cold_archive: 0,
      })
    })
  })

  it('envelope-import-written-skipped: written e skipped, e a segunda rodada escreve 0', () => {
    withDb((fromPath) => {
      withDb((toPath) => {
        seed(fromPath, { items: [makeItem()] })
        const dumpPath = join(dirname(fromPath), 'backup.json')
        runStudy(['export', dumpPath, '--db', fromPath, '--json'])

        const first = jsonOf(runStudy(['import', dumpPath, '--db', toPath, '--json']))[
          'import'
        ] as Record<string, unknown>
        const second = jsonOf(runStudy(['import', dumpPath, '--db', toPath, '--json']))[
          'import'
        ] as Record<string, unknown>

        expect(first).toMatchObject({ written: 1, skipped: 0 })
        expect(second).toMatchObject({ written: 0, skipped: 1 })
      })
    })
  })
})

describe('AC2 — o erro no envelope', () => {
  it('erro-stderr-envelope: {"error":{"code","message"}} no stderr, stdout vazio', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['show', '9f9f9f9f', '--db', dbPath, '--json'])
      const parsed = JSON.parse(result.stderr) as Record<string, unknown>

      expect(result.status).toBe(3)
      expect(result.stdout).toBe('')
      expect(Object.keys(parsed)).toEqual(['error'])
      expect(Object.keys(parsed['error'] as Record<string, unknown>)).toEqual(['code', 'message'])
      expect(errorOf(result)).toEqual({
        code: 'not-found',
        message: 'item não encontrado: 9f9f9f9f',
      })
    })
  })

  it('erro-ambiguo-candidatos: uma linha por candidato com id8, matéria e vencimento', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: ITEM_ID, title: 'Duplicado' }),
          makeItem({ id: 'bbbb2222-0000-0000-0000-000000000000', title: 'Duplicado' }),
        ],
      })

      const result = runStudy(['show', 'Duplicado', '--db', dbPath, '--json'])
      const message = errorOf(result).message

      expect(result.status).toBe(3)
      expect(errorOf(result).code).toBe('ambiguous-ref')
      expect(message.split('\n')).toHaveLength(3)
      expect(message).toContain('2f1c9c1e [Cálculo] vence 2026-09-12')
      expect(message).toContain('bbbb2222 [Cálculo] vence 2026-09-12')
    })
  })

  it('erro-migracao-omite-aviso: com --json o stderr fica só com o envelope do erro', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({
            id: 'a',
            status: 'archived',
            archived_at: `${addDays(todayLocalDate(), -181)}T12:00:00Z`,
          }),
        ],
      })

      const result = runStudy(['show', '9f9f9f9f', '--db', dbPath, '--json'])
      const parsed = JSON.parse(result.stderr) as { error: { code: string } }

      expect(result.status).toBe(3)
      expect(parsed.error.code).toBe('not-found')
      expect(result.stderr).not.toContain('migrados')
    })
  })

  it('erro-sem-json-mensagem: sem --json o stderr traz só a mensagem', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['show', '9f9f9f9f', '--db', dbPath])

      expect(result.status).toBe(3)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('item não encontrado: 9f9f9f9f\n')
    })
  })
})

describe('AC3 — exit codes', () => {
  it('exit-sucesso-zero: comando que passa sai 0', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      expect(runStudy(['list', '--db', dbPath, '--json']).status).toBe(0)
    })
  })

  it('exit-uso-um: flag desconhecida e confirmação ausente saem 1', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      expect(runStudy(['list', '--nope', '--db', dbPath, '--json']).status).toBe(1)
      expect(runStudy(['remove', '2f1c9c1e', '--db', dbPath, '--json']).status).toBe(1)
    })
  })

  it('exit-validacao-dois: valor fora do domínio sai 2', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      expect(runStudy(['list', '--status', 'bogus', '--db', dbPath, '--json']).status).toBe(2)
    })
  })

  it('exit-estado-tres: estado ou ambiente impede a operação e sai 3', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      expect(runStudy(['show', '9f9f9f9f', '--db', dbPath, '--json']).status).toBe(3)
    })
  })
})

describe('AC5 — study sem comando', () => {
  it('sem-comando-json-envelope: study --json sem comando responde no envelope de usage', () => {
    const result = runStudy(['--json'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(errorOf(result).code).toBe('usage')
    expect(errorOf(result).message).toBe('nenhum comando informado')
  })

  it('help-com-json-humano: --help --json segue no canal humano, sem envelope', () => {
    const result = runStudy(['--help', '--json'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Uso:')
    expect(result.stderr).toBe('')
    expect(() => JSON.parse(result.stdout)).toThrow()
  })
})
