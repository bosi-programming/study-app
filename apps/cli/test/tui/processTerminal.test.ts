import { describe, expect, it } from 'vitest'
import { processTerminal, type TerminalStreams } from '../../src/tui/terminal/index.ts'

type Listener = (...args: never[]) => void

function fakeStreams(): {
  streams: TerminalStreams
  input: Map<string, Listener>
  output: Map<string, Listener>
  out: string[]
  err: string[]
  setSize: (columns: number, rows: number) => void
  emit: (handlers: Map<string, Listener>, event: string, ...args: unknown[]) => void
} {
  const input = new Map<string, Listener>()
  const output = new Map<string, Listener>()
  const out: string[] = []
  const err: string[] = []
  let size = { columns: 80, rows: 24 }

  const streams: TerminalStreams = {
    input: {
      setEncoding: () => undefined,
      on: (event, listener) => input.set(event, listener),
    },
    output: {
      on: (event, listener) => output.set(event, listener),
      write: (chunk) => {
        out.push(chunk)
        return true
      },
      get columns() {
        return size.columns
      },
      get rows() {
        return size.rows
      },
    },
    error: {
      write: (chunk) => {
        err.push(chunk)
        return true
      },
    },
  }

  return {
    streams,
    input,
    output,
    out,
    err,
    setSize: (columns, rows) => {
      size = { columns, rows }
    },
    emit: (handlers, event, ...args) => {
      const listener = handlers.get(event)
      if (listener !== undefined) (listener as (...values: unknown[]) => void)(...args)
    },
  }
}

describe('o binding de processo da TUI', () => {
  it('terminal-mapeia-eventos: data vira key, resize vira resize com o tamanho e end vira null', async () => {
    const harness = fakeStreams()
    const terminal = processTerminal(harness.streams)

    const keyed = terminal.next()
    harness.emit(harness.input, 'data', 'j')
    expect(await keyed).toEqual({ kind: 'key', chunk: 'j' })

    const buffered = terminal.next()
    harness.emit(harness.input, 'data', Buffer.from('k'))
    expect(await buffered).toEqual({ kind: 'key', chunk: 'k' })

    harness.setSize(120, 40)
    const resized = terminal.next()
    harness.emit(harness.output, 'resize')
    expect(await resized).toEqual({ kind: 'resize', columns: 120, rows: 40 })

    const ended = terminal.next()
    harness.emit(harness.input, 'end')
    expect(await ended).toBeNull()

    expect(await terminal.next()).toBeNull()
  })

  it('terminal-fila-e-canais: eventos antes do next ficam na fila e write/error vão aos canais', async () => {
    const harness = fakeStreams()
    const terminal = processTerminal(harness.streams)

    harness.emit(harness.input, 'data', 'a')
    harness.emit(harness.input, 'data', 'b')
    expect(await terminal.next()).toEqual({ kind: 'key', chunk: 'a' })
    expect(await terminal.next()).toEqual({ kind: 'key', chunk: 'b' })
    expect(terminal.size()).toEqual({ columns: 80, rows: 24 })

    terminal.write('frame')
    terminal.error('boom')
    expect(harness.out).toEqual(['frame'])
    expect(harness.err).toEqual(['boom\n'])
  })
})
