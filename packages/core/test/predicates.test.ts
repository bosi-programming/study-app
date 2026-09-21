import { describe, expect, it } from 'vitest'
import { compareDates, daysLate, isDue, isLate } from '@study/core'
import { makeItem } from './helpers.ts'

describe('C-49 isDue', () => {
  const today = '2026-09-20'

  it.each([
    ['active item overdue', makeItem({ status: 'active', due_date: '2026-09-10' }), true],
    ['active item due today', makeItem({ status: 'active', due_date: today }), true],
    ['active item due tomorrow', makeItem({ status: 'active', due_date: '2026-09-21' }), false],
    ['archived item overdue', makeItem({ status: 'archived', due_date: '2026-09-10' }), false],
    ['cold item overdue', makeItem({ status: 'cold', due_date: '2026-09-10' }), false],
  ])('%s is %s', (_label, item, expected) => {
    expect(isDue(item, today)).toBe(expected)
  })
})

describe('C-50 isLate and daysLate are date-only', () => {
  const today = '2026-09-20'

  it('counts an overdue item as late with the exact whole-day count', () => {
    const item = makeItem({ due_date: '2026-09-14' })
    expect(isLate(item, today)).toBe(true)
    expect(daysLate(item, today)).toBe(6)
  })

  it('does not call a due-today or future item late', () => {
    for (const dueDate of [today, '2026-09-21']) {
      const item = makeItem({ due_date: dueDate })
      expect(isLate(item, today)).toBe(false)
      expect(daysLate(item, today)).toBe(0)
    }
  })

  it('ignores status', () => {
    const archived = makeItem({ status: 'archived', due_date: '2026-09-18' })
    expect(isLate(archived, today)).toBe(true)
    expect(daysLate(archived, today)).toBe(2)
    expect(isDue(archived, today)).toBe(false)
  })
})

describe('C-51 daysLate across boundaries', () => {
  it.each([
    ['2026-09-06', '2026-10-01', 25],
    ['2028-02-27', '2028-03-02', 4],
  ])('%s to %s is %i days late', (dueDate, today, expected) => {
    expect(daysLate(makeItem({ due_date: dueDate }), today)).toBe(expected)
  })
})

describe('C-56 malformed dates fail the same way everywhere', () => {
  const malformed = 'not-a-date'
  const today = '2026-09-20'

  it.each([
    ['compareDates', () => compareDates(malformed, today)],
    ['compareDates with the bad value on the right', () => compareDates(today, malformed)],
    ['isLate', () => isLate(makeItem({ due_date: malformed }), today)],
    ['daysLate', () => daysLate(makeItem({ due_date: malformed }), today)],
    ['isDue', () => isDue(makeItem({ due_date: malformed }), today)],
  ])('%s rejects it instead of guessing', (_label, run) => {
    expect(run).toThrow('data inválida: use YYYY-MM-DD')
    expect(run).toThrow(
      expect.objectContaining({ kind: 'invalid-field', context: { field: 'date' } }),
    )
  })
})
