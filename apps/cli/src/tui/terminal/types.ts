import { type TuiTerminal } from '../loop/index.ts'

export type TerminalSignal = 'SIGTERM' | 'SIGHUP'

export type TerminalInput = {
  setEncoding(encoding: BufferEncoding): unknown
  setRawMode(mode: boolean): unknown
  on(event: string, listener: (...args: unknown[]) => void): unknown
  off(event: string, listener: (...args: unknown[]) => void): unknown
  pause(): unknown
}

export type TerminalOutput = {
  on(event: string, listener: (...args: unknown[]) => void): unknown
  off(event: string, listener: (...args: unknown[]) => void): unknown
  write(chunk: string): unknown
  readonly columns: number | undefined
  readonly rows: number | undefined
}

export type TerminalSignals = {
  on(event: TerminalSignal, listener: () => void): unknown
  off(event: TerminalSignal, listener: () => void): unknown
}

export type TerminalEnvironment = {
  readonly input: TerminalInput
  readonly output: TerminalOutput
  readonly error: { write(chunk: string): unknown }
  readonly signals: TerminalSignals
  readonly exit: (code: number) => void
}

export type TerminalHandle = TuiTerminal & { close(): void }
