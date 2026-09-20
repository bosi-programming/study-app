import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCHEMA_SQL } from '../scripts/sqlite-probe.ts'

const root = resolve(import.meta.dirname, '..')

function readJson<T = Record<string, unknown>>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as T
}

function normalizeSql(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

type PackageJson = { dependencies?: Record<string, string>; scripts?: Record<string, string> }
type TsConfig = { extends?: string; compilerOptions?: { strict?: boolean; types?: string[] } }

describe('S-08 workspace members', () => {
  it('declares the three workspace globs', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    for (const glob of ['packages/*', 'apps/*', 'fixtures/*']) {
      expect(workspace).toContain(glob)
    }
  })

  it.each([
    ['packages/core/package.json', '@study/core'],
    ['apps/cli/package.json', '@study/cli'],
    ['fixtures/golden/package.json', '@study/golden'],
  ])('%s exists as %s', (path, name) => {
    expect(readJson<PackageJson>(path)).toMatchObject({ name })
  })
})

describe('S-09 shared strict tsconfig', () => {
  it('enables strict mode in the shared base', () => {
    expect(readJson<TsConfig>('tsconfig.base.json').compilerOptions?.strict).toBe(true)
  })

  it.each([
    ['packages/core/tsconfig.json', false],
    ['fixtures/golden/tsconfig.json', false],
    ['apps/cli/tsconfig.json', true],
  ])('%s inherits the base and sets its own types', (path, nodeTypes) => {
    const config = readJson<TsConfig>(path)
    expect(String(config.extends)).toMatch(/tsconfig\.base\.json$/)
    expect(config.compilerOptions?.types).toEqual(nodeTypes ? ['node'] : [])
  })
})

describe('S-10 no runtime dependencies', () => {
  it.each([
    'package.json',
    'packages/core/package.json',
    'apps/cli/package.json',
    'fixtures/golden/package.json',
  ])('%s only knows @study/core as a runtime dependency', (path) => {
    const deps = Object.keys(readJson<PackageJson>(path).dependencies ?? {})
    expect(deps.filter((dep) => dep !== '@study/core')).toEqual([])
  })

  it('apps/cli depends on the workspace core', () => {
    expect(readJson<PackageJson>('apps/cli/package.json').dependencies?.['@study/core']).toBe(
      'workspace:*',
    )
  })
})

describe('S-11 root scripts', () => {
  it('declares test, test:golden, bench and typecheck', () => {
    const scripts = Object.keys(readJson<PackageJson>('package.json').scripts ?? {})
    expect(scripts).toEqual(
      expect.arrayContaining(['test', 'test:golden', 'bench', 'typecheck']),
    )
  })
})

describe('S-12 bench stub', () => {
  it('exits 0 and names the blocker instead of pretending to measure', () => {
    const result = spawnSync(process.execPath, ['scripts/bench.ts'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('RNF-03')
    expect(result.stdout).toContain('ENG-3')
  })
})

describe('S-13 sqlite probe', () => {
  it('runs every probe assertion and exits 0', () => {
    const result = spawnSync(process.execPath, ['scripts/sqlite-probe.ts'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(result.stdout).toContain('PASS')
    expect(result.stdout).not.toContain('FAIL')
    expect(result.status).toBe(0)
  })
})

describe('S-14 canonical DDL', () => {
  it('keeps SCHEMA_SQL in sync with the SQL block of the data model doc', () => {
    const doc = readFileSync(resolve(root, 'docs/especificacao/MODELO-DE-DADOS.md'), 'utf8')
    const block = doc.match(/```sql\n([\s\S]*?)```/)?.[1]
    expect(block).toBeDefined()
    expect(normalizeSql(SCHEMA_SQL)).toBe(normalizeSql(block ?? ''))
  })
})

describe('S-15 no native sqlite dependency', () => {
  it('declares sqlite:probe and never pulls in better-sqlite3', () => {
    const scripts = readJson<PackageJson>('package.json').scripts ?? {}
    expect(scripts['sqlite:probe']).toBe('node scripts/sqlite-probe.ts')

    for (const path of [
      'package.json',
      'packages/core/package.json',
      'apps/cli/package.json',
      'fixtures/golden/package.json',
    ]) {
      const pkg = readJson<PackageJson & { devDependencies?: Record<string, string> }>(path)
      const declared = [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      ]
      expect(declared).not.toContain('better-sqlite3')
      expect(declared).not.toContain('@types/better-sqlite3')
    }
  })
})
