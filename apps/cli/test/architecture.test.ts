import { readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(import.meta.dirname, '../src')
const ADR_DIR = resolve(import.meta.dirname, '../../../docs/adr')
const DOCS_README = resolve(import.meta.dirname, '../../../docs/README.md')

type Zone = 'controller' | 'view' | 'model' | 'root'

function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...sourceFiles(path))
    else if (entry.name.endsWith('.ts')) files.push(path)
  }
  return files
}

function zoneOf(path: string): Zone {
  const rel = relative(SRC, path)
  if (rel.startsWith('commands/') || rel === 'tui/session.ts') return 'controller'
  if (rel.startsWith('output/')) return 'view'
  if (rel.startsWith('persistence/') || rel.startsWith('model/')) return 'model'
  return 'root'
}

function specifiersOf(path: string): string[] {
  return [...readFileSync(path, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '')
}

function targetOf(path: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  return resolve(dirname(path), specifier)
}

function filesInZone(zone: Zone): string[] {
  return sourceFiles(SRC).filter((path) => zoneOf(path) === zone)
}

function relativeImportsInto(zone: Zone): { file: string; specifier: string; target: string }[] {
  return filesInZone(zone).flatMap((file) =>
    specifiersOf(file).flatMap((specifier) => {
      const target = targetOf(file, specifier)
      if (target === null || !target.startsWith(SRC)) return []
      return [{ file, specifier, target }]
    }),
  )
}

function rel(path: string): string {
  return relative(SRC, path)
}

describe('AC3 — a direção dos imports das camadas', () => {
  it('arch-controller-nao-importa-view: nenhum controller importa a view', () => {
    const offenders = relativeImportsInto('controller')
      .filter((entry) => zoneOf(entry.target) === 'view')
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-view-nao-importa-controller: nenhum arquivo da view importa um controller', () => {
    const offenders = relativeImportsInto('view')
      .filter((entry) => zoneOf(entry.target) === 'controller')
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-model-nao-importa-view-nem-controller: o model não importa view nem controller', () => {
    const offenders = relativeImportsInto('model')
      .filter((entry) => {
        const zone = zoneOf(entry.target)
        return zone === 'view' || zone === 'controller'
      })
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-controller-sem-io-de-processo: o controller não escreve em process', () => {
    const offenders = filesInZone('controller')
      .filter((file) => /process\.(stdout|stderr|stdin)/.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })
})

describe('AC6 — o ADR da arquitetura MVC', () => {
  it('arch-adr-031-aceito-e-indexado: existe, está aceito, linkado e contado', () => {
    const adr31 = readdirSync(ADR_DIR).filter((name) => name.startsWith('adr-031'))
    const index = readFileSync(resolve(ADR_DIR, 'README.md'), 'utf8')
    const count = readdirSync(ADR_DIR).filter((name) => name !== 'README.md').length

    expect(adr31).toHaveLength(1)
    expect(index).toContain(adr31[0] ?? '')
    expect(readFileSync(resolve(ADR_DIR, adr31[0] ?? ''), 'utf8')).toContain("status: 'aceito'")
    expect(readFileSync(DOCS_README, 'utf8')).toContain(`${count} ADRs`)
  })
})
