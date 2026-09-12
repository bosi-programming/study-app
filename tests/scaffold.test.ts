import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function readJson<T = Record<string, unknown>>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as T
}

type PackageJson = { dependencies?: Record<string, string>; scripts?: Record<string, string> }
type TsConfig = { extends?: string; compilerOptions?: { strict?: boolean; types?: string[] } }

describe('T-08 workspace members', () => {
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

describe('T-09 shared strict tsconfig', () => {
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

describe('T-10 no runtime dependencies', () => {
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

describe('T-11 root scripts', () => {
  it('declares test, test:golden, bench and typecheck', () => {
    const scripts = Object.keys(readJson<PackageJson>('package.json').scripts ?? {})
    expect(scripts).toEqual(
      expect.arrayContaining(['test', 'test:golden', 'bench', 'typecheck']),
    )
  })
})

describe('T-12 bench stub', () => {
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
