import { describe, expect, it } from 'vitest'
import { refuseTui } from '../../src/tui/loop/index.ts'

const REFUSAL = 'a TUI exige um terminal interativo'

describe('AC2 — a recusa fora de um terminal interativo', () => {
  it('tui-recusa-sem-tty: stdin ou stdout não-TTY devolvem usage/1/mensagem', () => {
    for (const [stdinTty, stdoutTty] of [[false, true], [true, false]] as const) {
      const error = refuseTui({ stdinTty, stdoutTty, noInput: false, json: false })

      expect(error?.code, `stdin=${stdinTty} stdout=${stdoutTty}`).toBe('usage')
      expect(error?.exitCode, `stdin=${stdinTty} stdout=${stdoutTty}`).toBe(1)
      expect(error?.message, `stdin=${stdinTty} stdout=${stdoutTty}`).toBe(REFUSAL)
    }
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
