import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isJsxText,
  type Node,
} from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(import.meta.dirname, '../src')
const STRINGS_FILE = 'strings.ts'
const STORE_PREFIX = 'store/'
const SOURCE_PATTERN = /\.tsx?$/
const NON_ASCII = /[\u0080-\uffff]/
const WORD = /[A-Za-z]{2,}/

function sourceFiles(dir: string = SRC): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...sourceFiles(path))
    else if (SOURCE_PATTERN.test(entry.name)) files.push(path)
  }
  return files
}

function rel(path: string): string {
  return relative(SRC, path)
}

function sweptFiles(): string[] {
  return sourceFiles().filter((path) => {
    const name = rel(path)
    return name !== STRINGS_FILE && !name.startsWith(STORE_PREFIX)
  })
}

function jsxTextOffenders(source: string): string[] {
  const file = createSourceFile('sweep.tsx', source, ScriptTarget.Latest, true, ScriptKind.TSX)
  const offenders: string[] = []

  const visit = (node: Node): void => {
    if (isJsxText(node)) {
      const text = node.text.trim()
      if (WORD.test(text)) offenders.push(text)
    }
    forEachChild(node, visit)
  }

  visit(file)
  return offenders
}

describe('AC-10 strings pt-BR num módulo único', () => {
  it('strings-sem-pt-br-fora-do-modulo-unico', () => {
    const offenders = sweptFiles()
      .filter((path) => NON_ASCII.test(readFileSync(path, 'utf8')))
      .map(rel)

    expect(offenders).toEqual([])
  })

  it('strings-sem-texto-jsx-solto-fora-do-modulo', () => {
    const offenders = sweptFiles()
      .filter((path) => path.endsWith('.tsx'))
      .flatMap((path) =>
        jsxTextOffenders(readFileSync(path, 'utf8')).map((text) => `${rel(path)}: ${text}`),
      )

    expect(offenders).toEqual([])
  })
})
