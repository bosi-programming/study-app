import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { DEFAULT_QUEUE_BUDGET_MS, DEFAULT_QUEUE_SIZE, bench } from '../scripts/bench.ts'
import { SCHEMA_SQL } from '../scripts/sqlite-probe.ts'
import vitestConfig from '../vitest.config.ts'

const root = resolve(import.meta.dirname, '..')
const benchTimeoutMs = 30_000

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

function yamlBlockEntries(source: string, key: string): string[] {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.trimEnd() === `${key}:`)
  if (start < 0) return []
  const entries: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim().length === 0) continue
    if (!/^\s/.test(line)) break
    entries.push(line.trim())
  }
  return entries
}

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
type TsConfig = { extends?: string; compilerOptions?: { strict?: boolean; types?: string[] } }

describe('S-08 workspace members', () => {
  it('declares the three workspace globs', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    for (const glob of ['packages/*', 'apps/*', 'fixtures/*']) {
      expect(workspace).toContain(glob)
    }
  })

  it('allows the esbuild build script pnpm would otherwise block', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')

    expect(yamlBlockEntries(workspace, 'allowBuilds')).toEqual(['esbuild: true'])
  })

  it.each([
    ['packages/core/package.json', '@study/core'],
    ['apps/cli/package.json', 'study-cli'],
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

  it('apps/cli keeps the workspace core as a dev dependency, not a runtime one', () => {
    const manifest = readJson<PackageJson>('apps/cli/package.json')
    expect(manifest.devDependencies?.['@study/core']).toBe('workspace:*')
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([])
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

describe('S-12 real bench', () => {
  const requirementLine =
    textAt('docs/especificacao/REQUISITOS.md')
      .split('\n')
      .find((line) => line.includes('RNF-03')) ?? ''
  const script = textAt('scripts/bench.ts')
  const size = Number((/(\d[\d.]*)\s*itens/.exec(requirementLine)?.[1] ?? '').replaceAll('.', ''))
  const budget = Number(/(\d+)\s*ms/.exec(requirementLine)?.[1])

  it('pins the queue size and the budget to the RNF-03 line of the requirements', () => {
    expect(size).toBe(5_000)
    expect(budget).toBe(200)
    expect(DEFAULT_QUEUE_SIZE).toBe(size)
    expect(DEFAULT_QUEUE_BUDGET_MS).toBe(budget)
  })

  it('seeds, warms up, takes the median through the binary and leaves the stub behind', () => {
    expect(script).toContain('spawnSync')
    expect(script).toContain('--json')
    expect(script).toContain('transaction')
    expect(script).toContain('WARMUP_ROUNDS')
    expect(script).toContain('median')
    expect(script).not.toContain('nothing to measure yet')
  })

  it(
    'bench-teto: reprova a medição acima do orçamento',
    () => {
      expect(bench({ queueSize: 25, budgetMs: 0 }).ok).toBe(false)
    },
    benchTimeoutMs,
  )

  it(
    'bench-fila: recusa quando a fila volta com tamanho diferente do semeado',
    () => {
      expect(() => bench({ queueSize: 25, expectedItems: 26 })).toThrow(/esperado 26/)
    },
    benchTimeoutMs,
  )

  it(
    'bench-exit: o teto reprovado imprime FAIL e sai 1',
    () => {
      const result = spawnSync(process.execPath, ['scripts/bench.ts'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, STUDY_BENCH_QUEUE_SIZE: '25', STUDY_BENCH_BUDGET_MS: '0' },
      })

      expect(result.stdout).toContain('FAIL')
      expect(result.status).toBe(1)
    },
    benchTimeoutMs,
  )
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

  it('scaffold-adr-027: o índice linka o ADR-027 e o docs/README.md conta 27', () => {
    const files = readdirSync(adrDir).filter((name) => name !== 'README.md')
    const adr27 = files.filter((name) => name.startsWith('adr-027'))
    const adr26Name = files.find((name) => name.startsWith('adr-026')) ?? ''

    expect(adr27.length).toBe(1)
    expect(adr26Name).not.toBe('')
    expect(readFileSync(resolve(adrDir, 'README.md'), 'utf8')).toContain(adr27[0] ?? '')
    expect(files.length).toBe(27)
    expect(readFileSync(resolve(root, 'docs/README.md'), 'utf8')).toContain('27 ADRs')
    expect(readFileSync(resolve(adrDir, adr26Name), 'utf8')).toContain("status: 'superado'")
  })

  it('adr-supersessao: o índice liga o ADR-013 e o ADR-026 ao ADR-027', () => {
    const section =
      readFileSync(resolve(adrDir, 'README.md'), 'utf8').split('## Supersessão')[1] ?? ''
    const rows = section.split('\n').filter((line) => line.startsWith('|') && line.includes('adr-'))
    const rowFor = (name: string) => rows.find((line) => line.includes(name)) ?? ''

    expect(rowFor('adr-013')).toContain('adr-027')
    expect(rowFor('adr-026')).toContain('adr-027')
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

type PlanCase = { id: string; caseName: string }

function planMandatoryCases(): PlanCase[] {
  const section =
    textAt('docs/engenharia/PLANO-DE-TESTES.md').split('\n## Casos obrigatórios\n')[1] ?? ''

  return section
    .split('\n')
    .filter((line) => /^\| T-\d{2} \|/.test(line))
    .map((line) => ({
      id: (line.split('|')[1] ?? '').trim(),
      caseName: (line.split('|')[2] ?? '').trim(),
    }))
}

function planManualCases(): string[] {
  return planMandatoryCases()
    .filter((entry) => entry.caseName.includes('(manual)'))
    .map((entry) => entry.id)
}

function roadmapPhaseOneSection(): string {
  return (
    textAt('docs/engenharia/ROADMAP.md')
      .split('\n## ')
      .find((part) => part.startsWith('Fase 1')) ?? ''
  )
}

function phaseOneChecklistLines(): string[] {
  return roadmapPhaseOneSection()
    .split('\n')
    .filter((line) => line.startsWith('- ['))
}

function phaseOneDefinitionOfDone(): string[] {
  const line = roadmapPhaseOneSection()
    .split('\n')
    .find((candidate) => candidate.startsWith('Definition of done:'))

  if (line === undefined) throw new Error('Definition of done da fase 1 ausente')
  return (line.split(':')[1] ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\.$/, ''))
    .filter((item) => item.length > 0)
}

function requirementIds(): string[] {
  return textAt('docs/especificacao/REQUISITOS.md')
    .split('\n')
    .filter((line) => /^- RN-\d{2} /.test(line))
    .map((line) => (line.split(' ')[1] ?? '').trim())
}

function idRange(ids: string[]): string {
  return `${ids[0] ?? ''}..${ids[ids.length - 1] ?? ''}`
}

describe('S-25 phase 1 verification record', () => {
  const registry = textAt('docs/engenharia/VERIFICACAO-FASE-1.md')

  it('names every Definition of done item of the phase', () => {
    const items = phaseOneDefinitionOfDone()
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) expect(registry, item).toContain(item)
  })

  it('names every (manual) plan case with the command that runs it', () => {
    const manual = planManualCases()
    expect(manual).toEqual(['T-26'])
    for (const id of manual) expect(registry, id).toContain(id)
    expect(registry).toContain('pnpm bench')
  })

  it('is indexed by docs/README.md', () => {
    expect(textAt('docs/README.md')).toContain('docs/engenharia/VERIFICACAO-FASE-1.md')
  })
})

describe('S-26 default test run', () => {
  it('runs vitest without a project filter', () => {
    expect(readJson<PackageJson>('package.json').scripts?.test).toBe('vitest run')
  })

  it('declares the core and cli projects', () => {
    expect(projectNamed('core')).not.toBeNull()
    expect(projectNamed('cli')).not.toBeNull()
  })
})

describe('S-27 roadmap phase 1 ranges', () => {
  const checklist = phaseOneChecklistLines()

  it('cites the requirement range the specification defines', () => {
    const range = idRange(requirementIds())
    expect(range).toBe('RN-01..RN-15')
    expect(checklist.some((line) => line.includes(`Implementar ${range} `))).toBe(true)
    expect(checklist.some((line) => line.includes('RN-01..RN-12'))).toBe(false)
  })

  it('cites the plan-case range the test plan defines', () => {
    const range = idRange(planMandatoryCases().map((entry) => entry.id))
    expect(range).toBe('T-01..T-27')
    expect(checklist.some((line) => line.includes(`Testes ${range} verdes`))).toBe(true)
    expect(checklist.some((line) => line.includes('T-01..T-12'))).toBe(false)
  })

  it('cites a range nowhere but in the phase 1 checklist', () => {
    const cited = textAt('docs/engenharia/ROADMAP.md')
      .split('\n')
      .filter((line) => /RN-\d{2}|T-\d{2}/.test(line))
    const checklistCitingRanges = checklist.filter((line) => /RN-\d{2}|T-\d{2}/.test(line))

    expect(checklistCitingRanges).toHaveLength(2)
    expect(cited).toEqual(checklistCitingRanges)
  })
})

const studyShim = resolve(root, 'node_modules/.bin/study')
const cliDir = resolve(root, 'apps/cli')
const cliManifestPath = 'apps/cli/package.json'
const cliBundlePath = 'apps/cli/dist/main.js'
const publishTimeoutMs = 60_000

type PublishManifest = PackageJson & {
  name?: string
  private?: boolean
  engines?: { node?: string }
  files?: string[]
  bin?: Record<string, string>
}

describe('S-28 publish wiring', () => {
  it('publish-manifest: o manifesto é publicável, com bin JS e zero runtime deps', () => {
    const manifest = readJson<PublishManifest>(cliManifestPath)

    expect(manifest.name).toBe('study-cli')
    expect(manifest.private).toBeUndefined()
    expect(manifest.engines?.node).toBe('>=24')
    expect(manifest.files).toEqual(['dist'])
    expect(manifest.bin?.study).toBe('./dist/main.js')
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([])
    expect(manifest.devDependencies?.['@study/core']).toBe('workspace:*')
    expect(manifest.scripts?.build).toBe('node build.mjs')
    expect(manifest.scripts?.prepare).toBe('node build.mjs')
  })

  it('bundle-shebang: o bundle do prepare começa com shebang e inlina o core', () => {
    const bundle = readFileSync(resolve(root, cliBundlePath), 'utf8')

    expect(bundle.startsWith('#!/usr/bin/env node\n')).toBe(true)
    expect(bundle).not.toMatch(/from ['"]@study\/core['"]/)
    expect(bundle).not.toMatch(/from ['"]\.\/cli\.ts['"]/)
  })

  it('pack-contem-o-bin: o npm pack --dry-run lista o dist/main.js', () => {
    const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: cliDir,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    const report = JSON.parse(result.stdout) as { files?: { path: string }[] }[]
    const paths = report[0]?.files?.map((file) => file.path) ?? []
    expect(paths).toContain('dist/main.js')
    expect(paths.some((path) => path.endsWith('.ts'))).toBe(false)
  })

  it(
    'instala-do-tarball: o pacote instala num prefixo global e roda de um cwd estranho',
    () => {
      const packDir = mkdtempSync(join(tmpdir(), 'study-pack-'))
      const prefix = mkdtempSync(join(tmpdir(), 'study-prefix-'))
      const foreignCwd = mkdtempSync(join(tmpdir(), 'study-cwd-'))
      onTestFinished(() => {
        rmSync(packDir, { recursive: true, force: true })
        rmSync(prefix, { recursive: true, force: true })
        rmSync(foreignCwd, { recursive: true, force: true })
      })

      const packed = spawnSync('npm', ['pack', '--pack-destination', packDir], {
        cwd: cliDir,
        encoding: 'utf8',
      })
      expect(packed.status).toBe(0)
      const tarball = join(packDir, packed.stdout.trim().split('\n').at(-1) ?? '')
      expect(existsSync(tarball)).toBe(true)

      const listing = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' }).stdout
      expect(listing).toContain('package/dist/main.js')
      expect(listing.split('\n').filter((name) => name.endsWith('.ts'))).toEqual([])
      const packedManifest = JSON.parse(
        spawnSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }).stdout,
      ) as PublishManifest
      expect(packedManifest.bin?.study).toBe('./dist/main.js')
      expect(Object.keys(packedManifest.dependencies ?? {})).toEqual([])

      const installed = spawnSync('npm', ['install', '-g', '--prefix', prefix, tarball], {
        encoding: 'utf8',
      })
      expect(installed.status).toBe(0)

      const result = spawnSync('study', ['--help'], {
        cwd: foreignCwd,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${join(prefix, 'bin')}:${process.env.PATH ?? ''}` },
      })
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('Uso:')
    },
    publishTimeoutMs,
  )

  it('shim-local: o node_modules/.bin/study roda o bundle construído pelo prepare', () => {
    const result = spawnSync(studyShim, ['--help'], { cwd: tmpdir(), encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Uso:')
  })

  it('readme-instalar-global: o README documenta instalar e desinstalar pelo npm', () => {
    const readme = textAt('README.md')

    expect(readme.split('\n')).toContain('npm install -g study-cli')
    expect(readme.split('\n')).toContain('npm uninstall -g study-cli')
    expect(readme).not.toContain('ln -sf')
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
const lintIgnoredDirs = new Set(['node_modules', 'coverage', 'recipes', '.scratch', 'dist'])
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

  it('ignores node_modules, coverage, recipes, .scratch and the generated dist', () => {
    const config = textAt('eslint.config.js')
    expect(config.trim().length).toBeGreaterThan(0)
    for (const ignored of ['node_modules', 'coverage', 'recipes', '.scratch', 'dist']) {
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
