import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORE_VERSION } from '@study/core'

const srcDir = resolve(import.meta.dirname, '../src')

const FORBIDDEN_MODULES = new Set([
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'process',
  'stream',
  'tls',
  'url',
  'util',
  'worker_threads',
])

const FORBIDDEN_GLOBALS = /\b(document|window|localStorage)\b/

const FORBIDDEN_SOURCE_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['Date.now()', /\bDate\.now\s*\(/],
  ['new Date() with no arguments', /\bnew Date\(\s*\)/],
  ['Math.random()', /\bMath\.random\s*\(/],
  ['crypto', /\bcrypto\b/],
  ['performance.now()', /\bperformance\.now\s*\(/],
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

function moduleSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  for (const pattern of [
    /from\s*['"]([^'"]+)['"]/g,
    /import\s*['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

describe('S-01 core purity', () => {
  it('has at least one source file to scan', () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(0)
  })

  it.each(sourceFiles(srcDir))('%s stays free of Node and browser APIs', (file) => {
    const source = readFileSync(file, 'utf8')
    const name = relative(srcDir, file)

    for (const specifier of moduleSpecifiers(source)) {
      expect(
        specifier.startsWith('node:') || FORBIDDEN_MODULES.has(specifier),
        `${name} imports "${specifier}"`,
      ).toBe(false)
    }

    const global = source.match(FORBIDDEN_GLOBALS)
    expect(global, `${name} touches the global "${global?.[0]}"`).toBeNull()
  })
})

describe('S-02 core resolution canary', () => {
  it('resolves the workspace package and exposes its version', () => {
    expect(CORE_VERSION).toBe('0.0.0')
  })
})

describe('S-16 core reads no ambient clock or randomness', () => {
  it.each(sourceFiles(srcDir))('%s takes time and ids only from deps', (file) => {
    const source = readFileSync(file, 'utf8')
    const name = relative(srcDir, file)

    for (const [label, pattern] of FORBIDDEN_SOURCE_PATTERNS) {
      const found = source.match(pattern)?.[0] ?? null
      expect(found, `${name} reaches for ${label}`).toBeNull()
    }
  })
})
