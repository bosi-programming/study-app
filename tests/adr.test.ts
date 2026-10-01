import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const adrDir = resolve(root, 'docs/adr')
const indexPath = 'docs/adr/README.md'

function sourceAt(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function adrFiles(): string[] {
  return readdirSync(adrDir).filter((file) => file.endsWith('.md') && file !== 'README.md')
}

describe('S-61 desktop-adrs-de-pacote', () => {
  const packaging = 'docs/adr/empacotador-do-desktop.md'
  const signing = 'docs/adr/assinatura-dos-instaladores-do-desktop.md'

  it('aceita o ADR do empacotador com frontmatter', () => {
    const source = sourceAt(packaging)

    expect(source).toMatch(/^titulo: /m)
    expect(source).toMatch(/^data: /m)
    expect(source).toMatch(/^status: 'aceito'/m)
    expect(source).toContain('electron-builder')
  })

  it('aceita o ADR do fluxo de assinatura com frontmatter', () => {
    const source = sourceAt(signing)

    expect(source).toMatch(/^titulo: /m)
    expect(source).toMatch(/^data: /m)
    expect(source).toMatch(/^status: 'aceito'/m)
    expect(source).toContain('notarytool')
    expect(source).toContain('signtool')
    expect(source).toContain('GPG')
  })

  it('indexa todo ADR no README da pasta', () => {
    const index = sourceAt(indexPath)

    for (const file of adrFiles()) {
      expect(index, file).toContain(file)
    }
  })

  it('aponta o índice de documentos para o índice dos ADRs', () => {
    expect(sourceAt('docs/README.md')).toContain('docs/adr/README.md')
  })

  it('não cita ADR por número no índice', () => {
    expect(sourceAt(indexPath)).not.toMatch(/ADR-\d{3}/)
  })
})
