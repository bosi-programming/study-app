import { describe, expect, it } from 'vitest'
import { signalExitCode } from '../../src/tui/terminal/signalExitCode.ts'

describe('o exit de sinal do adaptador de terminal', () => {
  it('terminal-sinal-exit-codes: SIGTERM sai 143 e SIGHUP sai 129', () => {
    expect(signalExitCode('SIGTERM')).toBe(143)
    expect(signalExitCode('SIGHUP')).toBe(129)
  })
})
