import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(import.meta.dirname, '../src')

type Zone = 'controller' | 'view' | 'model' | 'store' | 'root'

const SOURCE_PATTERN = /\.tsx?$/
const REACT_PATTERN = /^react(-dom)?(\/|$)/
const DOM_GLOBAL_PATTERN = /\b(document|window)\b/
const NETWORK_PATTERN = /fetch\(|XMLHttpRequest|WebSocket|navigator\.onLine|https?:\/\//
const GLOBAL_READ_PATTERN = /\b(globalThis|performance)\b/

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
  const relativePath = relative(SRC, path)
  if (/^store\//.test(relativePath)) return 'store'
  const match = /^features\/[^/]+\/(model|view|controller)\//.exec(relativePath)
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

  it('arch-model-nao-importa-a-borda: o model não alcança deps.ts nem store', () => {
    const offenders = filesInZone('model')
      .flatMap((file) =>
        specifiersOf(file).flatMap((specifier) => {
          const target = resolveTarget(file, specifier)
          if (target === null) return []
          const name = rel(target)
          const isBorder = name === 'deps.ts' || name.startsWith('store/')
          return isBorder ? [`${rel(file)} -> ${specifier}`] : []
        }),
      )

    expect(offenders).toEqual([])
  })

  it('arch-root-compõe: a feature tem model, view, controller e o barrel ligando as três', () => {
    const zones = new Set(sourceFiles(SRC).map(zoneOf))

    expect(zones.has('model')).toBe(true)
    expect(zones.has('view')).toBe(true)
    expect(zones.has('controller')).toBe(true)
    expect(zoneOf(resolve(SRC, 'features/due/index.ts'))).toBe('root')
  })
})

describe('S-38 web-store-separation', () => {
  it('arch-store-zona-existe: a zona store enxerga os módulos do store', () => {
    expect(filesInZone('store').map(rel).toSorted()).toEqual([
      'store/idb.ts',
      'store/index.ts',
      'store/mapping.ts',
      'store/schema.ts',
      'store/store.ts',
    ])
  })

  it('arch-store-nao-importa-react: o store não importa react/react-dom', () => {
    const offenders = filesInZone('store')
      .flatMap((file) => specifiersOf(file).map((specifier) => ({ file, specifier })))
      .filter((entry) => REACT_PATTERN.test(entry.specifier))
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-store-sem-dom: o store não toca document nem window', () => {
    const offenders = filesInZone('store')
      .filter((file) => DOM_GLOBAL_PATTERN.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })

  it('arch-store-nao-importa-features: o store não alcança model, view nem controller', () => {
    const offenders = importsFrom('store')
      .filter(
        (entry) =>
          entry.zones.includes('model') ||
          entry.zones.includes('view') ||
          entry.zones.includes('controller'),
      )
      .map((entry) => `${rel(entry.file)} -> ${entry.specifier}`)

    expect(offenders).toEqual([])
  })

  it('arch-store-sem-rede: nenhum caminho do store toca API de rede', () => {
    const offenders = filesInZone('store')
      .filter((file) => NETWORK_PATTERN.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })

  it('arch-store-globais-so-no-idb: fora do idb.ts o store não lê global', () => {
    const offenders = filesInZone('store')
      .filter((file) => relative(SRC, file) !== 'store/idb.ts')
      .filter((file) => GLOBAL_READ_PATTERN.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })
})

type WebManifest = {
  readonly dependencies?: Record<string, string>
}

describe('AC-12 web-integridade', () => {
  it('web-manifesto-sem-dependencia-nova-de-runtime', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
    ) as WebManifest

    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(['react', 'react-dom'])
  })

  it('web-src-sem-api-de-rede', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => NETWORK_PATTERN.test(readFileSync(file, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })
})
