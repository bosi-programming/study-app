import { randomUUID } from 'node:crypto'
import { InvalidFieldError, type Clock, type Deps, type IdGenerator } from '@study/core'

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

export function localDateOf(instant: string): string {
  const parsed = new Date(instant)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidFieldError('instant', 'instante inválido: use ISO 8601')
  }
  const year = pad(parsed.getFullYear(), 4)
  const month = pad(parsed.getMonth() + 1, 2)
  const day = pad(parsed.getDate(), 2)
  return `${year}-${month}-${day}`
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
