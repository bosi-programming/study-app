import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { itemsOf, jsonOf, runStudy } from './commands/helpers.ts'
import { makeItem } from './persistence/helpers.ts'
import { withDb } from './persistence/helpers/db.ts'
import { seed } from './commands/helpers.ts'

const repoRoot = resolve(import.meta.dirname, '../../..')
const binPath = resolve(repoRoot, 'node_modules/.bin/study')

describe('S-06/S-07 cli bin', () => {
  it('bin-roda-fora-do-repo: o bin existe e roda de um cwd qualquer', () => {
    expect(existsSync(binPath)).toBe(true)

    const result = runStudy(['--help'], { cwd: '/tmp' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Uso:')
  })
})

describe('apoio — uso, dispatch e banco', () => {
  it('sem-argumento-uso-stderr: study sozinho imprime o uso no stderr e sai 1', () => {
    const result = runStudy([])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Uso:')
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

  it('envelope-por-comando: {schema_version: 1, <comando>: ...} nos sete', () => {
    const cases: Array<[string, (dbPath: string) => string[]]> = [
      ['init', (dbPath) => ['init', '--db', dbPath]],
      ['add', (dbPath) => ['add', 'Título', '-s', 'Matéria', '-d', '4', '--db', dbPath]],
      ['list', (dbPath) => ['list', '--db', dbPath]],
      ['find', (dbPath) => ['find', 'título', '--db', dbPath]],
      ['show', (dbPath) => ['show', '2f1c9c1e', '--db', dbPath]],
      ['edit', (dbPath) => ['edit', '2f1c9c1e', '-d', '3', '--db', dbPath]],
      ['remove', (dbPath) => ['remove', '2f1c9c1e', '--yes', '--db', dbPath]],
    ]

    for (const [command, build] of cases) {
      withDb((dbPath) => {
        if (command !== 'init') seed(dbPath, { items: [makeItem()] })

        const result = runStudy([...build(dbPath), '--json'])

        expect(result.status, command).toBe(0)
        expect(jsonOf(result), command).toMatchObject({ schema_version: 1 })
        expect(jsonOf(result), command).toHaveProperty(command)
      })
    }
  })
})
