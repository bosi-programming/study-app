import { type TerminalSignal } from './types.ts'

const SIGNAL_EXIT_CODES: Record<TerminalSignal, number> = {
  SIGTERM: 143,
  SIGHUP: 129,
}

export function signalExitCode(signal: TerminalSignal): number {
  return SIGNAL_EXIT_CODES[signal]
}
