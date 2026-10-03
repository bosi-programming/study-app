import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { type Deps } from '@study/core'
import { describe, expect, it } from 'vitest'
import { type OpenContextOptions, type OpenedContext, openContext } from '../../src/context.ts'
import { CliError } from '../../src/errors.ts'
import { openStore } from '../../src/persistence/index.ts'
import {
  exitCodeOf,
  isUtf8Locale,
  buildRenderState,
  refuseTui,
  runTui,
  type TuiEvent,
  type TuiSize,
  type TuiTerminal,
} from '../../src/tui/loop/index.ts'
import { type SessionState } from '../../src/tui/session/index.ts'
import { seed, withStore } from '../commands/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { makeItem, makeLog } from '../persistence/helpers.ts'

const ESC = '\u001b'
const CSI = `${ESC}[`
const CTRL_C = '\u0003'
const ACCENT = `${CSI}38;2;232;161;59m`
const TODAY = '2026-09-20'
const LOOP_DIR = resolve(import.meta.dirname, '../../src/tui/loop')

type Step = TuiEvent | (() => TuiEvent)
type OpenWrap = (opened: OpenedContext) => OpenedContext

function fakeDeps(start: string): { deps: Deps; setToday: (today: string) => void } {
  let today = start
  let counter = 0
  return {
    deps: {
      clock: { nowUtc: () => `${today}T12:00:00Z`, todayLocalDate: () => today },
      ids: () => `gen-${++counter}`,
    },
    setToday: (next) => {
      today = next
    },
  }
}

function key(chunk: string): TuiEvent {
  return { kind: 'key', chunk }
}

function resize(columns: number, rows: number): TuiEvent {
  return { kind: 'resize', columns, rows }
}

function scriptedTerminal(steps: readonly Step[], size: TuiSize = { columns: 84, rows: 24 }): {
  terminal: TuiTerminal
  writes: string[]
  errors: string[]
} {
  const remaining = [...steps]
  const writes: string[] = []
  const errors: string[] = []
  const terminal: TuiTerminal = {
    size: () => size,
    next: async () => {
      const step = remaining.shift()
      if (step === undefined) return null
      return typeof step === 'function' ? step() : step
    },
    write: (frame) => {
      writes.push(frame)
    },
    error: (message) => {
      errors.push(message)
    },
  }
  return { terminal, writes, errors }
}

function trackingOpen(
  dbPath: string,
  deps: Deps,
  wrap: OpenWrap = (opened) => opened,
): { open: (options: OpenContextOptions) => OpenedContext; calls: { open: number; close: number } } {
  const calls = { open: 0, close: 0 }
  const open = (options: OpenContextOptions): OpenedContext => {
    calls.open += 1
    const opened = openContext({ ...options, dbPath, deps })
    const wrapped = wrap(opened)
    return {
      ...wrapped,
      close: () => {
        calls.close += 1
        wrapped.close()
      },
    }
  }
  return { open, calls }
}

async function withTempDb<T>(run: (dbPath: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'study-tui-loop-'))
  const dbPath = join(dir, 'study.db')
  try {
    return await run(dbPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

type ScriptExtras = {
  readonly size?: TuiSize
  readonly env?: Readonly<Record<string, string | undefined>>
  readonly color?: boolean
  readonly wrap?: OpenWrap
}

async function runScript(
  dbPath: string,
  deps: Deps,
  steps: readonly Step[],
  extras: ScriptExtras = {},
): Promise<{
  outcome: string
  writes: string[]
  errors: string[]
  calls: { open: number; close: number }
}> {
  const script = scriptedTerminal(steps, extras.size)
  const tracked = trackingOpen(dbPath, deps, extras.wrap)
  const outcome = await runTui({
    dbPath,
    exportDir: undefined,
    deps,
    env: extras.env ?? {},
    color: extras.color ?? false,
    terminal: script.terminal,
    open: tracked.open,
  })
  return { outcome, writes: script.writes, errors: script.errors, calls: tracked.calls }
}

function stripAnsi(text: string): string {
  return text.replace(new RegExp(`${CSI}[0-9;]*m`, 'g'), '')
}

function markersOf(writes: readonly string[]): readonly (string | undefined)[] {
  return writes.map((frame) => frame.match(/> \d+\./)?.[0])
}

describe('AC1/AC2 — o comando e as recusas', () => {
  it('tui-recusa-json: --json devolve a mesma recusa com o envelope', () => {
    const error = refuseTui({ stdinTty: true, stdoutTty: true, noInput: false, json: true })

    expect(error?.code).toBe('usage')
    expect(error?.exitCode).toBe(1)
    expect(error?.message).toBe('a TUI exige um terminal interativo')
  })

  it('laco-erro-de-abertura-propaga: open lançando rejeita runTui', async () => {
    await withTempDb(async (dbPath) => {
      const deps = fakeDeps(TODAY).deps
      const script = scriptedTerminal([key('q')])

      await expect(
        runTui({
          dbPath,
          exportDir: undefined,
          deps,
          env: {},
          color: false,
          terminal: script.terminal,
          open: () => {
            throw CliError.unsupportedSchema(2)
          },
        }),
      ).rejects.toThrow('schema_version 2 não suportado')
    })
  })
})

describe('AC3 — abertura e fechamento pela porta', () => {
  it('laco-abre-uma-vez-e-injeta: open é chamado uma vez e o store é o da sessão', async () => {
    await withTempDb(async (dbPath) => {
      const clock = fakeDeps(TODAY)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const saved: string[] = []
      const { outcome, calls } = await runScript(dbPath, clock.deps, [key('\r'), key('q')], {
        wrap: (opened) => ({
          ...opened,
          store: {
            ...opened.store,
            saveItem: (item) => {
              saved.push(item.id)
              return opened.store.saveItem(item)
            },
          },
        }),
      })

      expect(calls.open).toBe(1)
      expect(outcome).toBe('quit')
      expect(saved).toContain('A')
      withStore(dbPath, (store) => {
        expect(store.listReviewLogs('A')).toHaveLength(1)
      })
    })
  })

  it('laco-fecha-a-sessao: close é chamado uma vez em cada desfecho', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const quit = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')])
      expect(quit.outcome).toBe('quit')
      expect(quit.calls.close).toBe(1)
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const interrupt = await runScript(dbPath, fakeDeps(TODAY).deps, [key(CTRL_C)])
      expect(interrupt.outcome).toBe('interrupt')
      expect(interrupt.calls.close).toBe(1)
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const eof = await runScript(dbPath, fakeDeps(TODAY).deps, [])
      expect(eof.outcome).toBe('interrupt')
      expect(eof.calls.close).toBe(1)
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      let armed = false
      const fatal = await runScript(dbPath, fakeDeps(TODAY).deps, [
        () => {
          armed = true
          return key('j')
        },
      ], {
        wrap: (opened) => ({
          ...opened,
          store: {
            ...opened.store,
            dueItems: (today) => {
              if (armed) throw new Error('store fora do ar')
              return opened.store.dueItems(today)
            },
          },
        }),
      })

      expect(fatal.outcome).toBe('fatal')
      expect(fatal.calls.close).toBe(1)
    })
  })
})

describe('AC4 — a tabela de teclas', () => {
  it('laco-foco: setas, j/k, g/G e PgUp/PgDn movem o foco', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: TODAY }),
          makeItem({ id: 'B', due_date: TODAY }),
          makeItem({ id: 'C', due_date: TODAY }),
        ],
      })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        key('j'), key('j'), key('k'), key(`${CSI}A`), key(`${CSI}B`),
        key('G'), key('g'), key(`${CSI}6~`), key(`${CSI}5~`), key('q'),
      ])

      expect(markersOf(writes)).toEqual([
        '> 1.', '> 2.', '> 3.', '> 2.', '> 1.', '> 2.', '> 3.', '> 1.', '> 3.', '> 1.',
      ])
    })
  })

  it('laco-pagina-por-capacidade: PgDn/PgUp andam a página da janela e param na ponta', async () => {
    await withTempDb(async (dbPath) => {
      const items = Array.from({ length: 15 }, (_value, index) =>
        makeItem({ id: `I${index + 1}`, due_date: TODAY }),
      )
      seed(dbPath, { items })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        key(`${CSI}6~`), key(`${CSI}6~`), key(`${CSI}5~`), key('q'),
      ], { size: { columns: 84, rows: 16 } })

      expect(markersOf(writes)).toEqual(['> 1.', '> 11.', '> 15.', '> 5.'])
    })
  })

  it('laco-enter-checkin-abre-reavaliacao: Enter grava e abre a reavaliação do item revisado', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', title: 'Derivadas', due_date: TODAY })] })
      const { outcome, writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key('q')])

      expect(outcome).toBe('quit')
      expect(writes.some((frame) => frame.includes('Dificuldade atual:'))).toBe(true)
      withStore(dbPath, (store) => {
        expect(store.listReviewLogs('A')).toHaveLength(1)
      })
    })
  })

  it('laco-digitos-reavalia: 1–5 na fila reavaliam sem check-in; na reavaliação gravam com o mesmo n', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 4, review_count: 2, due_date: TODAY })] })
      await runScript(dbPath, fakeDeps(TODAY).deps, [key('3'), key('q')])

      withStore(dbPath, (store) => {
        const item = store.getItem('A')
        expect(item?.difficulty).toBe(3)
        expect(item?.review_count).toBe(2)
        expect(store.listReviewLogs('A')).toEqual([])
      })
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 4, review_count: 2, due_date: TODAY })] })
      await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key('5'), key('q')])

      withStore(dbPath, (store) => {
        const item = store.getItem('A')
        expect(item?.difficulty).toBe(5)
        expect(item?.review_count).toBe(3)
        expect(store.listReviewLogs('A')).toHaveLength(1)
      })
    })
  })

  it('laco-i-e-esc: i abre o detalhe; Esc e i fecham sem alterar o foco', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', due_date: TODAY }), makeItem({ id: 'B', due_date: TODAY })],
      })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('i'), key(ESC), key('q')])

      expect(writes.some((frame) => frame.includes('Detalhe'))).toBe(true)
      expect(writes.at(-1)).toContain('Fila de hoje')
      expect(writes.at(-1)).toContain('> 1.')
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('i'), key('i'), key('q')])

      expect(writes.some((frame) => frame.includes('Detalhe'))).toBe(true)
      expect(writes.at(-1)).toContain('Fila de hoje')
    })
  })

  it('laco-interrogacao: ? abre a ajuda; Esc e ? fecham', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const esc = await runScript(dbPath, fakeDeps(TODAY).deps, [key('?'), key(ESC), key('q')])
      expect(esc.writes.some((frame) => frame.includes('Ajuda'))).toBe(true)
      expect(esc.writes.at(-1)).toContain('Fila de hoje')

      const toggle = await runScript(dbPath, fakeDeps(TODAY).deps, [key('?'), key('?'), key('q')])
      expect(toggle.writes.at(-1)).toContain('Fila de hoje')
    })
  })

  it('laco-esc-cancela-reavaliacao: Esc e Enter saem sem escrever e o check-in permanece', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 4, due_date: TODAY })] })
      await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key(ESC), key('q')])

      withStore(dbPath, (store) => {
        expect(store.getItem('A')?.difficulty).toBe(4)
        expect(store.listReviewLogs('A')).toHaveLength(1)
      })
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 4, due_date: TODAY })] })
      await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key('\r'), key('q')])

      withStore(dbPath, (store) => {
        expect(store.getItem('A')?.difficulty).toBe(4)
        expect(store.listReviewLogs('A')).toHaveLength(1)
      })
    })
  })

  const OUTCOME_STEPS: readonly (readonly [string, readonly Step[], string])[] = [
    ['q na fila', [key('q')], 'quit'],
    ['q no detalhe', [key('i'), key('q')], 'quit'],
    ['q na ajuda', [key('?'), key('q')], 'quit'],
    ['q na reavaliação', [key('\r'), key('q')], 'quit'],
    ['Ctrl-C na fila', [key(CTRL_C)], 'interrupt'],
    ['Ctrl-C no detalhe', [key('i'), key(CTRL_C)], 'interrupt'],
  ]

  it.each(OUTCOME_STEPS)('laco-q-e-ctrl-c: %s devolve %s', async (_name, steps, outcome) => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const result = await runScript(dbPath, fakeDeps(TODAY).deps, steps)

      expect(result.outcome).toBe(outcome)
    })
  })
})

describe('AC5 — RenderState e frame', () => {
  it('laco-renderstate-completo: cabeçalho, fila, foco, streak e banner', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', subject: 'Cálculo', due_date: TODAY }), makeItem({ id: 'B', due_date: TODAY })],
      })
      const queue = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')])
      expect(queue.writes[0]).toContain(`Fila de hoje — ${TODAY}`)
      expect(queue.writes[0]).toContain('> 1.')
      expect(queue.writes[0]).toContain('2 para hoje')
    })

    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const empty = await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key(ESC), key('q')])
      expect(empty.writes.some((frame) => frame.includes('Fila zerada — streak de'))).toBe(true)
    })

    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const state: SessionState = {
          today: TODAY,
          screen: 'queue',
          queue: [],
          focusId: null,
          detailItemId: null,
          reevaluation: null,
          form: null,
          cold: null,
          config: null,
          path: null,
          confirmation: null,
          streak: { streak_current: 3, streak_last_day: TODAY },
          banner: { kind: 'info', message: 'aviso de migração' },
          fatal: null,
        }
        const built = buildRenderState({
          state,
          store,
          confirmed: false,
          viewport: { columns: 84, rows: 24 },
          color: false,
          utf8: true,
        })

        expect(built.today).toBe(TODAY)
        expect(built.streak).toEqual(state.streak)
        expect(built.banner).toBe('aviso de migração')
        expect(built.fatal).toBeNull()
      } finally {
        store.close()
      }
    })
  })

  it('laco-detalhe-do-store: o detalhe usa getItem e listReviewLogs do item em foco', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', title: 'Derivadas parciais', subject: 'Cálculo', due_date: TODAY })],
        logs: [makeLog({ item_id: 'A' })],
      })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('i'), key('q')])

      const detail = writes.find((frame) => frame.includes('Detalhe'))
      expect(detail).toContain('Derivadas parciais')
      expect(detail).toContain('Histórico (1)')
      expect(detail).toContain('2026-09-06')
    })
  })

  it('laco-confirmacao: o frame de reavaliação mostra a confirmação só depois do check-in', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', title: 'Derivadas', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('\r'), key('q')])

      expect(writes[0]).not.toContain('✓ Check-in registrado')
      expect(writes.some((frame) => frame.includes('✓ Check-in registrado: Derivadas'))).toBe(true)
    })
  })

  it('laco-viewport-inicial: columns/rows vêm do tamanho do terminal', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const wide = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { size: { columns: 84, rows: 24 } })
      expect(wide.writes[0]).toContain('Fila de hoje')

      const small = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { size: { columns: 40, rows: 10 } })
      expect(small.writes[0]).toBe('Aumente a janela para pelo menos\n60 colunas e 15 linhas.')
    })
  })

  it('laco-sigwinch: um resize atualiza o viewport e redesenha', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [resize(100, 30), key('q')])

      expect(writes).toHaveLength(2)
      const rule = writes[1]?.split('\n')[1] ?? ''
      expect([...rule].length).toBe(100)
    })
  })

  it('laco-virada-do-dia: beforeRender relê a fila no dia novo antes de desenhar', async () => {
    await withTempDb(async (dbPath) => {
      const clock = fakeDeps(TODAY)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, clock.deps, [
        () => {
          clock.setToday('2026-09-21')
          return key('j')
        },
        key('q'),
      ])

      expect(writes.some((frame) => frame.includes('Fila de hoje — 2026-09-21'))).toBe(true)
    })
  })

  it('laco-cor: a cor muda o atraso sem mudar a geometria', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: '2026-09-12' })] })
      const colored = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { color: true })
      const plain = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { color: false })

      expect(colored.writes[0]).toContain(ACCENT)
      expect(colored.writes[0]).not.toContain('! venceu')
      expect(plain.writes[0]).toContain('! venceu')
      expect(stripAnsi(colored.writes[0] ?? '').split('\n').map((line) => [...line].length)).toEqual(
        (plain.writes[0] ?? '').split('\n').map((line) => [...line].length),
      )
    })
  })

  it('laco-utf8: locale não-UTF-8 cai para ASCII e sem locale usa UTF-8', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const utf8 = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { env: {} })
      const ascii = await runScript(dbPath, fakeDeps(TODAY).deps, [key('q')], { env: { LANG: 'C' } })

      expect(utf8.writes[0]).toContain('─')
      expect(ascii.writes[0]).not.toContain('─')
      expect(isUtf8Locale({})).toBe(true)
      expect(isUtf8Locale({ LANG: 'C' })).toBe(false)
      expect(isUtf8Locale({ LANG: 'en_US.UTF-8' })).toBe(true)
      expect(isUtf8Locale({ LC_ALL: 'C', LANG: 'en_US.UTF-8' })).toBe(false)
      expect(isUtf8Locale({ LC_ALL: '', LC_CTYPE: 'C', LANG: 'en_US.UTF-8' })).toBe(false)
      expect(isUtf8Locale({ LC_ALL: '', LC_CTYPE: '', LANG: 'en_US.UTF-8' })).toBe(true)
      expect(isUtf8Locale({ LC_ALL: '', LC_CTYPE: 'pt_BR.UTF-8' })).toBe(true)
    })
  })
})

describe('AC6 — o redesenho', () => {
  it('laco-um-write-por-mudanca: a mudança escreve o frame inteiro numa única chamada', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', due_date: TODAY }), makeItem({ id: 'B', due_date: TODAY })],
      })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('j'), key('q')])

      expect(writes).toHaveLength(2)
      expect(writes[1]).toContain('Fila de hoje')
      expect(writes[1]).toContain('> 2.')
      expect(writes[1]?.includes('\n')).toBe(true)
    })
  })

  it('laco-tecla-inerte: tecla inerte ou foco no limite não escreve frame novo', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [key('z'), key('\n'), key('k'), key('q')])

      expect(writes).toHaveLength(1)
    })
  })

  it('laco-resize-redesenha: resize escreve mesmo sem mudança de estado', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [resize(84, 24), key('q')])

      expect(writes).toHaveLength(2)
    })
  })
})

describe('AC7 — desfecho e fatal', () => {
  it('laco-fatal-frame-vazio: fatal não escreve frame e manda a mensagem ao canal de erro', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      let armed = false
      const { outcome, writes, errors } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        () => {
          armed = true
          return key('j')
        },
      ], {
        wrap: (opened) => ({
          ...opened,
          store: {
            ...opened.store,
            dueItems: (today) => {
              if (armed) throw new Error('store fora do ar')
              return opened.store.dueItems(today)
            },
          },
        }),
      })

      expect(outcome).toBe('fatal')
      expect(errors).toContain('store fora do ar')
      expect(writes).toHaveLength(1)
    })
  })

  it('laco-falha-detalhe-fatal: falha ao montar o detalhe vira fatal sem frame', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      let armed = false
      const { outcome, writes, errors } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        () => {
          armed = true
          return key('i')
        },
      ], {
        wrap: (opened) => ({
          ...opened,
          store: {
            ...opened.store,
            getItem: (id) => {
              if (armed) throw new Error('getItem fora do ar')
              return opened.store.getItem(id)
            },
          },
        }),
      })

      expect(outcome).toBe('fatal')
      expect(errors).toContain('getItem fora do ar')
      expect(writes).toHaveLength(1)
    })
  })

  it('laco-eof-interrompe: next() devolvendo null vira interrupt e fecha a sessão', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { outcome, calls } = await runScript(dbPath, fakeDeps(TODAY).deps, [])

      expect(outcome).toBe('interrupt')
      expect(calls.close).toBe(1)
    })
  })

  it('laco-exit-codes: exitCodeOf mapeia quit 0, interrupt 130 e fatal 1; o laço não toca process', () => {
    expect(exitCodeOf('quit')).toBe(0)
    expect(exitCodeOf('interrupt')).toBe(130)
    expect(exitCodeOf('fatal')).toBe(1)

    const sources = readdirSync(LOOP_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => readFileSync(join(LOOP_DIR, name), 'utf8'))
      .join('\n')
    expect(sources).not.toMatch(/process\.|node:|setRawMode|SIGWINCH/)
  })

  it('laco-falha-de-escrita-vira-aviso: a escrita que falha não derruba a sessão (U-25)', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      let armed = false
      const { outcome, writes, errors } = await runScript(
        dbPath,
        fakeDeps(TODAY).deps,
        [
          () => {
            armed = true
            return key('x')
          },
          key('q'),
        ],
        {
          wrap: (opened) => ({
            ...opened,
            store: {
              ...opened.store,
              transaction: <T>(run: () => T): T => {
                if (armed) {
                  armed = false
                  throw new Error('disco cheio')
                }
                return opened.store.transaction(run)
              },
            },
          }),
        },
      )

      expect(outcome).toBe('quit')
      expect(writes.some((frame) => frame.includes('disco cheio'))).toBe(true)
      expect(errors).toHaveLength(0)
    })
  })
})

describe('AC8 — prova sem PTY', () => {
  it('laco-chunks-e-frames: o roteiro dirige teclas por chunks, captura frames e observa o desfecho', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', due_date: TODAY }), makeItem({ id: 'B', due_date: TODAY })],
      })
      const { outcome, writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        key('j'),
        key('j'),
        key(CTRL_C),
      ])

      expect(outcome).toBe('interrupt')
      expect(writes).toHaveLength(2)
      expect(writes[1]).toContain('> 2.')
    })
  })

  it('laco-pending-entre-reads: o escape partido entre dois reads move o foco', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'A', due_date: TODAY }), makeItem({ id: 'B', due_date: TODAY })],
      })
      const { writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        key(`${CSI}`),
        key('B'),
        key('q'),
      ])

      expect(writes.some((frame) => frame.includes('> 2.'))).toBe(true)
    })
  })

  it('laco-troca-de-tela-no-chunk: i + Esc no mesmo chunk termina na fila', async () => {
    await withTempDb(async (dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: TODAY })] })
      const { outcome, writes } = await runScript(dbPath, fakeDeps(TODAY).deps, [
        key(`i${ESC}`),
        key('q'),
      ])

      expect(outcome).toBe('quit')
      expect(writes).toHaveLength(3)
      expect(writes[1]).toContain('Detalhe')
      expect(writes[2]).toContain('Fila de hoje')
    })
  })
})
