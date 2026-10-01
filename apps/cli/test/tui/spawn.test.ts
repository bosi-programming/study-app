import { describe, expect, it } from 'vitest'
import { SPAWN_SWEEP_TIMEOUT_MS, errorOf, runStudy } from '../commands/helpers.ts'

const REFUSAL = 'a TUI exige um terminal interativo'

describe('AC3/AC4 — o spawn de study tui sem terminal (U-11, U-12)', () => {
  it('tui-spawn-sem-tty: sem TTY sai 1, escreve a recusa no stderr e nada no stdout (U-11)', () => {
    const result = runStudy(['tui'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain(REFUSAL)
  }, SPAWN_SWEEP_TIMEOUT_MS)

  it('tui-spawn-no-input: --no-input cai na mesma recusa (U-11)', () => {
    const result = runStudy(['tui', '--no-input'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain(REFUSAL)
  }, SPAWN_SWEEP_TIMEOUT_MS)

  it('tui-spawn-json: --json sai 1, com o envelope usage no stderr e stdout vazio (U-12)', () => {
    const result = runStudy(['tui', '--json'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(errorOf(result)).toEqual({ code: 'usage', message: REFUSAL })
  }, SPAWN_SWEEP_TIMEOUT_MS)
})
