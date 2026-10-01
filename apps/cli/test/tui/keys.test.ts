import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type Deps, type Item } from '@study/core'
import { describe, expect, it } from 'vitest'
import { type ContextHookTarget } from '../../src/context.ts'
import { openStore } from '../../src/persistence/index.ts'
import { type KeyCommand, type KeyScreen, parseKeys } from '../../src/tui/keys.ts'
import { dispatch } from '../../src/tui/session/dispatch.ts'
import { type SessionAction, type SessionState } from '../../src/tui/session/types.ts'
import { makeItem } from '../persistence/helpers.ts'

const ESC = '\u001b'
const CSI = `${ESC}[`
const CTRL_C = '\u0003'
const TODAY = '2026-09-30'
const KEYS_SOURCE = readFileSync(resolve(import.meta.dirname, '../../src/tui/keys.ts'), 'utf8')

const SCREENS = ['queue', 'detail', 'reevaluate', 'help'] as const

const QUEUE: readonly Item[] = [
  makeItem({ id: 'a1', due_date: '2026-08-22' }),
  makeItem({ id: 'a2', due_date: '2026-09-07' }),
  makeItem({ id: 'a3', due_date: '2026-09-14' }),
  makeItem({ id: 'a4', due_date: '2026-09-18' }),
  makeItem({ id: 'a5', due_date: '2026-09-22' }),
  makeItem({ id: 'a6', due_date: '2026-09-24' }),
  makeItem({ id: 'a7', due_date: '2026-09-27' }),
  makeItem({ id: 'a8', due_date: '2026-09-25' }),
  makeItem({ id: 'b1', due_date: TODAY }),
  makeItem({ id: 'b2', due_date: TODAY }),
  makeItem({ id: 'b3', due_date: TODAY }),
  makeItem({ id: 'b4', due_date: TODAY }),
]

const DEPS: Deps = {
  clock: { nowUtc: () => `${TODAY}T12:00:00Z`, todayLocalDate: () => TODAY },
  ids: () => 'generated-id',
}

function commandsOf(chunk: string, screen: KeyScreen, pending = ''): readonly KeyCommand[] {
  return parseKeys(chunk, screen, pending).commands
}

function firstCommand(chunk: string, screen: KeyScreen, pending = ''): KeyCommand {
  const command = commandsOf(chunk, screen, pending)[0]
  if (command === undefined) throw new Error(`sem comando para ${JSON.stringify(chunk)}`)
  return command
}

function actionOf(command: KeyCommand): SessionAction {
  if (
    command.kind === 'quit' ||
    command.kind === 'interrupt' ||
    command.kind === 'page-prev' ||
    command.kind === 'page-next'
  ) {
    throw new Error('comando de saída não é ação de sessão')
  }
  return command
}

function sessionState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    today: TODAY,
    screen: 'queue',
    queue: QUEUE,
    focusId: 'a1',
    detailItemId: null,
    reevaluation: null,
    streak: { streak_current: 0, streak_last_day: null },
    banner: null,
    fatal: null,
    ...overrides,
  }
}

function withTarget<T>(run: (target: ContextHookTarget) => T): T {
  const store = openStore(':memory:')
  try {
    return run({ store, deps: DEPS, exportDir: null, dbPath: ':memory:' })
  } finally {
    store.close()
  }
}

describe('AC1 — contrato e pureza', () => {
  it('keys-assinatura: j na fila vira focus-next sem pending', () => {
    expect(parseKeys('j', 'queue')).toEqual({ commands: [{ kind: 'focus-next' }], pending: '' })
  })

  it('keys-deterministico: o mesmo chunk, tela e pending devolvem o mesmo resultado', () => {
    const expected = { commands: [{ kind: 'focus-prev' }, { kind: 'focus-next' }], pending: '' }
    expect(parseKeys(`${CSI}Aj`, 'queue')).toEqual(expected)
    expect(parseKeys(`${CSI}Aj`, 'queue')).toEqual(expected)
  })

  it('keys-sem-io: o fonte não toca em processo, relógio, ambiente, sessão nem view', () => {
    expect(KEYS_SOURCE).not.toMatch(/process\./)
    expect(KEYS_SOURCE).not.toMatch(/from 'node:/)
    expect(KEYS_SOURCE).not.toMatch(/\bDate\b/)
    expect(KEYS_SOURCE).not.toMatch(/colorEnabled/)
    expect(KEYS_SOURCE).not.toMatch(/tui\/session/)
    expect(KEYS_SOURCE).not.toMatch(/tui\/render/)
  })
})

describe('AC2 — totalidade', () => {
  it('keys-chunk-vazio: chunk vazio devolve zero comandos e preserva o pending', () => {
    expect(parseKeys('', 'queue', CSI)).toEqual({ commands: [], pending: CSI })
  })

  it('keys-desconhecida: sequência completa fora da tabela é inerte', () => {
    expect(parseKeys(`${CSI}99~`, 'queue')).toEqual({ commands: [], pending: '' })
  })

  it.each([`${CSI}1~`, `${CSI}4~`, `${CSI}7~`, `${CSI}8~`])(
    'keys-csi-conhecida: %s é inerte e seu prefixo fica retido',
    (chunk) => {
      expect(parseKeys(chunk, 'queue')).toEqual({ commands: [], pending: '' })
      const prefix = chunk.slice(0, -1)
      expect(parseKeys(prefix, 'queue')).toEqual({ commands: [], pending: prefix })
    },
  )

  it.each([
    ['esquerda', `${CSI}D`],
    ['direita', `${CSI}C`],
    ['home', `${CSI}H`],
    ['end', `${CSI}F`],
    ['esc na fila', ESC],
    ['esc malformado com j', `${ESC}j`],
    ['mouse SGR', `${CSI}<0;10;5M`],
    ['mouse X10', `${CSI}M`],
    ['mouse X10 com cauda', `${CSI}M  j`],
    ['digito zero', '0'],
    ['digito seis', '6'],
    ['digito nove', '9'],
  ])('keys-inertes: %s na fila devolve zero comandos', (_name, chunk) => {
    expect(commandsOf(chunk, 'queue')).toEqual([])
  })

  it.each([
    ['nulo', '\u0000'],
    ['delete', '\u007f'],
    ['esc', ESC],
    ['sobra de UTF-8', '\ud83d'],
  ])('keys-never-throws: o chunk %s não lança e fica inerte', (_name, chunk) => {
    expect(parseKeys(chunk, 'queue')).toEqual({ commands: [], pending: '' })
  })

  it('keys-enter-nao-e-nl: \\n é inerte e só \\r faz check-in', () => {
    expect(commandsOf('\n', 'queue')).toEqual([])
    expect(commandsOf('\r', 'queue')).toEqual([{ kind: 'check-in' }])
  })
})

describe('AC3 — a tabela Teclas (U-09)', () => {
  it.each([
    ['seta para cima', `${CSI}A`, 'focus-prev'],
    ['seta para baixo', `${CSI}B`, 'focus-next'],
    ['seta SS3 para cima', `${ESC}OA`, 'focus-prev'],
    ['seta SS3 para baixo', `${ESC}OB`, 'focus-next'],
    ['j', 'j', 'focus-next'],
    ['k', 'k', 'focus-prev'],
  ])('keys-navegacao: %s na fila vira %s', (_name, chunk, kind) => {
    expect(commandsOf(chunk, 'queue')).toEqual([{ kind }])
  })

  it.each([
    ['PgUp', `${CSI}5~`, 'page-prev'],
    ['PgDn', `${CSI}6~`, 'page-next'],
  ])('keys-pagina: %s na fila vira %s', (_name, chunk, kind) => {
    expect(commandsOf(chunk, 'queue')).toEqual([{ kind }])
  })

  it('keys-primeiro-ultimo: g vai ao primeiro e G ao último', () => {
    expect(commandsOf('g', 'queue')).toEqual([{ kind: 'focus-first' }])
    expect(commandsOf('G', 'queue')).toEqual([{ kind: 'focus-last' }])
  })

  it.each([
    ['i', 'i', [{ kind: 'open-detail' }]],
    ['?', '?', [{ kind: 'toggle-help' }]],
    ['Enter', '\r', [{ kind: 'check-in' }]],
    ['q', 'q', [{ kind: 'quit' }]],
    ['Ctrl-C', CTRL_C, [{ kind: 'interrupt' }]],
  ] as const)('keys-acoes-nomeadas: %s na fila', (_name, chunk, expected) => {
    expect(commandsOf(chunk, 'queue')).toEqual(expected)
  })

  it.each([1, 2, 3, 4, 5] as const)('keys-digitos-de-fila: %i na fila inicia e reavalia', (difficulty) => {
    expect(commandsOf(String(difficulty), 'queue')).toEqual([
      { kind: 'start-reevaluate' },
      { kind: 'reevaluate', difficulty },
    ])
  })
})

describe('AC4 — a coluna Onde (U-09)', () => {
  it.each([
    ['fila', 'queue', []],
    ['detalhe', 'detail', [{ kind: 'close-detail' }]],
    ['reavaliação', 'reevaluate', [{ kind: 'cancel-reevaluate' }]],
    ['ajuda', 'help', [{ kind: 'toggle-help' }]],
  ] as const)('onde-esc: Esc na %s', (_name, screen, expected) => {
    expect(commandsOf(ESC, screen)).toEqual(expected)
  })

  it.each([
    ['fila', 'queue', [{ kind: 'start-reevaluate' }, { kind: 'reevaluate', difficulty: 5 }]],
    ['reavaliação', 'reevaluate', [{ kind: 'reevaluate', difficulty: 5 }]],
    ['detalhe', 'detail', []],
    ['ajuda', 'help', []],
  ] as const)('onde-digitos: 5 na %s', (_name, screen, expected) => {
    expect(commandsOf('5', screen)).toEqual(expected)
  })

  it.each([
    ['fila', 'queue', [{ kind: 'check-in' }]],
    ['reavaliação', 'reevaluate', [{ kind: 'cancel-reevaluate' }]],
    ['detalhe', 'detail', []],
    ['ajuda', 'help', []],
  ] as const)('onde-enter: Enter na %s', (_name, screen, expected) => {
    expect(commandsOf('\r', screen)).toEqual(expected)
  })

  it.each([
    ['i na fila', 'i', 'queue', [{ kind: 'open-detail' }]],
    ['i no detalhe', 'i', 'detail', [{ kind: 'close-detail' }]],
    ['i na ajuda', 'i', 'help', []],
    ['i na reavaliação', 'i', 'reevaluate', []],
    ['? na fila', '?', 'queue', [{ kind: 'toggle-help' }]],
    ['? no detalhe', '?', 'detail', [{ kind: 'toggle-help' }]],
    ['? na ajuda', '?', 'help', [{ kind: 'toggle-help' }]],
    ['? na reavaliação', '?', 'reevaluate', []],
  ] as const)('onde-i-e-interrogacao: %s', (_name, chunk, screen, expected) => {
    expect(commandsOf(chunk, screen)).toEqual(expected)
  })

  it.each([
    ['↑ na fila', `${CSI}A`, 'queue', [{ kind: 'focus-prev' }]],
    ['↓ na fila', `${CSI}B`, 'queue', [{ kind: 'focus-next' }]],
    ['j na ajuda', 'j', 'help', [{ kind: 'focus-next' }]],
    ['k na ajuda', 'k', 'help', [{ kind: 'focus-prev' }]],
    ['j no detalhe', 'j', 'detail', []],
    ['k na reavaliação', 'k', 'reevaluate', []],
    ['PgUp na fila', `${CSI}5~`, 'queue', [{ kind: 'page-prev' }]],
    ['PgDn na fila', `${CSI}6~`, 'queue', [{ kind: 'page-next' }]],
    ['PgUp na ajuda', `${CSI}5~`, 'help', []],
    ['g na fila', 'g', 'queue', [{ kind: 'focus-first' }]],
    ['G na fila', 'G', 'queue', [{ kind: 'focus-last' }]],
    ['g na ajuda', 'g', 'help', []],
  ] as const)('onde-foco-e-pagina: %s', (_name, chunk, screen, expected) => {
    expect(commandsOf(chunk, screen)).toEqual(expected)
  })
})

describe('AC5 — várias teclas por chunk', () => {
  it('keys-multiplas-em-ordem: jjk na fila vira três comandos na ordem', () => {
    expect(commandsOf('jjk', 'queue')).toEqual([
      { kind: 'focus-next' },
      { kind: 'focus-next' },
      { kind: 'focus-prev' },
    ])
  })

  it('keys-multiplas-com-escape: seta e j no mesmo chunk', () => {
    expect(commandsOf(`${CSI}Aj`, 'queue')).toEqual([{ kind: 'focus-prev' }, { kind: 'focus-next' }])
  })
})

describe('AC6 — escape partido e Esc sozinho (U-09)', () => {
  it.each([
    ['fila', 'queue', []],
    ['detalhe', 'detail', [{ kind: 'close-detail' }]],
    ['reavaliação', 'reevaluate', [{ kind: 'cancel-reevaluate' }]],
  ] as const)('keys-escape-sozinho: Esc na %s', (_name, screen, expected) => {
    expect(parseKeys(ESC, screen)).toEqual({ commands: expected, pending: '' })
  })

  it('keys-seta-partida: o prefixo fica retido e o read seguinte completa', () => {
    expect(parseKeys(CSI, 'queue')).toEqual({ commands: [], pending: CSI })
    expect(parseKeys('A', 'queue', CSI)).toEqual({ commands: [{ kind: 'focus-prev' }], pending: '' })
  })

  it('keys-seta-ss3-partida: o prefixo SS3 fica retido e o read seguinte completa', () => {
    expect(parseKeys(`${ESC}O`, 'queue')).toEqual({ commands: [], pending: `${ESC}O` })
    expect(parseKeys('A', 'queue', `${ESC}O`)).toEqual({
      commands: [{ kind: 'focus-prev' }],
      pending: '',
    })
  })

  it('keys-mouse-x10-partido: o relatório fica retido até a cauda chegar', () => {
    expect(parseKeys(`${CSI}M`, 'queue')).toEqual({ commands: [], pending: `${CSI}M` })
    expect(parseKeys('  j', 'queue', `${CSI}M`)).toEqual({ commands: [], pending: '' })
  })

  it('keys-prefixo-nao-consome: o comando anterior sai e só o escape fica retido', () => {
    expect(parseKeys(`j${CSI}5`, 'queue')).toEqual({
      commands: [{ kind: 'focus-next' }],
      pending: `${CSI}5`,
    })
    expect(parseKeys('~', 'queue', `${CSI}5`)).toEqual({
      commands: [{ kind: 'page-prev' }],
      pending: '',
    })
  })
})

describe('AC7 — foco contínuo pela sessão (U-10)', () => {
  it('foco-atravessa-secoes: j leva o foco do último atrasado ao primeiro de hoje', () => {
    withTarget((target) => {
      const command = actionOf(firstCommand('j', 'queue'))
      const next = dispatch(target, sessionState({ focusId: 'a8' }), command)

      expect(next.focusId).toBe('b1')
    })
  })

  it('foco-primeiro-e-ultimo: g e G via parser põem o foco no primeiro e no último', () => {
    withTarget((target) => {
      const first = dispatch(target, sessionState({ focusId: 'a8' }), actionOf(firstCommand('g', 'queue')))
      const last = dispatch(target, sessionState({ focusId: 'a8' }), actionOf(firstCommand('G', 'queue')))

      expect(first.focusId).toBe('a1')
      expect(last.focusId).toBe('b4')
    })
  })
})

describe('AC8 — saída', () => {
  it.each(SCREENS)('saida-q: q na tela %s vira quit', (screen) => {
    expect(commandsOf('q', screen)).toEqual([{ kind: 'quit' }])
  })

  it.each(SCREENS)('saida-ctrl-c: Ctrl-C na tela %s vira interrupt', (screen) => {
    expect(commandsOf(CTRL_C, screen)).toEqual([{ kind: 'interrupt' }])
  })
})
