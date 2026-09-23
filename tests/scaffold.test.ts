import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCHEMA_SQL } from '../scripts/sqlite-probe.ts'
import vitestConfig from '../vitest.config.ts'

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

describe('S-17 ADR index', () => {
  const adrDir = resolve(root, 'docs/adr')

  it('links every ADR file from the index and resolves every link', () => {
    const files = readdirSync(adrDir).filter((name) => name !== 'README.md')
    expect(files.length).toBeGreaterThan(0)

    const links = [
      ...readFileSync(resolve(adrDir, 'README.md'), 'utf8').matchAll(/\]\(([^)]+)\)/g),
    ]
      .map((match) => match[1] ?? '')
      .filter((link) => !/^[a-z]+:/i.test(link))

    for (const file of files) {
      expect(links).toContain(file)
    }
    for (const link of links) {
      expect(existsSync(resolve(adrDir, link))).toBe(true)
    }
  })
})

function projectNamed(name: string) {
  for (const project of vitestConfig.test?.projects ?? []) {
    if (typeof project !== 'object' || project === null) continue
    if (!('test' in project)) continue
    if (project.test?.name === name) return project.test
  }
  return null
}

describe('S-19 coverage gate', () => {
  it('declares test:coverage as the command that runs it', () => {
    const scripts = readJson<PackageJson>('package.json').scripts ?? {}
    expect(scripts['test:coverage']).toBe('vitest run --coverage')
  })

  it('gates the core source behind a 90% line threshold', () => {
    const coverage = vitestConfig.test?.coverage

    expect(coverage?.provider).toBe('v8')
    expect(coverage?.include).toContain('packages/core/src/**/*.ts')

    const thresholds = coverage?.thresholds
    const lines = typeof thresholds === 'number' ? thresholds : thresholds?.lines
    expect(lines).toBeGreaterThanOrEqual(90)
  })
})

describe('S-20 golden project runs the fixture vectors', () => {
  it('runs the core vector runner inside the golden project', () => {
    expect(projectNamed('golden')?.include).toContain('packages/core/test/golden.test.ts')
  })

  it('leaves that runner out of the core project, so it runs once', () => {
    expect(projectNamed('core')?.exclude).toContain('test/golden.test.ts')
  })
})

type LintManifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

const lintDependencies = {
  eslint: '10.11.0',
  '@eslint/js': '10.0.1',
  'typescript-eslint': '8.70.1',
}

const lintedRoots = ['packages', 'apps', 'fixtures', 'tests', 'scripts']
const lintIgnoredDirs = new Set(['node_modules', 'coverage', 'recipes', '.scratch'])
const sourceFilePattern = /\.(ts|mts|cts|js|mjs|cjs)$/

function textAt(relativePath: string): string {
  const path = resolve(root, relativePath)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function sectionBetween(text: string, from: string, to: string): string {
  const start = text.indexOf(from)
  if (start === -1) throw new Error(`section start not found: ${from}`)
  const end = text.indexOf(to, start + from.length)
  if (end === -1) throw new Error(`section end not found: ${to}`)
  return text.slice(start, end)
}

function lintedSourceFiles(): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (lintIgnoredDirs.has(entry.name)) continue
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (sourceFilePattern.test(entry.name)) files.push(path)
    }
  }
  for (const name of lintedRoots) walk(resolve(root, name))
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && sourceFilePattern.test(entry.name)) files.push(resolve(root, entry.name))
  }
  return files
}

describe('S-21 CI workflow', () => {
  const workflow = textAt('.github/workflows/ci.yml')

  it('exists and is not empty', () => {
    expect(workflow.trim().length).toBeGreaterThan(0)
  })

  it('triggers on pull_request against main and never on pull_request_target', () => {
    expect(workflow).toContain('pull_request')
    expect(workflow).not.toContain('pull_request_target')
    expect(workflow).toMatch(/branches:\s*\[?['"]?main['"]?\]?/)
  })

  it('runs on Node 24, installs the packageManager pnpm and freezes the lockfile', () => {
    expect(workflow).toContain('node-version: 24')
    expect(workflow).toContain('pnpm/action-setup@v4')
    expect(sectionBetween(workflow, 'pnpm/action-setup@v4', 'actions/setup-node@v4')).not.toMatch(
      /^\s*version:/m,
    )
    expect(workflow).toContain('actions/setup-node@v4')
    expect(sectionBetween(workflow, 'actions/setup-node@v4', 'pnpm install')).toContain(
      'cache: pnpm',
    )
    expect(workflow).toContain('pnpm install --frozen-lockfile')
    expect(readJson<PackageJson>('package.json')).toMatchObject({ packageManager: 'pnpm@12.4.1' })
  })

  it('orders checkout, pnpm setup, Node setup, install and the gates', () => {
    const order = [
      'actions/checkout@v4',
      'pnpm/action-setup@v4',
      'actions/setup-node@v4',
      'pnpm install --frozen-lockfile',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
    ].map((needle) => workflow.indexOf(needle))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((left, right) => left - right)).toEqual(order)
  })

  it('gives each gate its own run step', () => {
    const runSteps = [...workflow.matchAll(/run:\s*(.+)/g)].map((match) => (match[1] ?? '').trim())
    expect(runSteps).toContain('pnpm lint')
    expect(runSteps).toContain('pnpm typecheck')
    expect(runSteps).toContain('pnpm test')
  })

  it('reads contents in block form, since the inline form is not valid YAML', () => {
    expect(sectionBetween(workflow, 'permissions:', 'jobs:')).toContain('contents: read')
    expect(workflow).not.toContain('permissions: contents: read')
    expect(workflow).not.toContain('continue-on-error')
    expect(workflow).not.toContain('|| true')
    expect(workflow).not.toContain('if: always()')
  })

  it('needs no secret, so a fork pull request can run it', () => {
    expect(workflow).not.toContain('secrets.')
    expect(workflow).not.toContain('vars.')
  })
})

describe('S-22 lint gate', () => {
  it('declares lint as eslint . at the root', () => {
    expect(readJson<PackageJson>('package.json').scripts?.lint).toBe('eslint .')
  })

  it('pins the lint dependencies at the root only', () => {
    const rootManifest = readJson<LintManifest>('package.json')
    for (const [name, version] of Object.entries(lintDependencies)) {
      expect(rootManifest.devDependencies?.[name]).toBe(version)
    }
    for (const path of [
      'packages/core/package.json',
      'apps/cli/package.json',
      'fixtures/golden/package.json',
    ]) {
      const manifest = readJson<LintManifest>(path)
      const declared = [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ]
      for (const name of Object.keys(lintDependencies)) {
        expect(declared).not.toContain(name)
      }
    }
  })

  it('ignores node_modules, coverage, recipes and .scratch', () => {
    const config = textAt('eslint.config.js')
    expect(config.trim().length).toBeGreaterThan(0)
    for (const ignored of ['node_modules', 'coverage', 'recipes', '.scratch']) {
      expect(config).toContain(ignored)
    }
  })

  it('lints every workspace dir through the real ESLint with zero errors and zero warnings', () => {
    const result = spawnSync(
      'pnpm',
      ['exec', 'eslint', '--format', 'json', ...lintedRoots],
      { cwd: root, encoding: 'utf8' },
    )
    expect(result.status).toBe(0)
    const results = JSON.parse(result.stdout) as {
      filePath: string
      errorCount: number
      warningCount: number
    }[]
    expect(results.every((entry) => entry.errorCount === 0 && entry.warningCount === 0)).toBe(true)
    for (const name of lintedRoots) {
      expect(results.some((entry) => entry.filePath.includes(`/${name}/`))).toBe(true)
    }
  })

  it('leaves no lint suppression behind in the linted tree', () => {
    const directive = ['eslint', 'disable'].join('-')
    const files = lintedSourceFiles()
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(readFileSync(file, 'utf8')).not.toContain(directive)
    }
  })

  it('carries the lint dependencies in the lockfile', () => {
    const lockfile = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')
    for (const [name, version] of Object.entries(lintDependencies)) {
      expect(lockfile).toContain(`${name}@${version}`)
    }
  })

  it('documents lint in the README and in AGENTS', () => {
    expect(textAt('README.md')).toContain('pnpm lint')
    expect(textAt('AGENTS.md')).toContain('pnpm lint')
  })

  it('indexes ADR-017 and keeps the ADR count in sync', () => {
    const adrDir = resolve(root, 'docs/adr')
    const adr17 = readdirSync(adrDir).filter((name) => name.startsWith('adr-017'))
    expect(adr17.length).toBe(1)
    expect(textAt('docs/adr/README.md')).toContain(adr17[0] ?? '')
    const count = readdirSync(adrDir).filter((name) => name !== 'README.md').length
    expect(textAt('docs/README.md')).toContain(`${count} ADRs`)
  })
})
