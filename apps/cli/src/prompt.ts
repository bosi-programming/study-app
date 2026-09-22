import { closeSync, openSync, readSync } from 'node:fs'
import { DIFFICULTY_LABELS, type Difficulty, toDifficulty } from '@study/core'

const MAX_LINE_BYTES = 64
const STDIN = 0

export function promptDifficulty(): Difficulty {
  process.stderr.write(`${labelsLine()}\n`)
  return toDifficulty(Number(readLine().trim()))
}

function labelsLine(): string {
  const entries = ([1, 2, 3, 4, 5] as const).map((value) => `${value} ${DIFFICULTY_LABELS[value]}`)
  return `Dificuldade (1–5): ${entries.join(', ')}`
}

function readLine(): string {
  const fd = openTty()
  try {
    const buffer = Buffer.alloc(MAX_LINE_BYTES)
    const bytes = readSync(fd, buffer, 0, buffer.length, null)
    return buffer.subarray(0, bytes).toString('utf8').split('\n')[0] ?? ''
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
