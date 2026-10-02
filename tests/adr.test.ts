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

describe('identidade visual da TUI fora do design system', () => {
  const identity = 'docs/adr/identidade-visual-da-tui-fora-do-design-system.md'
  const surface = 'docs/adr/superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md'

  const identitySource = (): string => sourceAt(identity)

  it('adr-compara-tres-opcoes: compara tokens, camada agnóstica e manter fora', () => {
    const source = identitySource()

    expect(source).toContain('Compartilhar só tokens')
    expect(source).toContain('Expor camada agnóstica')
    expect(source).toContain('Manter a TUI fora')
  })

  it('adr-colisao-zero-dep-e-s28: liga cada opção ao zero-dep e ao S-28', () => {
    const source = identitySource()

    expect(source).toContain('superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md')
    expect(source).toContain('S-28')
    expect(source).toContain('dependencies')
  })

  it('adr-recomendacao-unica-com-custo: registra a recomendação e o custo', () => {
    const source = identitySource()

    expect(source).toContain('não adotar')
    expect(source).toContain('ADR novo')
    expect(source).toContain('referência cruzada')
  })

  it('adr-licenca-mit: registra a licença MIT resolvida e que ela não é obstáculo', () => {
    const source = identitySource()

    expect(source).toContain('MIT')
    expect(source).toContain('não é obstáculo')
  })

  it('adr-sem-ticket-derivado: dispensa ticket derivado e nomeia o gatilho', () => {
    const source = identitySource()

    expect(source).toContain('nenhum ticket')
    expect(source).toContain('camada agnóstica')
    expect(source).toContain('BOS-64')
  })

  it('adr-novo-referenciado-pela-superficie: o ADR da superfície aponta para o novo', () => {
    expect(sourceAt(surface)).toContain('identidade-visual-da-tui-fora-do-design-system.md')
  })
})
