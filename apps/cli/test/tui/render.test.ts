import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type Item } from '@study/core'
import { describe, expect, it } from 'vitest'
import { type RenderState, render, startField } from '../../src/tui/render/index.ts'
import { makeItem, makeLog } from '../persistence/helpers.ts'

const ESC = '\u001b['
const ACCENT = `${ESC}38;2;232;161;59m`
const TODAY = '2026-09-28'
const RENDER_DIR = resolve(import.meta.dirname, '../../src/tui/render')

const QUEUE: readonly Item[] = [
  makeItem({ id: 'a1', title: 'Derivadas parciais', subject: 'Cálculo', difficulty: 4, review_count: 2, due_date: '2026-08-22' }),
  makeItem({ id: 'a2', title: 'Árvores balanceadas AVL', subject: 'Estruturas de Dados', difficulty: 5, review_count: 0, due_date: '2026-09-07' }),
  makeItem({ id: 'a3', title: 'Phrasal verbs', subject: 'Inglês', difficulty: 3, review_count: 1, due_date: '2026-09-14' }),
  makeItem({ id: 'a4', title: 'Leis de Newton', subject: 'Física', difficulty: 2, review_count: 3, due_date: '2026-09-18' }),
  makeItem({ id: 'a5', title: 'Revolução Industrial', subject: 'História', difficulty: 3, review_count: 2, due_date: '2026-09-22' }),
  makeItem({ id: 'a6', title: 'Crase e regência verbal', subject: 'Português', difficulty: 2, review_count: 5, due_date: '2026-09-24' }),
  makeItem({ id: 'a7', title: 'Ciclo de Krebs e fosforilação oxidativa', subject: 'Biologia', difficulty: 4, review_count: 4, due_date: '2026-09-27' }),
  makeItem({ id: 'a8', title: 'Integrais por partes', subject: 'Cálculo', difficulty: 5, review_count: 1, due_date: '2026-09-25' }),
  makeItem({ id: 'b1', title: 'Séries de Taylor', subject: 'Cálculo', difficulty: 4, review_count: 1, due_date: TODAY }),
  makeItem({ id: 'b2', title: 'Estequiometria', subject: 'Química', difficulty: 3, review_count: 0, due_date: TODAY }),
  makeItem({ id: 'b3', title: 'Grafos: caminho mínimo', subject: 'Estruturas de Dados', difficulty: 5, review_count: 2, due_date: TODAY }),
  makeItem({ id: 'b4', title: 'Reported speech', subject: 'Inglês', difficulty: 2, review_count: 6, due_date: TODAY }),
]

const REFERENCE_FRAME = [
  'Fila de hoje — 2026-09-28',
  '────────────────────────────────────────────────────────────────────────────────────',
  'Atrasados (8)',
  '> 1.  [Cálculo]      Derivadas parciais         ! venceu 2026-08-22 (37d)    d4  n=2',
  '  2.  [Estruturas …] Árvores balanceadas AVL    ! venceu 2026-09-07 (21d)    d5  n=0',
  '  3.  [Inglês]       Phrasal verbs              ! venceu 2026-09-14 (14d)    d3  n=1',
  '  4.  [Física]       Leis de Newton             ! venceu 2026-09-18 (10d)    d2  n=3',
  '  5.  [História]     Revolução Industrial       ! venceu 2026-09-22 (6d)     d3  n=2',
  '  6.  [Português]    Crase e regência verbal    ! venceu 2026-09-24 (4d)     d2  n=5',
  '  7.  [Biologia]     Ciclo de Krebs e fosforila…! venceu 2026-09-27 (1d)     d4  n=4',
  '  8.  [Cálculo]      Integrais por partes       ! venceu 2026-09-25 (3d)     d5  n=1',
  '',
  'Hoje (4)',
  '  9.  [Cálculo]      Séries de Taylor           vence hoje                   d4  n=1',
  '  10. [Química]      Estequiometria             vence hoje                   d3  n=0',
  '  11. [Estruturas …] Grafos: caminho mínimo     vence hoje                   d5  n=2',
  '  12. [Inglês]       Reported speech            vence hoje                   d2  n=6',
  '────────────────────────────────────────────────────────────────────────────────────',
  'Enter revisar · i detalhe · ? ajuda · q sair                8 atrasados, 4 para hoje',
].join('\n')

const NARROW_FRAME = [
  'Fila de hoje — 2026-09-28',
  '────────────────────────────────────────────────────────────',
  'Atrasados (8)',
  '> 1.  [Cálculo] Derivadas p…! venceu 2026-08-22 (37… d4  n=2',
  '  2.  [Estrut…] Árvores bal…! venceu 2026-09-07 (21… d5  n=0',
  '  3.  [Inglês]  Phrasal ver…! venceu 2026-09-14 (14… d3  n=1',
  '  4.  [Física]  Leis de New…! venceu 2026-09-18 (10… d2  n=3',
  '  5.  [História]Revolução I…! venceu 2026-09-22 (6d) d3  n=2',
  '  6.  [Portug…] Crase e reg…! venceu 2026-09-24 (4d) d2  n=5',
  '  7.  [Biologia]Ciclo de Kr…! venceu 2026-09-27 (1d) d4  n=4',
  '  8.  [Cálculo] Integrais p…! venceu 2026-09-25 (3d) d5  n=1',
  '↓ 4 abaixo',
  '────────────────────────────────────────────────────────────',
  'Enter revisar · i detalhe · ? ajuda · q sair 8 atrasados, 4…',
].join('\n')

function state(overrides: Partial<RenderState> = {}): RenderState {
  return {
    today: TODAY,
    screen: 'queue',
    queue: QUEUE,
    focusId: 'a1',
    detail: null,
    reevaluation: null,
    confirmation: null,
    form: null,
    cold: null,
    items: null,
    config: null,
    path: null,
    confirm: null,
    streak: { streak_current: 4, streak_last_day: TODAY },
    banner: null,
    fatal: null,
    viewport: { columns: 84, rows: 24 },
    color: false,
    utf8: true,
    ...overrides,
  }
}

function stripAnsi(text: string): string {
  return text.replace(new RegExp(`${ESC}[0-9;]*m`, 'g'), '')
}

function linesOf(frame: string): string[] {
  return frame.split('\n')
}

function visibleWidth(text: string): number {
  return [...stripAnsi(text)].length
}

function isItemLine(line: string): boolean {
  return /^[> ]{2}\s*\d+\./.test(line)
}

function numberOf(line: string): number {
  return Number(/^[> ]{2}\s*(\d+)\./.exec(line)?.[1])
}

function withoutBoxChars(line: string): string {
  return line.replace(/[╭╮╰╯─│|+-]/g, ' ')
}

describe('AC1 — pureza', () => {
  it('render-deterministico: o mesmo estado devolve a mesma string', () => {
    expect(render(state())).toBe(render(state()))
  })

  it('render-sem-io: o fonte não toca em processo, relógio, ambiente nem no controller', () => {
    const sources = readdirSync(RENDER_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(resolve(RENDER_DIR, name), 'utf8'))
      .join('\n')

    expect(sources).not.toMatch(/process\./)
    expect(sources).not.toMatch(/from 'node:/)
    expect(sources).not.toMatch(/\bDate\b/)
    expect(sources).not.toMatch(/colorEnabled/)
    expect(sources).not.toMatch(/tui\/session/)
  })
})

describe('AC2 — os frames', () => {
  it('frame-fila: 84x24 desenha o retrato de referência (U-01)', () => {
    expect(render(state())).toBe(REFERENCE_FRAME)
  })

  it('frame-fila-60x15: a fronteira mínima também tem retrato de referência', () => {
    expect(render(state({ viewport: { columns: 60, rows: 15 } }))).toBe(NARROW_FRAME)
  })

  it('frame-detalhe: a tela de detalhe desenha a caixa com campos e histórico (U-05)', () => {
    const frame = render(state({ screen: 'detail', detail: { item: QUEUE[6] as Item, history: [makeLog()] } }))

    expect(frame).toContain('Detalhe')
    expect(frame).toContain('Dificuldade')
    expect(frame).toContain('Vencimento')
    expect(frame).toContain('Histórico (1)')
  })

  it('frame-reavaliacao: a reavaliação desenha o corpo da fila e o rodapé de quatro linhas (U-06)', () => {
    const frame = render(state({
      screen: 'reevaluate',
      confirmation: 'Ciclo de Krebs e fosforilação oxidativa',
      reevaluation: { item: QUEUE[6] as Item, currentDifficulty: 4 },
    }))

    expect(frame).toContain('Atrasados (8)')
    expect(frame).toContain('✓ Check-in registrado: Ciclo de Krebs e fosforilação oxidativa')
    expect(frame).toContain('Dificuldade atual: 4 — difícil')
    expect(frame).toContain('1 trivial   2 fácil   3 médio   4 difícil   5 muito difícil')
    expect(frame).toContain('Esc cancela · Enter mantém · 1–5 recalcula')
  })

  it('frame-ajuda: a ajuda desenha a caixa com as teclas e o lembrete (U-08)', () => {
    const frame = render(state({ screen: 'help' }))

    expect(frame).toContain('Ajuda')
    expect(frame).toContain('Os comandos de linha continuam sendo a porta de script')
    expect(frame).toContain('e de leitor de tela: a TUI nunca é a única forma de')
    expect(frame).toContain('fazer algo.')
    expect(frame).toContain('Esc · ? · q para fechar')
  })

  it.each([
    ['↑ ↓  k j', 'mover o foco na fila'],
    ['PgUp PgDn g G', 'rolar e ir às pontas'],
    ['Enter', 'check-in do item em foco'],
    ['1–5', 'reavaliar a dificuldade'],
    ['i', 'abrir o detalhe'],
    ['a  e', 'item novo e edição do foco'],
    ['x  X', 'arquivar e desarquivar'],
    ['D', 'remover o item em foco'],
    ['c', 'arquivo morto'],
    ['C', 'config'],
    ['E  I', 'exportar e importar'],
    ['l', 'lista de todas as fichas'],
    ['R  P', 'restaurar e purgar no arquivo morto'],
    ['y  n', 'confirmar e cancelar'],
    ['Esc  ?', 'fechar painel ou esta ajuda'],
    ['q  Ctrl-C', 'sair (Ctrl-C sai 130)'],
  ])('frame-ajuda: a linha de %s está na ajuda', (label, description) => {
    expect(render(state({ screen: 'help' }))).toContain(`│ ${label.padEnd(14)}${description}`)
  })

  it('frame-vazia: fila vazia desenha o estado vazio explícito (U-07)', () => {
    const frame = render(state({ queue: [], focusId: null }))

    expect(frame).toContain('Fila zerada')
  })

  it('frame-pequeno: abaixo de 60x15 só sai a mensagem de janela pequena (U-04)', () => {
    const small = 'Aumente a janela para pelo menos\n60 colunas e 15 linhas.'

    expect(render(state({ viewport: { columns: 59, rows: 24 } }))).toBe(small)
    expect(render(state({ viewport: { columns: 60, rows: 14 } }))).toBe(small)
  })
})

describe('AC3 — a fila', () => {
  it('fila-numeracao-continua: a numeração segue de Atrasados para Hoje', () => {
    const frame = render(state())

    expect(frame).toContain('> 1.  [Cálculo]')
    expect(frame).toContain('  8.  [Cálculo]')
    expect(frame).toContain('  9.  [Cálculo]')
    expect(frame).toContain('  12. [Inglês]')
  })

  it('fila-rodape-totais: o rodapé traz a dica de teclas e os totais', () => {
    const frame = render(state())

    expect(frame).toContain('Enter revisar · i detalhe · ? ajuda · q sair')
    expect(frame).toContain('8 atrasados, 4 para hoje')
  })

  it('fila-cabecalho-data: o cabeçalho traz a data do estado', () => {
    expect(render(state())).toContain('Fila de hoje — 2026-09-28')
  })

  it('fila-so-uma-secao: só a seção com itens aparece e numera desde 1', () => {
    const onlyToday = QUEUE.filter((item) => item.due_date === TODAY)
    const frame = render(state({ queue: onlyToday, focusId: 'b1' }))

    expect(frame).toContain('Hoje (4)')
    expect(frame).not.toContain('Atrasados')
    expect(frame).toContain('> 1.  [Cálculo]')
  })

  it('fila-marcador-foco: o > marca exatamente a linha em foco', () => {
    const frame = render(state({ focusId: 'a5' }))
    const marked = linesOf(frame).filter((line) => line.startsWith('> '))

    expect(marked).toHaveLength(1)
    expect(marked[0]).toContain('5.  [História]')
  })
})

describe('AC4 — foco e largura', () => {
  it('foco-mesma-largura: a linha em foco mede o mesmo que as demais', () => {
    const focused = linesOf(render(state())).filter((line) => line.startsWith('> '))[0] as string
    const other = linesOf(render(state())).filter(isItemLine)[1] as string

    expect(visibleWidth(focused)).toBe(visibleWidth(other))
  })

  it('largura-linha: em 84 e em 60 toda linha cabe e as linhas de item medem columns', () => {
    const wide = linesOf(render(state()))
    const narrow = linesOf(render(state({ viewport: { columns: 60, rows: 24 } })))

    const itemWidths = narrow.filter(isItemLine).map(visibleWidth)

    expect(Math.max(...wide.map(visibleWidth))).toBeLessThanOrEqual(84)
    expect(Math.max(...narrow.map(visibleWidth))).toBeLessThanOrEqual(60)
    expect([Math.min(...itemWidths), Math.max(...itemWidths)]).toEqual([60, 60])
  })

  it('foco-primeiro-ultimo: o foco no primeiro e no último item continua na janela', () => {
    const short = { columns: 84, rows: 15 }

    expect(render(state({ focusId: 'a1', viewport: short }))).toContain('> 1.  [Cálculo]')
    expect(render(state({ focusId: 'b4', viewport: short }))).toContain('> 12. [Inglês]')
  })

  it('largura-caixa: as caixas de detalhe e ajuda medem columns em 84 e em 60', () => {
    const detail = { item: QUEUE[6] as Item, history: [] }

    for (const columns of [84, 60]) {
      const frames = [
        render(state({ screen: 'detail', detail, viewport: { columns, rows: 24 } })),
        render(state({ screen: 'help', viewport: { columns, rows: 24 } })),
      ]
      for (const frame of frames) {
        const lines = linesOf(frame)
        expect(Math.max(...lines.map(visibleWidth))).toBeLessThanOrEqual(columns)
        expect(visibleWidth(lines[0] as string)).toBe(columns)
      }
    }
  })
})

describe('AC5 — truncamento', () => {
  it('truncamento-materia: a matéria longa trunca dentro dos colchetes', () => {
    expect(render(state())).toContain('[Estruturas …]')
  })

  it('truncamento-titulo: o título longo termina em reticências', () => {
    expect(render(state())).toContain('Ciclo de Krebs e fosforila…')
  })

  it('truncamento-code-point: o corte não parte um code point', () => {
    const emoji = makeItem({ id: 'c1', title: '👍'.repeat(40), subject: 'Cálculo', due_date: TODAY })
    const frame = render(state({ queue: [emoji], focusId: 'c1' }))

    expect(frame).toContain(`${'👍'.repeat(26)}…`)
  })

  it('sem-quebra: o título muito longo continua numa linha só', () => {
    const long = makeItem({ id: 'c1', title: 'Ciclo de Krebs e fosforilação oxidativa', subject: 'Biologia', due_date: TODAY })
    const frame = render(state({ queue: [long], focusId: 'c1' }))

    expect(linesOf(frame).filter((line) => line.includes('Ciclo de Krebs'))).toHaveLength(1)
  })
})

describe('AC6 — janela pequena', () => {
  it('limite-60x15: 60x15 desenha; 59 colunas ou 14 linhas caem na mensagem (U-04)', () => {
    expect(render(state({ viewport: { columns: 60, rows: 15 } }))).toContain('Fila de hoje')
    expect(render(state({ viewport: { columns: 59, rows: 15 } }))).not.toContain('Fila de hoje')
    expect(render(state({ viewport: { columns: 60, rows: 14 } }))).not.toContain('Fila de hoje')
  })

  it('janela-minima-truncada: abaixo da mensagem as duas linhas truncam com …', () => {
    const lines = linesOf(render(state({ viewport: { columns: 20, rows: 24 } })))

    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(20)
      expect(line).toContain('…')
    }
  })
})

describe('AC7 — bordas', () => {
  it('borda-utf8: a caixa usa os cantos e traços UTF-8', () => {
    const frame = render(state({ screen: 'help' }))

    expect(frame).toContain('╭─')
    expect(frame).toContain('╮')
    expect(frame).toContain('╰')
    expect(frame).toContain('╯')
    expect(frame).toContain('│')
  })

  it('borda-ascii: sem utf8 a caixa usa + - | com o mesmo texto', () => {
    const frame = render(state({ screen: 'help', utf8: false }))
    const utf8Frame = render(state({ screen: 'help' }))

    expect(frame).toContain('+- Ajuda')
    expect(frame).toContain('| ↑ ↓  k j      mover o foco na fila')
    expect(frame).not.toContain('╭')
    expect(linesOf(frame).map(withoutBoxChars)).toEqual(linesOf(utf8Frame).map(withoutBoxChars))
  })
})

describe('AC8 — cor', () => {
  it('sem-cor-marcador: sem cor o atraso traz o marcador textual e nenhum escape (U-03)', () => {
    const frame = render(state({ color: false }))

    expect(frame).toContain('! venceu 2026-08-22 (37d)')
    expect(frame).not.toContain(ESC)
  })

  it('com-cor-paleta: com cor a paleta entra e o marcador textual sai', () => {
    const colored = stripAnsi(render(state({ color: true })))
    const plain = render(state({ color: false }))

    expect(render(state({ color: true }))).toContain(ACCENT)
    expect(colored).toContain('venceu 2026-08-22 (37d)')
    expect(colored).not.toContain('! venceu')
    expect(plain).toContain('! venceu 2026-08-22 (37d)')
  })

  it('cor-mesma-largura: com e sem cor as larguras batem depois de remover o ANSI (U-03)', () => {
    const colored = linesOf(render(state({ color: true }))).map(visibleWidth)
    const plain = linesOf(render(state({ color: false }))).map(visibleWidth)

    expect(colored).toEqual(plain)
  })
})

describe('AC9 — contrato de estado', () => {
  it('detalhe-campos: os campos e o histórico saem do estado (U-05)', () => {
    const item = makeItem({
      id: 'd1',
      title: 'Detalhe',
      subject: 'Cálculo',
      difficulty: 3,
      interval_days: 12,
      review_count: 2,
      note: 'resumo do capítulo',
      link: 'exemplo.com',
      due_date: '2026-09-27',
    })
    const history = [makeLog({ review_count_after: 2, interval_after: 12, late: true })]
    const frame = render(state({ screen: 'detail', detail: { item, history } }))

    expect(frame).toContain('3 — médio')
    expect(frame).toContain('12d')
    expect(frame).toContain('resumo do capítulo')
    expect(frame).toContain('exemplo.com')
    expect(frame).toContain('active')
    expect(frame).toContain('n=2')
    expect(frame).toContain('atrasado')
  })

  it('detalhe-corte-por-altura: o histórico excedente é cortado pela altura', () => {
    const history = [
      makeLog({ reviewed_at: '2026-09-01T10:00:00Z', review_count_after: 1 }),
      makeLog({ reviewed_at: '2026-09-02T10:00:00Z', review_count_after: 2 }),
      makeLog({ reviewed_at: '2026-09-03T10:00:00Z', review_count_after: 3 }),
      makeLog({ reviewed_at: '2026-09-04T10:00:00Z', review_count_after: 4 }),
      makeLog({ reviewed_at: '2026-09-05T10:00:00Z', review_count_after: 5 }),
    ]
    const frame = render(state({
      screen: 'detail',
      detail: { item: QUEUE[6] as Item, history },
      viewport: { columns: 84, rows: 15 },
    }))

    expect(linesOf(frame)).toHaveLength(15)
    expect(frame).toContain('Histórico (5)')
    expect(frame).not.toContain('2026-09-05')
  })

  it('detalhe-sem-historico: sem histórico a seção mostra nenhum check-in', () => {
    const frame = render(state({ screen: 'detail', detail: { item: QUEUE[6] as Item, history: [] } }))

    expect(frame).toContain('Histórico (0)')
    expect(frame).toContain('nenhum check-in')
  })

  it.each(['queue', 'detail', 'reevaluate', 'help'] as const)(
    'fatal-vazio: com fatal a tela %s devolve string vazia',
    (screen) => {
      expect(render(state({ screen, fatal: 'banco corrompido' }))).toBe('')
    },
  )

  it('banner-linha: o banner vira uma linha sem trocar de tela', () => {
    const frame = render(state({ banner: 'aviso de escrita' }))

    expect(linesOf(frame)[1]).toBe('aviso de escrita')
    expect(frame).toContain('Fila de hoje')
  })

  it('banner-linha-caixa: o banner entra na caixa sem trocar de tela', () => {
    const frame = render(state({
      screen: 'detail',
      banner: 'aviso de escrita',
      detail: { item: QUEUE[6] as Item, history: [] },
    }))

    expect(linesOf(frame)[1]).toContain('aviso de escrita')
    expect(linesOf(frame)).toHaveLength(24)
    expect(linesOf(frame)[23]).toContain('╰')
  })
})

describe('AC10 — rolagem', () => {
  it('rolagem-indicadores: o recorte mostra os indicadores e o intervalo (U-02)', () => {
    const frame = render(state({ focusId: 'a8', viewport: { columns: 84, rows: 15 } }))

    expect(frame).toContain('↑ 3 acima')
    expect(frame).toContain('↓ 2 abaixo')
    expect(frame).toContain('4–10 de 12')
  })

  it('rolagem-sem-recorte: tudo cabendo, não há indicador nem intervalo', () => {
    const frame = render(state())

    expect(frame).not.toContain('↑')
    expect(frame).not.toContain('↓')
    expect(frame).not.toContain(' de 12')
  })

  it.each(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'b1', 'b2', 'b3', 'b4'])(
    'rolagem-foco-visivel: o foco %s fica na janela quando ela recorta (U-02)',
    (focusId) => {
      const frame = render(state({ focusId, viewport: { columns: 84, rows: 15 } }))

      expect(linesOf(frame).filter((line) => line.startsWith('> '))).toHaveLength(1)
    },
  )

  it('rolagem-contagem: o a–b de N bate com os itens visíveis', () => {
    const frame = render(state({ focusId: 'a8', viewport: { columns: 84, rows: 15 } }))

    expect(linesOf(frame).filter(isItemLine).map(numberOf)).toEqual([4, 5, 6, 7, 8, 9, 10])
    expect(frame).toContain('4–10 de 12')
  })
})

describe('AC11 — casos de borda', () => {
  it.each([[0, '0 dias'], [1, '1 dia']])(
    'streak-zero-e-um: streak de %i sai como %s',
    (current, text) => {
      const frame = render(state({ queue: [], focusId: null, streak: { streak_current: current, streak_last_day: TODAY } }))

      expect(frame).toContain(`Fila zerada — streak de ${text}`)
    },
  )

  it('vazia-teclas: a fila vazia só oferece ? e q (U-07)', () => {
    const frame = render(state({ queue: [], focusId: null }))

    expect(frame).toContain('? ajuda · q sair')
    expect(frame).not.toContain('Enter revisar')
  })
})

describe('AC12 — as telas de escrita', () => {
  it('frame-formulario-add: o formulario traz titulo, materia, dificuldade, nota e link (U-16)', () => {
    const frame = render(
      state({
        screen: 'form',
        form: {
          mode: 'add',
          fields: {
            title: startField('Derivadas parciais'),
            subject: startField('Cálculo'),
            difficulty: startField('4'),
            note: startField(''),
            link: startField(''),
          },
          focus: 'title',
        },
      }),
    )

    expect(frame).toContain('Novo item')
    expect(frame).toContain('Título')
    expect(frame).toContain('Matéria')
    expect(frame).toContain('Dificuldade')
    expect(frame).toContain('Nota')
    expect(frame).toContain('Link')
    expect(frame).toContain('Derivadas parciais')
    expect(frame).toContain('Cálculo')
  })

  it('frame-arquivo-morto: a tela lista com a data de migracao e o foco (U-21)', () => {
    const frame = render(
      state({
        screen: 'cold',
        cold: {
          items: [
            {
              item: makeItem({ id: 'c1', title: 'Antigo', status: 'cold', cold_archived_at: '2026-09-01T12:00:00Z' }),
              archivedOn: '2026-09-01',
              focused: true,
            },
            {
              item: makeItem({ id: 'c2', title: 'Velho', status: 'cold', cold_archived_at: '2026-09-10T12:00:00Z' }),
              archivedOn: '2026-09-10',
              focused: false,
            },
          ],
        },
      }),
    )

    expect(frame).toContain('Arquivo morto')
    expect(frame).toContain('Antigo')
    expect(frame).toContain('migrado em 2026-09-01')
    expect(frame).toContain('Velho')
    expect(frame).toContain('> Antigo')
    expect(frame).toContain('R restaura · P purga')
  })
})

describe('AC13 — as fichas', () => {
  const fichas = {
    focusId: 'a1',
    items: [
      { item: makeItem({ id: 'a1', title: 'Derivadas parciais', status: 'active' }), focused: true },
      { item: makeItem({ id: 'z1', title: 'Termodinâmica', status: 'archived' }), focused: false },
    ],
  }

  it('frame-fichas: a lista mostra as fichas com o status e o foco (U-26)', () => {
    const frame = render(state({ screen: 'items', items: fichas }))

    expect(frame).toContain('Fichas')
    expect(frame).toContain('> 1.')
    expect(frame).toContain('active')
    expect(frame).toContain('archived')
    expect(frame).toContain('Esc/l volta')
    expect(frame).toContain('1 ativos, 1 arquivados')
  })

  it('fichas-largura: em 84 e em 60 a lista cabe e as linhas de item medem columns (U-26)', () => {
    for (const columns of [84, 60]) {
      const lines = linesOf(render(state({ screen: 'items', items: fichas, viewport: { columns, rows: 24 } })))
      const itemWidths = lines.filter(isItemLine).map(visibleWidth)

      expect(Math.max(...lines.map(visibleWidth))).toBeLessThanOrEqual(columns)
      expect([Math.min(...itemWidths), Math.max(...itemWidths)]).toEqual([columns, columns])
    }
  })
})
