import { InvalidDifficultyError } from '@study/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { difficultyFromLine, difficultyPromptLabel, promptDifficulty } from '../src/prompt.ts'

const fsMock = vi.hoisted(() => ({
  openSync: vi.fn<(path: string, flags: string) => number>(),
  readSync: vi.fn<(fd: number, buffer: Buffer, offset: number, length: number) => number>(),
  closeSync: vi.fn<(fd: number) => void>(),
}))

vi.mock('node:fs', () => fsMock)

const stderrSpy = vi.hoisted(() => ({ write: vi.fn<(chunk: string) => boolean>() }))

function chainInput(text: string): void {
  fsMock.readSync.mockImplementation((_fd, buffer) => {
    const bytes = Buffer.from(text)
    bytes.copy(buffer)
    return bytes.length
  })
}

function stderrText(): string {
  return stderrSpy.write.mock.calls.map((call) => String(call[0])).join('')
}

beforeEach(() => {
  fsMock.openSync.mockReset().mockReturnValue(7)
  fsMock.readSync.mockReset()
  fsMock.closeSync.mockReset()
  stderrSpy.write.mockReset().mockReturnValue(true)
  vi.spyOn(process.stderr, 'write').mockImplementation(stderrSpy.write)
})

afterEach(() => {
  vi.restoreAllMocks()
})

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

describe('AC7 — o prompt lê de /dev/tty', () => {
  it('tty-abre-dev-tty: abre /dev/tty e lê a linha desse fd', () => {
    chainInput('4\n')

    const value = promptDifficulty()

    expect(fsMock.openSync).toHaveBeenCalledWith('/dev/tty', 'r')
    expect(fsMock.readSync.mock.calls[0]?.[0]).toBe(7)
    expect(fsMock.closeSync).toHaveBeenCalledWith(7)
    expect(stderrText()).toContain('Dificuldade (1–5):')
    expect(value).toBe(4)
  })

  it('tty-fallback-fd0: sem /dev/tty lê do fd 0 e não fecha o fd 0', () => {
    fsMock.openSync.mockImplementation(() => {
      throw new Error('sem terminal')
    })
    chainInput('3\n')

    const value = promptDifficulty()

    expect(fsMock.readSync.mock.calls[0]?.[0]).toBe(0)
    expect(fsMock.closeSync).not.toHaveBeenCalled()
    expect(value).toBe(3)
  })

  it('tty-linha-lida: a linha lida é a que o prompt devolve', () => {
    chainInput('2\nlixo depois da quebra')

    expect(promptDifficulty()).toBe(2)
  })
})
