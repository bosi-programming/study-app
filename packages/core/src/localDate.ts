import { InvalidFieldError } from './errors.ts'

export type DateOrder = -1 | 0 | 1

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000
const INVALID_DATE_MESSAGE = 'data inválida: use YYYY-MM-DD'

type ParsedDate = {
  year: number
  month: number
  day: number
}

function parseLocalDate(value: string): ParsedDate | null {
  if (!LOCAL_DATE_PATTERN.test(value)) return null

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const asUtc = new Date(Date.UTC(year, month - 1, day))

  const roundTrips =
    asUtc.getUTCFullYear() === year &&
    asUtc.getUTCMonth() === month - 1 &&
    asUtc.getUTCDate() === day

  return roundTrips ? { year, month, day } : null
}

export function isValidLocalDate(value: string): boolean {
  return parseLocalDate(value) !== null
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0')
}

function formatEpochDay(epochDay: number): string {
  const asUtc = new Date(epochDay * MS_PER_DAY)
  const year = pad(asUtc.getUTCFullYear(), 4)
  const month = pad(asUtc.getUTCMonth() + 1, 2)
  const day = pad(asUtc.getUTCDate(), 2)
  return `${year}-${month}-${day}`
}

function toEpochDay(value: string): number {
  const parsed = parseLocalDate(value)
  if (!parsed) throw new InvalidFieldError('date', INVALID_DATE_MESSAGE)
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day) / MS_PER_DAY
}

function assertLocalDate(value: string): void {
  if (!isValidLocalDate(value)) throw new InvalidFieldError('date', INVALID_DATE_MESSAGE)
}

export function addDays(date: string, days: number): string {
  return formatEpochDay(toEpochDay(date) + days)
}

export function compareDates(left: string, right: string): DateOrder {
  assertLocalDate(left)
  assertLocalDate(right)
  if (left === right) return 0
  return left < right ? -1 : 1
}

export function daysBetween(from: string, to: string): number {
  return toEpochDay(to) - toEpochDay(from)
}

export function previousDay(date: string, days = 1): string {
  return addDays(date, -days)
}
