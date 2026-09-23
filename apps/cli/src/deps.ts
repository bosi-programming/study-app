import { randomUUID } from 'node:crypto'
import { InvalidFieldError, type Clock, type Deps, type IdGenerator } from '@study/core'

function parseInstant(instant: string): Date | null {
  const parsed = new Date(instant)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function formatLocalDate(parsed: Date): string {
  const year = pad(parsed.getFullYear(), 4)
  const month = pad(parsed.getMonth() + 1, 2)
  const day = pad(parsed.getDate(), 2)
  return `${year}-${month}-${day}`
}

export function localDateOf(instant: string): string {
  const parsed = parseInstant(instant)
  if (parsed === null) {
    throw new InvalidFieldError('instant', 'instante inválido: use ISO 8601')
  }
  return formatLocalDate(parsed)
}

export function tryLocalDateOf(instant: string): string | null {
  const parsed = parseInstant(instant)
  return parsed === null ? null : formatLocalDate(parsed)
}

function todayLocalDate(): string {
  return localDateOf(new Date().toISOString())
}

export const systemClock: Clock = {
  nowUtc: () => new Date().toISOString(),
  todayLocalDate,
}

export const systemIds: IdGenerator = () => randomUUID()

export const systemDeps: Deps = {
  clock: systemClock,
  ids: systemIds,
}
