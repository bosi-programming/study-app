import { describe, expect, it } from 'vitest'
import { refuseTui } from '../../src/tui/loop/index.ts'

const REFUSAL = 'a TUI exige um terminal interativo'

describe('AC2 — a recusa fora de um terminal interativo (U-12)', () => {
  it.each([
    ['stdin não-TTY', false, true],
    ['stdout não-TTY', true, false],
  ] as const)('tui-recusa-sem-tty: %s devolve usage/1/mensagem', (_name, stdinTty, stdoutTty) => {
    const error = refuseTui({ stdinTty, stdoutTty, noInput: false, json: false })

    expect(error?.code).toBe('usage')
    expect(error?.exitCode).toBe(1)
    expect(error?.message).toBe(REFUSAL)
  })

  it('tui-recusa-no-input: --no-input devolve a mesma recusa', () => {
    const error = refuseTui({ stdinTty: true, stdoutTty: true, noInput: true, json: false })

    expect(error?.code).toBe('usage')
    expect(error?.exitCode).toBe(1)
    expect(error?.message).toBe(REFUSAL)
  })

  it('tui-recusa-json: --json devolve a mesma recusa', () => {
    const error = refuseTui({ stdinTty: true, stdoutTty: true, noInput: false, json: true })

    expect(error?.code).toBe('usage')
    expect(error?.exitCode).toBe(1)
    expect(error?.message).toBe(REFUSAL)
  })

  it('tui-recusa-com-tty: stdin e stdout TTY, sem flags, devolvem null', () => {
    expect(refuseTui({ stdinTty: true, stdoutTty: true, noInput: false, json: false })).toBeNull()
  })
})
