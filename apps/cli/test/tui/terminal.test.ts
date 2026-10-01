import { describe, expect, it } from 'vitest'
import { type TuiTerminal } from '../../src/tui/loop/index.ts'
import {
  openTerminal,
  signalExitCode,
  withTerminal,
  type TerminalEnvironment,
} from '../../src/tui/terminal/index.ts'

type Listener = (...args: unknown[]) => void

type Harness = {
  environment: TerminalEnvironment
  out: string[]
  err: string[]
  rawModes: boolean[]
  exits: number[]
  input: Map<string, Listener>
  output: Map<string, Listener>
  signals: Map<string, Listener>
  pauses: () => number
  setSize: (columns: number, rows: number) => void
  emit: (handlers: Map<string, Listener>, event: string, ...args: unknown[]) => void
}

function fakeEnvironment(): Harness {
  const input = new Map<string, Listener>()
  const output = new Map<string, Listener>()
  const signals = new Map<string, Listener>()
  const out: string[] = []
  const err: string[] = []
  const rawModes: boolean[] = []
  const exits: number[] = []
  let columns = 80
  let rows = 24
  let pauses = 0

  const environment: TerminalEnvironment = {
    input: {
      setEncoding: () => undefined,
      setRawMode: (mode) => {
        rawModes.push(mode)
        return undefined
      },
      on: (event, listener) => {
        input.set(event, listener)
        return undefined
      },
      off: (event) => {
        input.delete(event)
        return undefined
      },
      pause: () => {
        pauses += 1
        return undefined
      },
    },
    output: {
      on: (event, listener) => {
        output.set(event, listener)
        return undefined
      },
      off: (event) => {
        output.delete(event)
        return undefined
      },
      write: (chunk) => {
        out.push(chunk)
        return true
      },
      get columns() {
        return columns
      },
      get rows() {
        return rows
      },
    },
    error: {
      write: (chunk) => {
        err.push(chunk)
        return true
      },
    },
    signals: {
      on: (event, listener) => {
        signals.set(event, listener)
        return undefined
      },
      off: (event) => {
        signals.delete(event)
        return undefined
      },
    },
    exit: (code) => {
      exits.push(code)
    },
  }

  return {
    environment,
    out,
    err,
    rawModes,
    exits,
    input,
    output,
    signals,
    pauses: () => pauses,
    setSize: (nextColumns, nextRows) => {
      columns = nextColumns
      rows = nextRows
    },
    emit: (handlers, event, ...args) => {
      const listener = handlers.get(event)
      if (listener !== undefined) listener(...args)
    },
  }
}

describe('o exit de sinal do adaptador de terminal', () => {
  it('terminal-sinal-exit-codes: SIGTERM sai 143 e SIGHUP sai 129', () => {
    expect(signalExitCode('SIGTERM')).toBe(143)
    expect(signalExitCode('SIGHUP')).toBe(129)
  })
})

describe('AC1 — a abertura do adaptador de terminal', () => {
  it('terminal-abre-raw-tela-cursor: liga raw mode e escreve tela alternativa com cursor escondido antes de qualquer frame', () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    expect(harness.rawModes).toEqual([true])
    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l'])

    terminal.write('frame')

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', 'frame'])
  })

  it('terminal-registra-listeners: registra data/end no input, resize no output e SIGTERM/SIGHUP nos sinais', () => {
    const harness = fakeEnvironment()
    openTerminal(harness.environment)

    expect([...harness.input.keys()].sort()).toEqual(['data', 'end'])
    expect([...harness.output.keys()]).toEqual(['resize'])
    expect([...harness.signals.keys()].sort()).toEqual(['SIGHUP', 'SIGTERM'])
  })
})

describe('AC2 — o fechamento do adaptador de terminal', () => {
  it('terminal-fecha-restaura-canais: close restaura tela e cursor, desliga o raw mode, desregistra os cinco listeners e pausa o stdin', () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    terminal.close()

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
    expect(harness.rawModes).toEqual([true, false])
    expect(harness.input.size).toBe(0)
    expect(harness.output.size).toBe(0)
    expect(harness.signals.size).toBe(0)
    expect(harness.pauses()).toBe(1)
  })

  it('terminal-fecha-idempotente: um segundo close não repete write, raw mode nem pause', () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    terminal.close()
    terminal.close()

    expect(harness.out).toHaveLength(2)
    expect(harness.rawModes).toEqual([true, false])
    expect(harness.pauses()).toBe(1)
  })
})

describe('AC3 — sinais e exit de sinal', () => {
  it.each([
    ['SIGTERM', 143],
    ['SIGHUP', 129],
  ] as const)('terminal-sinal-restaura-e-sai: %s restaura uma vez e sai com %i', (signal, code) => {
    const harness = fakeEnvironment()
    openTerminal(harness.environment)

    harness.emit(harness.signals, signal)

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
    expect(harness.rawModes).toEqual([true, false])
    expect(harness.exits).toEqual([code])
  })

  it('terminal-sinal-duplo-nao-duplica: dois sinais restauram uma vez e saem uma vez', () => {
    const harness = fakeEnvironment()
    openTerminal(harness.environment)

    harness.emit(harness.signals, 'SIGTERM')
    harness.emit(harness.signals, 'SIGTERM')

    expect(harness.out).toHaveLength(2)
    expect(harness.exits).toEqual([143])
  })

  it('terminal-sinal-apos-fechar-ignora: depois de close um sinal não restaura de novo nem chama exit', () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    terminal.close()
    harness.emit(harness.signals, 'SIGHUP')

    expect(harness.out).toHaveLength(2)
    expect(harness.exits).toEqual([])
  })
})

describe('AC4 — exit codes normais', () => {
  it('terminal-sem-exit-no-fechamento: close não chama exit', () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    terminal.close()

    expect(harness.exits).toEqual([])
  })
})

describe('AC5 — SIGWINCH como evento de resize', () => {
  it('terminal-so-ouve-term-e-hup: o adaptador não registra SIGWINCH como sinal', () => {
    const harness = fakeEnvironment()
    openTerminal(harness.environment)

    expect([...harness.signals.keys()].sort()).toEqual(['SIGHUP', 'SIGTERM'])
  })

  it('terminal-resize-na-porta: o resize do stdout chega como { kind: resize, columns, rows }', async () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    harness.setSize(120, 40)
    const resized = terminal.next()
    harness.emit(harness.output, 'resize')

    expect(await resized).toEqual({ kind: 'resize', columns: 120, rows: 40 })
  })
})

describe('AC6 — a porta e o mapeamento de eventos', () => {
  it('terminal-porta-atribuivel: o handle tem size/next/write/error mais close e é atribuível a TuiTerminal', () => {
    const harness = fakeEnvironment()
    const handle = openTerminal(harness.environment)
    const port: TuiTerminal = handle

    expect(port.size()).toEqual({ columns: 80, rows: 24 })
    expect(Object.keys(handle).sort()).toEqual(['close', 'error', 'next', 'size', 'write'])
  })

  it('terminal-mapeia-eventos: data vira key, resize vira resize com o tamanho e end vira null', async () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    const keyed = terminal.next()
    harness.emit(harness.input, 'data', 'j')
    expect(await keyed).toEqual({ kind: 'key', chunk: 'j' })

    const buffered = terminal.next()
    harness.emit(harness.input, 'data', Buffer.from('k'))
    expect(await buffered).toEqual({ kind: 'key', chunk: 'k' })

    harness.setSize(100, 30)
    const resized = terminal.next()
    harness.emit(harness.output, 'resize')
    expect(await resized).toEqual({ kind: 'resize', columns: 100, rows: 30 })

    const ended = terminal.next()
    harness.emit(harness.input, 'end')
    expect(await ended).toBeNull()
    expect(await terminal.next()).toBeNull()
  })

  it('terminal-fila-e-canais: eventos antes do next ficam na fila e write/error vão aos canais', async () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    harness.emit(harness.input, 'data', 'a')
    harness.emit(harness.input, 'data', 'b')
    expect(await terminal.next()).toEqual({ kind: 'key', chunk: 'a' })
    expect(await terminal.next()).toEqual({ kind: 'key', chunk: 'b' })
    expect(terminal.size()).toEqual({ columns: 80, rows: 24 })

    terminal.write('frame')
    terminal.error('boom')

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', 'frame'])
    expect(harness.err).toEqual(['boom\n'])
  })
})

describe('AC8 — prova sem PTY', () => {
  it('terminal-prova-sem-pty: abre, dirige eventos e fecha só com o ambiente falso', async () => {
    const harness = fakeEnvironment()
    const terminal = openTerminal(harness.environment)

    const keyed = terminal.next()
    harness.emit(harness.input, 'data', 'j')
    expect(await keyed).toEqual({ kind: 'key', chunk: 'j' })

    harness.setSize(70, 20)
    const resized = terminal.next()
    harness.emit(harness.output, 'resize')
    expect(await resized).toEqual({ kind: 'resize', columns: 70, rows: 20 })

    terminal.close()

    expect(harness.rawModes).toEqual([true, false])
    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
  })
})

describe('AC9 — bordas do ciclo de vida', () => {
  it('terminal-tamanho-zero-ciclo: colunas e linhas em zero não mudam o ciclo', () => {
    const harness = fakeEnvironment()
    harness.setSize(0, 0)
    const terminal = openTerminal(harness.environment)

    expect(terminal.size()).toEqual({ columns: 0, rows: 0 })

    terminal.close()

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
    expect(harness.rawModes).toEqual([true, false])
  })
})

describe('AC2 — a composição com finally', () => {
  it('terminal-compoe-finally-sucesso: withTerminal devolve o resultado do callback e restaura no fim', async () => {
    const harness = fakeEnvironment()

    const result = await withTerminal(async (terminal) => {
      terminal.write('frame')
      return 'done'
    }, harness.environment)

    expect(result).toBe('done')
    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', 'frame', '\u001b[?1049l\u001b[?25h'])
    expect(harness.rawModes).toEqual([true, false])
  })

  it('terminal-falha-restaura-antes-de-propagar: withTerminal restaura e repropaga quando o callback rejeita', async () => {
    const harness = fakeEnvironment()

    await expect(
      withTerminal(() => Promise.reject(new Error('fatal')), harness.environment),
    ).rejects.toThrow('fatal')

    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
    expect(harness.rawModes).toEqual([true, false])
  })
})

describe('AC9 — bordas do ciclo de vida', () => {
  it('terminal-eof-fim-de-entrada: end do stdin resolve null e o withTerminal restaura como nos demais caminhos', async () => {
    const harness = fakeEnvironment()

    const seen = await withTerminal((terminal) => {
      const pending = terminal.next()
      harness.emit(harness.input, 'end')
      return pending
    }, harness.environment)

    expect(seen).toBeNull()
    expect(harness.out).toEqual(['\u001b[?1049h\u001b[?25l', '\u001b[?1049l\u001b[?25h'])
  })
})
