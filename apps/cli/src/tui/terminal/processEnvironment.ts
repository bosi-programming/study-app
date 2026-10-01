import { type TerminalEnvironment } from './types.ts'

export function processEnvironment(): TerminalEnvironment {
  return {
    input: process.stdin,
    output: process.stdout,
    error: process.stderr,
    signals: process,
    exit: (code) => {
      process.exit(code)
    },
  }
}
