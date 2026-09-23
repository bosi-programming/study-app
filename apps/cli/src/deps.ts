import { randomUUID } from 'node:crypto'
import { type Clock, type Deps, type IdGenerator } from '@study/core'

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function todayLocalDate(): string {
  const now = new Date()
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`
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
