import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(import.meta.dirname, '../src')

type Zone = 'controller' | 'view' | 'model' | 'root'

const SOURCE_PATTERN = /\.tsx?$/
const REACT_PATTERN = /^react(-dom)?(\/|$)/
const DOM_GLOBAL_PATTERN = /\b(document|window)\b/

function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...sourceFiles(path))
    else if (SOURCE_PATTERN.test(entry.name)) files.push(path)
  }
  return files
}

function zoneOf(path: string): Zone {
  const match = /^features\/[^/]+\/(model|view|controller)\//.exec(relative(SRC, path))
  if (match?.[1] === 'model' || match?.[1] === 'view' || match?.[1] === 'controller') {
    return match[1]
  }
  return 'root'
}

function specifiersOf(path: string): string[] {
  return [...readFileSync(path, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '')
}

function resolveTarget(path: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null
  const target = resolve(dirname(path), specifier)
  return target.startsWith(SRC) && existsSync(target) ? target : null
}

function filesInZone(zone: Zone): string[] {
  return sourceFiles(SRC).filter((path) => zoneOf(path) === zone)
}

function zonesReached(target: string, seen: Set<string> = new Set<string>()): Zone[] {
  if (seen.has(target)) return []
  seen.add(target)

  const zone = zoneOf(target)
  if (zone !== 'root') return [zone]

  return [
    zone,
    ...specifiersOf(target).flatMap((specifier) => {
      const next = resolveTarget(target, specifier)
      return next === null ? [] : zonesReached(next, seen)
    }),
  ]
}

function importsFrom(zone: Zone): { file: string; specifier: string; zones: Zone[] }[] {
  return filesInZone(zone).flatMap((file) =>
    specifiersOf(file).flatMap((specifier) => {
      const target = resolveTarget(file, specifier)
      return target === null ? [] : [{ file, specifier, zones: zonesReached(target) }]
    }),
  )
}

function rel(path: string): string {
  return relative(SRC, path)
}

describe('S-38 web-layer-direction', () => {
  it('arch-controller-nao-importa-view: nenhum controller importa a view', () => {
    const offenders = importsFrom('controller')
      .filter((entry) => entry.zones.includes('view'))
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-view-nao-importa-controller: nenhuma view importa um controller', () => {
    const offenders = importsFrom('view')
      .filter((entry) => entry.zones.includes('controller'))
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-model-nao-importa-view-nem-controller: o model não importa view nem controller', () => {
    const offenders = importsFrom('model')
      .filter((entry) => entry.zones.includes('view') || entry.zones.includes('controller'))
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-model-sem-react-nem-dom: o model não importa react/react-dom nem toca o DOM', () => {
    const reactOffenders = filesInZone('model')
      .flatMap((file) => specifiersOf(file).map((specifier) => ({ file, specifier })))
      .filter((entry) => REACT_PATTERN.test(entry.specifier))
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)
    const domOffenders = filesInZone('model')
      .filter((file) => DOM_GLOBAL_PATTERN.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(reactOffenders).toEqual([])
    expect(domOffenders).toEqual([])
  })

  it('arch-root-compõe: a feature tem model, view, controller e o barrel ligando as três', () => {
    const zones = new Set(sourceFiles(SRC).map(zoneOf))

    expect(zones.has('model')).toBe(true)
    expect(zones.has('view')).toBe(true)
    expect(zones.has('controller')).toBe(true)
    expect(zoneOf(resolve(SRC, 'features/due/index.ts'))).toBe('root')
  })
})
