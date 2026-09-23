import { InvalidDifficultyError } from '@study/core'
import { describe, expect, it } from 'vitest'
import { difficultyFromLine, difficultyPromptLabel } from '../src/prompt.ts'

describe('AC6 — o parsing do prompt (RF-12, CA-13)', () => {
  it('prompt-linha-vazia-mantem: com valor atual, a linha vazia devolve a atual', () => {
    expect(difficultyFromLine('', 4)).toBe(4)
    expect(difficultyFromLine('   ', 4)).toBe(4)
  })

  it('prompt-valor-novo: devolve o valor digitado e o rótulo traz a atual', () => {
    expect(difficultyFromLine('2', 4)).toBe(2)
    expect(difficultyPromptLabel(4)).toContain('4')
    expect(difficultyPromptLabel(4)).toContain('Enter mantém')
  })

  it('prompt-vazio-sem-atual: o caminho do add recusa a linha vazia', () => {
    expect(() => difficultyFromLine('')).toThrow(InvalidDifficultyError)
    expect(() => difficultyFromLine('')).toThrow('dificuldade inválida: use 1 a 5')
    expect(difficultyPromptLabel()).toContain('Dificuldade (1–5):')
  })

  it('prompt-fora-de-1-5: 9, 0 e 2.5 saem como dificuldade inválida', () => {
    for (const line of ['9', '0', '2.5']) {
      expect(() => difficultyFromLine(line, 4), line).toThrow(InvalidDifficultyError)
    }
  })
})
