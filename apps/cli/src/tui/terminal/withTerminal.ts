import { openTerminal } from './openTerminal.ts'
import { type TerminalEnvironment, type TerminalHandle } from './types.ts'

export async function withTerminal<T>(
  run: (terminal: TerminalHandle) => Promise<T>,
  environment?: TerminalEnvironment,
): Promise<T> {
  const terminal = openTerminal(environment)
  try {
    return await run(terminal)
  } finally {
    terminal.close()
  }
}
