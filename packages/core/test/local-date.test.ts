import { describe, expect, it } from 'vitest'
import { addDays, compareDates, daysBetween, isValidLocalDate } from '@study/core'

describe('C-01 addDays', () => {
  it.each([
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['2026-09-12', 3, '2026-09-15'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-09-12', 365, '2027-09-12'],
  ])('%s + %i days is %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })
})

describe('C-02 compareDates and daysBetween', () => {
  it('orders the three date relations', () => {
    expect(compareDates('2026-09-11', '2026-09-12')).toBe(-1)
    expect(compareDates('2026-09-12', '2026-09-12')).toBe(0)
    expect(compareDates('2026-09-13', '2026-09-12')).toBe(1)
  })

  it.each([
    ['2026-09-06', '2026-09-12', 6],
    ['2026-09-12', '2026-09-06', -6],
    ['2026-09-12', '2026-09-12', 0],
    ['2026-09-06', '2026-10-01', 25],
    ['2028-02-27', '2028-03-02', 4],
  ])('daysBetween(%s, %s) is %i', (from, to, expected) => {
    expect(daysBetween(from, to)).toBe(expected)
    expect(daysBetween(to, from)).toBe(expected === 0 ? 0 : -expected)
  })
})

describe('C-03 isValidLocalDate', () => {
  it('accepts a well formed local date', () => {
    expect(isValidLocalDate('2026-09-12')).toBe(true)
  })

  it.each(['2026-2-3', '2026-13-01', '2026-02-30', ''])('rejects %s', (value) => {
    expect(isValidLocalDate(value)).toBe(false)
  })
})
