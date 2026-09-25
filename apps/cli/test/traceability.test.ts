import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PLAN_DOC = resolve(import.meta.dirname, '../../../docs/engenharia/PLANO-DE-TESTES.md')
const TEST_ROOT = import.meta.dirname

type PlanCase = {
  readonly id: string
  readonly caseName: string
  readonly manual: boolean
}

type TestFile = {
  readonly path: string
  readonly text: string
}

function readPlan(): string {
  return readFileSync(PLAN_DOC, 'utf8')
}

function sectionOf(document: string, heading: string): string {
  return document.split(`\n${heading}\n`)[1] ?? ''
}

function cellsOf(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function planCases(): PlanCase[] {
  return sectionOf(readPlan(), '## Casos obrigatórios')
    .split('\n')
    .filter((line) => /^\| T-\d{2} \|/.test(line))
    .map((line) => {
      const cells = cellsOf(line)
      const caseName = cells[1] ?? ''
      return { id: cells[0] ?? '', caseName, manual: caseName.includes('(manual)') }
    })
}

function cliRequirementRange(): string[] {
  const row = sectionOf(readPlan(), '## Estratégia')
    .split('\n')
    .find((line) => /^\| `?CLI`? \|/.test(line))

  if (row === undefined) throw new Error('linha CLI ausente na tabela ## Estratégia')
  const match = /RF-(\d{2})\.\.RF-(\d{2})/.exec(row)
  if (match === null) throw new Error('faixa RF-nn ausente na linha CLI')

  const from = Number(match[1])
  const to = Number(match[2])
  return Array.from(
    { length: to - from + 1 },
    (_, index) => `RF-${String(from + index).padStart(2, '0')}`,
  )
}

function spawningTestFiles(): TestFile[] {
  const files: TestFile[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        walk(path)
        continue
      }
      if (!entry.name.endsWith('.test.ts')) continue
      const text = readFileSync(path, 'utf8')
      if (!text.includes('runStudy(')) continue
      files.push({ path, text })
    }
  }
  walk(TEST_ROOT)
  return files
}

function hasToken(text: string, token: string): boolean {
  return new RegExp(`\\b${token}\\b`).test(text)
}

describe('S-23 rastreabilidade T-nn do CLI', () => {
  const cases = planCases()
  const files = spawningTestFiles()

  it('plan-casos-forma: a tabela tem 27 ids contíguos, únicos, e marca só o T-26 como manual', () => {
    const ids = cases.map((entry) => entry.id)
    const expected = Array.from(
      { length: 27 },
      (_, index) => `T-${String(index + 1).padStart(2, '0')}`,
    )

    expect(ids).toEqual(expected)
    expect(new Set(ids).size).toBe(ids.length)
    expect(cases.filter((entry) => entry.manual).map((entry) => entry.id)).toEqual(['T-26'])
  })

  it('plan-cli-vinculo: todo T-nn não manual tem token num arquivo que dá spawn', () => {
    const required = cases.filter((entry) => !entry.manual)
    expect(required).toHaveLength(26)

    for (const entry of required) {
      const found = files.some((file) => hasToken(file.text, entry.id))
      expect(found, `${entry.id} (${entry.caseName}) sem token num arquivo que dá spawn`).toBe(true)
    }
  })
})

describe('S-24 os fluxos RF pelo binário', () => {
  const requirements = cliRequirementRange()
  const files = spawningTestFiles()

  it('rf-vinte-pelo-bin: a faixa RF-01..RF-20 do plano tem token em arquivo que exercita --json', () => {
    expect(requirements).toHaveLength(20)

    for (const requirement of requirements) {
      const found = files.some(
        (file) => hasToken(file.text, requirement) && file.text.includes('--json'),
      )
      expect(found, `${requirement} sem token num arquivo que exercita --json`).toBe(true)
    }
  })
})
