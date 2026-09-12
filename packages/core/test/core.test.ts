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

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return entry.name.endsWith('.ts') ? [full] : []
  })
}

function moduleSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  for (const pattern of [/from\s*['"]([^'"]+)['"]/g, /import\s*['"]([^'"]+)['"]/g]) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

describe('T-01 core purity', () => {
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

describe('T-02 core resolution canary', () => {
  it('resolves the workspace package and exposes its version', () => {
    expect(CORE_VERSION).toBe('0.0.0')
  })
})
