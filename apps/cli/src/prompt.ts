import { closeSync, openSync, readSync } from 'node:fs'
import { DIFFICULTY_LABELS, type Difficulty, toDifficulty } from '@study/core'
import { CliError } from './errors.ts'

const MAX_LINE_BYTES = 64
const STDIN = 0
const DIFFICULTY_VALUES = [1, 2, 3, 4, 5] as const
const ABORT_EXIT_CODE = 130

export function difficultyFromLine(line: string, current?: Difficulty): Difficulty {
  const trimmed = line.trim()
  if (trimmed.length === 0 && current !== undefined) return current
  return toDifficulty(Number(trimmed))
}

export function difficultyPromptLabel(current?: Difficulty): string {
  if (current !== undefined) return `Dificuldade atual: ${current} — Enter mantém, ou escolha 1–5:`
  const entries = DIFFICULTY_VALUES.map((value) => `${value} ${DIFFICULTY_LABELS[value]}`)
  return `Dificuldade (1–5): ${entries.join(', ')}`
}

export function promptDifficulty(current?: Difficulty): Difficulty {
  process.stderr.write(`${difficultyPromptLabel(current)}\n`)
  return difficultyFromLine(readLine(), current)
}

export function withPromptAbort<T>(run: () => T): T {
  const onInterrupt = (): void => {
    process.exit(ABORT_EXIT_CODE)
  }
  process.on('SIGINT', onInterrupt)
  try {
    return run()
  } finally {
    process.off('SIGINT', onInterrupt)
  }
}

function readLine(): string {
  const fd = openTty()
  try {
    const buffer = Buffer.alloc(MAX_LINE_BYTES)
    const bytes = readSync(fd, buffer, 0, buffer.length, null)
    return buffer.subarray(0, bytes).toString('utf8').split('\n')[0] ?? ''
  } catch {
    throw CliError.aborted()
  } finally {
    if (fd !== STDIN) closeSync(fd)
  }
}

function openTty(): number {
  try {
    return openSync('/dev/tty', 'r')
  } catch {
    return STDIN
  }
}
