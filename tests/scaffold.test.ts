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
type TsConfig = {
  extends?: string
  compilerOptions?: {
    strict?: boolean
    types?: string[]
    jsx?: string
    lib?: string[]
    module?: string
    moduleResolution?: string
  }
}

describe('S-08 workspace members', () => {
  it('declares the three workspace globs', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    for (const glob of ['packages/*', 'apps/*', 'fixtures/*']) {
      expect(workspace).toContain(glob)
    }
  })

  it('allows the esbuild build script and denies the squirrel one', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')

    expect(yamlBlockEntries(workspace, 'allowBuilds')).toEqual([
      'electron-winstaller: false',
      'esbuild: true',
    ])
  })

  it.each([
    ['packages/core/package.json', '@study/core'],
    ['apps/cli/package.json', '@bosi-programming/study-cli'],
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

describe('S-17 ADR naming', () => {
  const adrDir = resolve(root, 'docs/adr')
  const adrFiles = (): string[] =>
    readdirSync(adrDir).filter((file) => file !== 'README.md')

  it('nomeia cada ADR pelo assunto, sem número', () => {
    const files = adrFiles()
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      expect(file, file).toMatch(/^[a-z0-9-]+\.md$/)
      expect(file, file).not.toMatch(/^adr-/)
    }
  })

  it('guarda titulo, data e status no frontmatter, sem numero', () => {
    for (const file of adrFiles()) {
      const source = readFileSync(resolve(adrDir, file), 'utf8')
      expect(source, file).toMatch(/^titulo: /m)
      expect(source, file).toMatch(/^data: /m)
      expect(source, file).toMatch(/^status: /m)
      expect(source, file).not.toMatch(/^numero:/m)
    }
  })

  it('não cita ADR por número no próprio texto', () => {
    for (const file of adrFiles()) {
      expect(readFileSync(resolve(adrDir, file), 'utf8'), file).not.toMatch(/ADR-\d{3}/)
    }
  })

  it('scaffold-adr-supersessao: o symlink fica superado e a distribuição, parcialmente', () => {
    const superseded = readFileSync(resolve(adrDir, 'instalacao-local-do-cli-symlink-do-shim-no-path.md'), 'utf8')
    const partial = readFileSync(resolve(adrDir, 'distribuicao-npm-global-do-cli-e-artefato-js.md'), 'utf8')
    const renamed = readFileSync(resolve(adrDir, 'nome-publicado-do-cli-sob-o-escopo-bosi-programming.md'), 'utf8')

    expect(superseded).toContain("status: 'superado'")
    expect(partial).toContain("status: 'superado-parcialmente'")
    expect(renamed).toContain("status: 'aceito'")
  })

  it('scaffold-adr-pnpm-sem-build: o sem build fica superado em parte', () => {
    const source = readFileSync(resolve(adrDir, 'scaffold-do-monorepo-pnpm-sem-build.md'), 'utf8')

    expect(source).toContain("status: 'superado-parcialmente'")
  })

  it('scaffold-adr-mvc: o MVC no CLI e a sessão longa da TUI ficam aceitos', () => {
    const mvc = readFileSync(resolve(adrDir, 'mvc-no-cli.md'), 'utf8')
    const session = readFileSync(
      resolve(adrDir, 'porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md'),
      'utf8',
    )

    expect(mvc).toContain("status: 'aceito'")
    expect(session).toContain("status: 'aceito'")
  })

  it('scaffold-adr-paleta: o CLI declara --no-color e a paleta vive no color.ts', () => {
    expect(textAt('apps/cli/src/output/color.ts')).toContain('E8A13B')
    expect(textAt('apps/cli/src/args.ts')).toContain("name: 'no-color'")
    expect(textAt('docs/especificacao/CLI.md')).toContain('`--no-color`')
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

function requirementIds(prefix: 'RN' | 'RF'): string[] {
  return textAt('docs/especificacao/REQUISITOS.md')
    .split('\n')
    .filter((line) => new RegExp(`^- ${prefix}-\\d{2} `).test(line))
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
    const range = idRange(requirementIds('RN'))
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
  publishConfig?: { access?: string }
}

describe('S-28 publish wiring', () => {
  it('publish-manifest: o manifesto é publicável, com bin JS e zero runtime deps', () => {
    const manifest = readJson<PublishManifest>(cliManifestPath)

    expect(manifest.name).toBe('@bosi-programming/study-cli')
    expect(manifest.private).toBeUndefined()
    expect(manifest.engines?.node).toBe('>=24')
    expect(manifest.files).toEqual(['dist'])
    expect(manifest.bin?.study).toBe('./dist/main.js')
    expect(manifest.publishConfig?.access).toBe('public')
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

    expect(readme.split('\n')).toContain('npm install -g @bosi-programming/study-cli')
    expect(readme.split('\n')).toContain('npm uninstall -g @bosi-programming/study-cli')
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
      'xvfb-run -a pnpm test',
    ].map((needle) => workflow.indexOf(needle))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((left, right) => left - right)).toEqual(order)
  })

  it('gives each gate its own run step', () => {
    const runSteps = [...workflow.matchAll(/run:\s*(.+)/g)].map((match) => (match[1] ?? '').trim())
    expect(runSteps).toContain('pnpm lint')
    expect(runSteps).toContain('pnpm typecheck')
    expect(runSteps).toContain('xvfb-run -a pnpm test')
  })

  it('instala as bibliotecas de sistema do Electron e o xvfb antes dos gates', () => {
    const installStep = sectionBetween(workflow, 'Install Electron system libraries', 'Lint')

    expect(installStep).toContain('apt-get')
    expect(installStep).toContain('xvfb')
    expect(workflow).toContain('xvfb-run -a pnpm test')
    expect(workflow.indexOf('xvfb')).toBeLessThan(workflow.indexOf('xvfb-run -a pnpm test'))
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

  it('registra o gate de lint no ADR de CI', () => {
    const source = readFileSync(
      resolve(root, 'docs/adr/ci-com-lint-typecheck-e-testes-nas-prs-para-main.md'),
      'utf8',
    )

    expect(source).toContain("status: 'aceito'")
  })
})

function indexRows(): string[] {
  return textAt('docs/README.md')
    .split('\n')
    .filter((line) => line.startsWith('|'))
}

const layerDocuments = [
  'docs/engenharia/INVENTARIO-DE-REQUISITOS.md',
  'docs/especificacao/WEB.md',
  'docs/especificacao/PILOTO.md',
  'docs/especificacao/MOBILE.md',
  'docs/especificacao/DESKTOP.md',
]

describe('S-29 docs-index-novos', () => {
  it.each(layerDocuments)('cria %s com conteúdo', (path) => {
    expect(existsSync(resolve(root, path))).toBe(true)
    expect(textAt(path).trim().length).toBeGreaterThan(0)
  })

  it.each(layerDocuments)('indexa %s com status e versão', (path) => {
    const row = indexRows().find((line) => line.includes(path))
    expect(row, path).toBeDefined()
    expect(row).toContain('Rascunho v1')
  })

  it('cita os cinco documentos novos na ordem de leitura', () => {
    const readme = textAt('docs/README.md')
    const order = readme.slice(readme.indexOf('## Ordem de leitura'))

    expect(readme).toContain('## Ordem de leitura')
    for (const path of layerDocuments) expect(order, path).toContain(path)
  })

  it('sobe a linha do plano de testes para v4', () => {
    const row = indexRows().find((line) => line.includes('docs/engenharia/PLANO-DE-TESTES.md'))
    expect(row).toBeDefined()
    expect(row).toContain('Rascunho v5')
  })
})

describe('S-30 web-molde-rf', () => {
  const web = textAt('docs/especificacao/WEB.md')

  it.each([
    '## Convenções',
    '## Telas e fluxos',
    '## Estados',
    '## Contrato com o core',
    '## Erros',
    '## Critérios de aceite',
  ])('tem a seção %s do molde', (heading) => {
    expect(web).toContain(heading)
  })

  it('cobre cada RF-01..RF-25 derivado dos requisitos', () => {
    const ids = requirementIds('RF')
    expect(idRange(ids)).toBe('RF-01..RF-25')
    for (const id of ids) expect(web, id).toContain(id)
  })

  it('mapeia cada RF de UI na tabela de cobertura de telas', () => {
    const table = sectionBetween(web, '## Telas e fluxos', '\n### ')

    for (const id of requirementIds('RF')) expect(table, id).toContain(id)
  })

  it('descreve os quatro estados de tela', () => {
    const states = sectionBetween(web, '\n## Estados\n', '\n## ').toLowerCase()
    for (const state of ['vazio', 'carregando', 'offline', 'erro']) {
      expect(states, state).toContain(state)
    }
  })

  it('mantém remover, migrar, purgar e a janela no molde destrutivo', () => {
    const screens = sectionBetween(web, '\n## Telas e fluxos\n', '\n## ')
    const destructive: Record<string, RegExp> = {
      'RF-04': /remover/i,
      'RF-16': /migrar/i,
      'RF-17': /purgar/i,
      'RF-25': /janela/i,
    }

    for (const [id, action] of Object.entries(destructive)) {
      const line = screens
        .split('\n')
        .find((candidate) => candidate.includes(id) && action.test(candidate))
      expect(line, id).toBeDefined()
    }

    const mould = web.split('\n').find((line) => /confirmação explícita/i.test(line))
    expect(mould, 'molde destrutivo').toBeDefined()
    for (const id of Object.keys(destructive)) expect(mould, id).toContain(id)
  })

  it('centraliza as strings pt-BR num módulo único (RNF-06)', () => {
    expect(web).toContain('RNF-06')
    expect(web).toMatch(/módulo único de strings/i)
  })
})

describe('S-31 piloto-requisitos', () => {
  const pilot = textAt('docs/especificacao/PILOTO.md')

  it('fixa o aviso LGPD e o fluxo de consentimento', () => {
    expect(pilot).toContain('LGPD')
    expect(pilot).toContain('consentimento')
  })

  it('lista os eventos do Sentry com nome e campos', () => {
    for (const event of ['item_created', 'checkin', 'queue_viewed']) {
      expect(pilot, event).toContain(event)
    }
    expect(pilot).toContain('Campos')
  })

  it('proíbe dado pessoal nos eventos', () => {
    expect(pilot).toContain('PII')
    expect(pilot).toMatch(/nunca[^\n]*PII|não[^\n]*PII/i)
  })

  it('define o roteiro de entrevista semanal', () => {
    expect(pilot).toContain('entrevista')
    expect(pilot).toContain('semanal')
  })
})

describe('S-32 inventario-reconciliacao', () => {
  const inventory = textAt('docs/engenharia/INVENTARIO-DE-REQUISITOS.md')

  it('inventaria as fases 2 a 5', () => {
    for (const phase of ['Fase 2', 'Fase 3', 'Fase 4', 'Fase 5']) {
      expect(inventory, phase).toContain(phase)
    }
  })

  it('declara a casa dos documentos novos', () => {
    for (const path of layerDocuments) expect(inventory, path).toContain(path)
  })

  it('reconcilia BOS-41 a BOS-45', () => {
    const rows = inventory
      .split('\n')
      .filter((line) => /^\| BOS-\d{2} \|/.test(line))
      .map((line) => line.split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0))

    for (const ticket of ['BOS-41', 'BOS-42', 'BOS-43', 'BOS-44', 'BOS-45']) {
      expect(rows.filter((cells) => cells[0] === ticket).length, ticket).toBeGreaterThan(0)
    }
    for (const cells of rows) {
      expect(cells.length, cells.join(' | ')).toBe(4)
      expect(['documentado', 'implementação/deploy', 'ajustado'], cells.join(' | ')).toContain(cells[2])
    }
  })

  it('mantém desktop herdando as telas do web', () => {
    const desktop = textAt('docs/especificacao/DESKTOP.md')
    expect(desktop).toContain('Desktop com Electron reaproveitando o web')
    expect(desktop).toMatch(/herda[^\n]*telas? do web/i)
  })

  it('mantém mobile no expo-sqlite', () => {
    expect(textAt('docs/especificacao/MOBILE.md')).toContain('expo-sqlite')
  })
})

function layerCaseSection(): string {
  const plan = textAt('docs/engenharia/PLANO-DE-TESTES.md')
  return sectionBetween(plan, '## Casos por camada (W, P, M, D)', '\n## ')
}

describe('S-33 plano-ids-camada', () => {
  const plan = textAt('docs/engenharia/PLANO-DE-TESTES.md')

  it('sobe o plano para v5 e a suíte de scaffold para S-01..S-61', () => {
    expect(plan).toMatch(
      /^Versão: 5 \| Data: \d{4}-\d{2}-\d{2} \| Base: `docs\/especificacao\/REQUISITOS\.md`$/m,
    )
    expect(plan).toContain('### Suíte de scaffold (S-01..S-61)')
  })

  it('reserva as quatro faixas por camada', () => {
    const ranges = [...layerCaseSection().matchAll(/([WPMD])-(\d{2})\.\.([WPMD])-(\d{2})/g)].map(
      (match) => `${match[1]}-${match[2]}..${match[3]}-${match[4]}`,
    )
    expect(ranges).toEqual(['W-01..W-14', 'P-01..P-04', 'M-01..M-05', 'D-01..D-03'])
  })

  it('lista os casos de cada camada dentro da faixa, sem duplicar', () => {
    const ids = layerCaseSection()
      .split('\n')
      .filter((line) => /^\| [WPMD]-\d{2} \|/.test(line))
      .map((line) => (line.split('|')[1] ?? '').trim())
    const count = (prefix: string) => ids.filter((id) => id.startsWith(`${prefix}-`)).length

    expect(ids.length).toBeGreaterThan(0)
    expect(count('W')).toBe(14)
    expect(count('P')).toBe(4)
    expect(count('M')).toBe(5)
    expect(count('D')).toBe(3)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[WPMD]-\d{2}$/)
  })

  it('não colide com o domínio: T-01..T-27 seguem contíguos e só T-26 manual', () => {
    const ids = planMandatoryCases().map((entry) => entry.id)
    const expected = Array.from(
      { length: 27 },
      (_, index) => `T-${String(index + 1).padStart(2, '0')}`,
    )

    expect(ids).toEqual(expected)
    expect(planManualCases()).toEqual(['T-26'])
  })
})

type WebManifest = PackageJson & {
  private?: boolean
  type?: string
  engines?: { node?: string }
}

const CORE_RULE_SYMBOL = /initialDueDate|intervalFor|BASE_INTERVAL_DAYS|MAX_INTERVAL_DAYS/
const WEB_SOURCE_PATTERN = /\.(ts|tsx)$/

function webSourceFiles(): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (WEB_SOURCE_PATTERN.test(entry.name)) files.push(path)
    }
  }
  walk(resolve(root, 'apps/web/src'))
  return files
}

describe('S-34 web-member-manifest', () => {
  const manifest = readJson<WebManifest>('apps/web/package.json')

  it('declara @study/web como membro privado e módulo em node >= 24', () => {
    expect(manifest).toMatchObject({
      name: '@study/web',
      private: true,
      type: 'module',
      engines: { node: '>=24' },
    })
  })

  it('expõe o script typecheck que o pnpm -r typecheck alcança', () => {
    expect(manifest.scripts?.typecheck).toBe('tsc --noEmit -p tsconfig.json')
  })

  it('fica coberto pelo glob apps/* sem mexer no pnpm-workspace', () => {
    expect(readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')).toContain('apps/*')
  })
})

describe('S-35 web-core-from-src-no-copy', () => {
  const manifest = readJson<PackageJson>('apps/web/package.json')

  it('toma o core e as fixtures do workspace pelo src', () => {
    expect(manifest.devDependencies?.['@study/core']).toBe('workspace:*')
    expect(manifest.devDependencies?.['@study/golden']).toBe('workspace:*')
  })

  it('declara react e react-dom como as únicas dependências de runtime', () => {
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(['react', 'react-dom'])
  })

  it('não versiona o dist do build do web', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8').split('\n')
    const tracked = spawnSync('git', ['ls-files', '--', 'apps/web/dist'], {
      cwd: root,
      encoding: 'utf8',
    })

    expect(gitignore.map((line) => line.trim())).toContain('dist/')
    expect(tracked.stdout.trim()).toBe('')
  })

  it('não copia a regra do core sob o src', () => {
    for (const file of webSourceFiles()) {
      const source = readFileSync(file, 'utf8')
      if (CORE_RULE_SYMBOL.test(source)) {
        expect(source, file).toMatch(/from '@study\/core'/)
      }
    }
  })
})

describe('S-36 web-tsconfig', () => {
  const config = readJson<TsConfig>('apps/web/tsconfig.json')

  it('herda o base com jsx, bundler e lib de browser', () => {
    expect(String(config.extends)).toMatch(/tsconfig\.base\.json$/)
    expect(config.compilerOptions).toMatchObject({
      jsx: 'react-jsx',
      module: 'esnext',
      moduleResolution: 'bundler',
      types: [],
    })
    expect(config.compilerOptions?.lib).toEqual(['es2023', 'DOM', 'DOM.Iterable'])
  })
})

describe('S-37 web-vitest-project', () => {
  const web = projectNamed('web')
  const manifest = readJson<PackageJson>('apps/web/package.json')

  it('roda os testes do web em jsdom a partir do apps/web', () => {
    expect(web?.root).toBe('./apps/web')
    expect(web?.environment).toBe('jsdom')
    expect(web?.include).toContain('test/**/*.test.ts')
    expect(web?.include).toContain('test/**/*.test.tsx')
  })

  it('leva o pnpm test a seis projetos', () => {
    expect(vitestConfig.test?.projects).toHaveLength(6)
  })

  it('carrega as dependências de teste no manifesto e no lockfile', () => {
    const lockfile = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')

    for (const dependency of [
      'vitest',
      '@testing-library/react',
      '@testing-library/jest-dom',
      'jsdom',
    ]) {
      const version = manifest.devDependencies?.[dependency]
      expect(version, dependency).toBeDefined()
      expect(lockfile).toContain(`${dependency}@${version}`)
    }
  })
})

describe('S-40 web-adr', () => {
  it('registra o scaffold do web num ADR aceito e nomeado pelo assunto', () => {
    const source = readFileSync(
      resolve(root, 'docs/adr/scaffold-do-apps-web-react-vite-e-mvc-por-feature.md'),
      'utf8',
    )

    expect(source).toContain("status: 'aceito'")
    expect(source).toContain('apps/web')
  })
})

describe('S-41 web-docs', () => {
  it('lista apps/web no README com 5 pacotes e 6 projetos', () => {
    const readme = textAt('README.md')

    expect(readme).toContain('apps/web')
    expect(readme).toContain('5 pacotes')
    expect(readme).toContain('6 projetos')
  })

  it('lista apps/web no layout do AGENTS', () => {
    expect(textAt('AGENTS.md')).toContain('apps/web')
  })
})

const webScaffoldCases = ['S-34', 'S-35', 'S-36', 'S-37', 'S-38', 'S-39', 'S-40', 'S-41', 'S-42', 'S-43']

describe('S-42 web-plan-ids', () => {
  const plan = textAt('docs/engenharia/PLANO-DE-TESTES.md')

  it('sobe a suíte de scaffold para S-01..S-61 e lista os casos do web', () => {
    expect(plan).toContain('### Suíte de scaffold (S-01..S-61)')
    for (const id of webScaffoldCases) expect(plan, id).toContain(id)
  })

  it('deixa T, C e as faixas por camada intactos', () => {
    expect(plan).toContain('### Suíte de regra no core (C-01..C-65)')
    expect(planMandatoryCases()).toHaveLength(27)

    const ranges = [...layerCaseSection().matchAll(/([WPMD])-(\d{2})\.\.([WPMD])-(\d{2})/g)].map(
      (match) => `${match[1]}-${match[2]}..${match[3]}-${match[4]}`,
    )
    expect(ranges).toEqual(['W-01..W-14', 'P-01..P-04', 'M-01..M-05', 'D-01..D-03'])
  })

  it('atualiza o literal do S-33 para o título novo', () => {
    const previousTitle = ['### Suíte de scaffold (S-01', 'S-33)'].join('..')

    expect(textAt('tests/scaffold.test.ts')).toContain('S-01..S-61')
    expect(textAt('tests/scaffold.test.ts')).not.toContain(previousTitle)
  })
})

type DesktopManifest = WebManifest

const DESKTOP_SOURCE_PATTERN = /\.(ts|cjs)$/

function desktopSourceFiles(): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (DESKTOP_SOURCE_PATTERN.test(entry.name)) files.push(path)
    }
  }
  walk(resolve(root, 'apps/desktop/src'))
  return files
}

function desktopFiles(pattern: RegExp): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (pattern.test(entry.name)) files.push(path)
    }
  }
  walk(resolve(root, 'apps/desktop'))
  return files
}

describe('S-44 desktop-member-manifest', () => {
  const manifest = readJson<DesktopManifest>('apps/desktop/package.json')

  it('declara @study/desktop como membro privado e módulo em node >= 24', () => {
    expect(manifest).toMatchObject({
      name: '@study/desktop',
      private: true,
      type: 'module',
      engines: { node: '>=24' },
    })
  })

  it('expõe o script typecheck que o pnpm -r typecheck alcança', () => {
    expect(manifest.scripts?.typecheck).toBe('tsc --noEmit -p tsconfig.json')
  })

  it('fica coberto pelo glob apps/* sem mexer no pnpm-workspace', () => {
    expect(readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')).toContain('apps/*')
  })

  it('não declara campos de publicação', () => {
    for (const field of ['bin', 'files', 'publishConfig', 'build']) {
      expect(manifest, field).not.toHaveProperty(field)
    }
  })
})

describe('S-45 desktop-deps-from-src-no-copy', () => {
  const manifest = readJson<PackageJson>('apps/desktop/package.json')

  it('toma o core do workspace pelo src', () => {
    expect(manifest.devDependencies?.['@study/core']).toBe('workspace:*')
  })

  it('pina electron e playwright-core no manifesto e no lockfile', () => {
    const lockfile = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')

    for (const dependency of ['electron', 'playwright-core']) {
      const version = manifest.devDependencies?.[dependency]
      expect(version, dependency).toBeDefined()
      expect(lockfile).toContain(`${dependency}@${version}`)
    }
  })

  it('não versiona o dist do desktop', () => {
    const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8').split('\n')
    const tracked = spawnSync('git', ['ls-files', '--', 'apps/desktop/dist'], {
      cwd: root,
      encoding: 'utf8',
    })

    expect(gitignore.map((line) => line.trim())).toContain('dist/')
    expect(tracked.stdout.trim()).toBe('')
  })

  it('não copia a regra do core sob o src', () => {
    for (const file of desktopSourceFiles()) {
      const source = readFileSync(file, 'utf8')
      if (CORE_RULE_SYMBOL.test(source)) {
        expect(source, file).toMatch(/from '@study\/core'/)
      }
    }
  })
})

describe('S-46 desktop-tsconfig', () => {
  const config = readJson<TsConfig>('apps/desktop/tsconfig.json')

  it('herda o base com tipos de node e sem DOM', () => {
    expect(String(config.extends)).toMatch(/tsconfig\.base\.json$/)
    expect(config.compilerOptions?.types).toEqual(['node'])
    expect(config.compilerOptions?.lib ?? []).not.toContain('DOM')
  })
})

describe('S-47 desktop-vitest-project', () => {
  const desktop = projectNamed('desktop')

  it('roda os testes do desktop a partir do apps/desktop', () => {
    expect(desktop?.root).toBe('./apps/desktop')
    expect(desktop?.environment).toBe('node')
    expect(desktop?.include).toContain('test/**/*.test.ts')
  })

  it('usa o teto de 120s que o build do web e os dois lançamentos pedem', () => {
    expect(desktop?.testTimeout).toBe(120_000)
    expect(desktop?.hookTimeout).toBe(120_000)
  })

  it('serializa os arquivos para o download e os lançamentos do Electron não correrem juntos', () => {
    expect(desktop?.fileParallelism).toBe(false)
  })

  it('leva o pnpm test a seis projetos', () => {
    expect(vitestConfig.test?.projects).toHaveLength(6)
  })
})

describe('S-48 desktop-main-window', () => {
  const main = textAt('apps/desktop/src/main.ts')

  it('cria a BrowserWindow com as três flags de isolamento', () => {
    expect(main).toContain('new BrowserWindow')
    expect(main).toContain('contextIsolation: true')
    expect(main).toContain('sandbox: true')
    expect(main).toContain('nodeIntegration: false')
  })

  it('carrega o dev server por STUDY_WEB_URL e o bundle por study://', () => {
    expect(main).toContain('STUDY_WEB_URL')
    expect(main).toContain('STUDY_WEB_DIST')
    expect(main).toContain('http://localhost:4173')
    expect(main).toContain('registerSchemesAsPrivileged')
    expect(main).toContain('protocol.handle')
    expect(main).toContain('study://app')
    expect(main).toContain('loadURL')
    expect(main).not.toContain('loadFile')
  })

  it('o Vite do web usa a mesma porta com strictPort', () => {
    const vite = textAt('apps/web/vite.config.ts')

    expect(vite).toContain('port: 4173')
    expect(vite).toContain('strictPort: true')
  })
})

const preloadPath = 'apps/desktop/src/preload.cjs'

describe('S-49 desktop-preload-bridge', () => {
  const preload = textAt(preloadPath)

  it('expõe só a ponte studyDesktop pelo contextBridge', () => {
    expect(preload).toContain('contextBridge')
    expect(preload).toContain("exposeInMainWorld('studyDesktop'")
    expect(preload).toContain('process.platform')
    expect(preload).toContain('process.versions.electron')
  })

  it('fica em CJS, porque o preload em sandbox não aceita ESM', () => {
    expect(existsSync(resolve(root, preloadPath))).toBe(true)
    expect(preload).toContain('require(')
    expect(preload).not.toMatch(/^\s*import\s/m)
  })
})

describe('S-50 desktop-smoke-electron', () => {
  const smoke = textAt('apps/desktop/test/smoke.test.ts')
  const harness = textAt('apps/desktop/test/electron.ts')

  it('lança o Electron real sobre o bundle, sem dev server', () => {
    expect(smoke).toContain('_electron.launch')
    expect(smoke).toContain('firstWindow')
    expect(smoke).toContain('STUDY_WEB_DIST')
    expect(smoke).toContain('STUDY_USER_DATA')
    expect(smoke).toContain('STUDY_WEB_URL')
    expect(smoke).toContain('study://app')
    expect(smoke).toContain("'@study/web', 'build'")
    expect(smoke).toContain('listItems')
    expect(smoke).toContain('studyDesktop')
    expect(smoke).toContain('getLastWebPreferences')
  })

  it('pré-checa o binário do Electron com causa e remédio, sem skip', () => {
    expect(harness).toContain("require('electron')")
    expect(harness).toContain('allowBuilds')
    expect(smoke).not.toContain('it.skip')
    expect(smoke).not.toContain('describe.skip')
    expect(harness).not.toContain('it.skip')
  })
})

describe('S-51 desktop-no-web-ui-dup', () => {
  it('não tem tela nem arquivo .tsx sob apps/desktop', () => {
    expect(desktopFiles(/\.tsx$/)).toEqual([])
  })

  it('não é importado nem exigido pelo apps/web/src', () => {
    for (const file of webSourceFiles()) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toContain('@study/desktop')
      expect(source, file).not.toContain('studyDesktop')
    }
  })
})

describe('S-52 desktop-adr', () => {
  it('registra o scaffold do desktop num ADR aceito e nomeado pelo assunto', () => {
    const source = readFileSync(
      resolve(root, 'docs/adr/scaffold-do-apps-desktop-com-electron.md'),
      'utf8',
    )

    expect(source).toContain("status: 'aceito'")
    expect(source).toContain('apps/desktop')
  })
})

describe('S-53 desktop-docs', () => {
  it('lista apps/desktop no README com 5 pacotes e 6 projetos', () => {
    const readme = textAt('README.md')

    expect(readme).toContain('apps/desktop')
    expect(readme).toContain('5 pacotes')
    expect(readme).toContain('6 projetos')
  })

  it('lista apps/desktop no layout do AGENTS', () => {
    expect(textAt('AGENTS.md')).toContain('apps/desktop')
  })

  it('mantém DESKTOP.md e o plano citando o scaffold', () => {
    expect(textAt('docs/especificacao/DESKTOP.md')).toContain('apps/desktop')
    expect(textAt('docs/engenharia/PLANO-DE-TESTES.md')).toContain('scaffold')
  })
})

const desktopScaffoldCases = [
  'S-44',
  'S-45',
  'S-46',
  'S-47',
  'S-48',
  'S-49',
  'S-50',
  'S-51',
  'S-52',
  'S-53',
  'S-54',
  'S-55',
  'S-56',
  'S-57',
  'S-58',
  'S-59',
  'S-60',
  'S-61',
]

describe('S-54 desktop-plan-ids', () => {
  const plan = textAt('docs/engenharia/PLANO-DE-TESTES.md')

  it('sobe a suíte de scaffold para S-01..S-61 e lista os casos do desktop', () => {
    expect(plan).toContain('### Suíte de scaffold (S-01..S-61)')
    for (const id of desktopScaffoldCases) expect(plan, id).toContain(id)
  })

  it('move o topo antigo: não sobra o título nem o literal anteriores', () => {
    const previousTitle = ['### Suíte de scaffold (S-01', 'S-43)'].join('..')
    const previousCases = ['S-01', 'S-43'].join('..')

    expect(plan).not.toContain(previousTitle)
    expect(textAt('tests/scaffold.test.ts')).not.toContain(previousCases)
    expect(textAt('tests/scaffold.test.ts')).toContain('S-01..S-61')
  })

  it('registra o D-01 e o D-02 cobertos, com o D-03 pendente', () => {
    expect(plan).toMatch(/D-01[^\n]*coberto/)
    expect(plan).toMatch(/D-02[^\n]*coberto em parte/)
    expect(plan).toMatch(/D-03[^\n]*pendente/)
  })
})

describe('S-55 desktop-loading-origin-adr', () => {
  const adrPath = 'docs/adr/origem-de-carregamento-do-renderer-no-desktop.md'

  it('registra a origem de carregamento num ADR aceito e nomeado pelo assunto', () => {
    const source = readFileSync(resolve(root, adrPath), 'utf8')

    expect(source).toContain("status: 'aceito'")
    expect(source).toContain('study://app')
  })

  it('fica coberto pela linha docs/adr/ do índice', () => {
    const directory = adrPath.slice(0, adrPath.lastIndexOf('/') + 1)
    const row = indexRows().find((line) => line.includes(`\`${directory}\``))

    expect(row, `${directory} ausente no índice`).toBeDefined()
    expect(existsSync(resolve(root, adrPath)), adrPath).toBe(true)
    expect(adrPath.startsWith(directory)).toBe(true)
  })

  it('entra na faixa S-01..S-61 do plano', () => {
    const plan = textAt('docs/engenharia/PLANO-DE-TESTES.md')

    expect(plan).toContain('S-55')
    expect(plan).toContain('### Suíte de scaffold (S-01..S-61)')
  })
})
