import { type TuiEvent, type TuiSize, type TuiTerminal } from '../loop/index.ts'

export type TerminalInput = {
  setEncoding(encoding: BufferEncoding): unknown
  on(event: string, listener: (...args: never[]) => void): unknown
}

export type TerminalOutput = {
  on(event: string, listener: (...args: never[]) => void): unknown
  write(chunk: string): unknown
  readonly columns: number | undefined
  readonly rows: number | undefined
}

export type TerminalStreams = {
  readonly input: TerminalInput
  readonly output: TerminalOutput
  readonly error: { write(chunk: string): unknown }
}

const PROCESS_STREAMS: TerminalStreams = {
  input: process.stdin,
  output: process.stdout,
  error: process.stderr,
}

export function processTerminal(streams: TerminalStreams = PROCESS_STREAMS): TuiTerminal {
  const queue: TuiEvent[] = []
  let pending: ((event: TuiEvent | null) => void) | null = null
  let ended = false

  const deliver = (event: TuiEvent): void => {
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(event)
      return
    }
    queue.push(event)
  }

  const onData = (chunk: Buffer | string): void => {
    deliver({ kind: 'key', chunk: typeof chunk === 'string' ? chunk : chunk.toString('utf8') })
  }

  const onResize = (): void => {
    deliver({ kind: 'resize', columns: streams.output.columns ?? 0, rows: streams.output.rows ?? 0 })
  }

  const onEnd = (): void => {
    ended = true
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(null)
    }
  }

  const size = (): TuiSize => ({
    columns: streams.output.columns ?? 0,
    rows: streams.output.rows ?? 0,
  })

  streams.input.setEncoding('utf8')
  streams.input.on('data', onData)
  streams.input.on('end', onEnd)
  streams.output.on('resize', onResize)

  return {
    size,
    next: () =>
      new Promise<TuiEvent | null>((resolve) => {
        const queued = queue.shift()
        if (queued !== undefined) {
          resolve(queued)
          return
        }
        if (ended) {
          resolve(null)
          return
        }
        pending = resolve
      }),
    write: (frame) => {
      streams.output.write(frame)
    },
    error: (message) => {
      streams.error.write(`${message}\n`)
    },
  }
}
