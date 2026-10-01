import { type TuiEvent, type TuiSize } from '../loop/index.ts'
import {
  ENTER_ALTERNATE_SCREEN,
  HIDE_CURSOR,
  LEAVE_ALTERNATE_SCREEN,
  SHOW_CURSOR,
} from './escapeSequences.ts'
import { processEnvironment } from './processEnvironment.ts'
import { signalExitCode } from './signalExitCode.ts'
import { type TerminalEnvironment, type TerminalHandle, type TerminalSignal } from './types.ts'

const UTF8 = 'utf8'

function textOf(chunk: unknown): string {
  if (typeof chunk === 'string') return chunk
  if (chunk instanceof Uint8Array) return Buffer.from(chunk).toString(UTF8)
  return String(chunk)
}

export function openTerminal(environment: TerminalEnvironment = processEnvironment()): TerminalHandle {
  const { input, output, signals } = environment
  const queue: TuiEvent[] = []
  let pending: ((event: TuiEvent | null) => void) | null = null
  let ended = false
  let closed = false

  const deliver = (event: TuiEvent): void => {
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(event)
      return
    }
    queue.push(event)
  }

  const onData = (chunk: unknown): void => {
    deliver({ kind: 'key', chunk: textOf(chunk) })
  }

  const onResize = (): void => {
    deliver({ kind: 'resize', columns: output.columns ?? 0, rows: output.rows ?? 0 })
  }

  const onEnd = (): void => {
    ended = true
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(null)
    }
  }

  const onTerm = (): void => {
    onSignal('SIGTERM')
  }

  const onHup = (): void => {
    onSignal('SIGHUP')
  }

  function onSignal(signal: TerminalSignal): void {
    if (closed) return
    close()
    environment.exit(signalExitCode(signal))
  }

  function close(): void {
    if (closed) return
    closed = true
    output.write(`${LEAVE_ALTERNATE_SCREEN}${SHOW_CURSOR}`)
    input.setRawMode(false)
    input.off('data', onData)
    input.off('end', onEnd)
    output.off('resize', onResize)
    signals.off('SIGTERM', onTerm)
    signals.off('SIGHUP', onHup)
    input.pause()
  }

  const size = (): TuiSize => ({ columns: output.columns ?? 0, rows: output.rows ?? 0 })

  input.setRawMode(true)
  output.write(`${ENTER_ALTERNATE_SCREEN}${HIDE_CURSOR}`)
  input.setEncoding(UTF8)
  input.on('data', onData)
  input.on('end', onEnd)
  output.on('resize', onResize)
  signals.on('SIGTERM', onTerm)
  signals.on('SIGHUP', onHup)

  const terminal: TerminalHandle = {
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
      output.write(frame)
    },
    error: (message) => {
      environment.error.write(`${message}\n`)
    },
    close,
  }

  return terminal
}
