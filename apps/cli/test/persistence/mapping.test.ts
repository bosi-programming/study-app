import { describe, expect, it } from 'vitest'
import { rowToItem, itemToRow, reviewLogToRow, rowToReviewLog } from '../../src/persistence/mapping.ts'
import { makeItem, makeLog } from './helpers.ts'

describe('mapping itemToRow', () => {
  it('derives title_key and subject_key without case or accents', () => {
    const item = makeItem({ title: 'Derivadas Parciais', subject: 'Cálculo' })
    const row = itemToRow(item)
    expect(row.title_key).toBe('derivadas parciais')
    expect(row.subject_key).toBe('calculo')
  })

  it('passes every other field through verbatim', () => {
    const item = makeItem({
      difficulty: 5,
      interval_days: 24,
      due_date: '2026-09-24',
      review_count: 3,
      on_time_streak: 2,
      status: 'archived',
      last_reviewed_at: '2026-09-06T22:10:00Z',
      archived_at: '2026-09-20T08:00:00Z',
      created_at: '2026-08-30T09:00:00Z',
      updated_at: '2026-09-20T08:00:00Z',
    })
    const row = itemToRow(item)
    expect(row).toMatchObject({
      id: item.id,
      title: 'Derivadas parciais',
      subject: 'Cálculo',
      difficulty: 5,
      note: null,
      link: null,
      interval_days: 24,
      due_date: '2026-09-24',
      review_count: 3,
      on_time_streak: 2,
      status: 'archived',
      last_reviewed_at: '2026-09-06T22:10:00Z',
      archived_at: '2026-09-20T08:00:00Z',
      cold_archived_at: null,
      created_at: '2026-08-30T09:00:00Z',
      updated_at: '2026-09-20T08:00:00Z',
    })
  })

  it('keeps non-null note and link untouched', () => {
    const row = itemToRow(makeItem({ note: '  cap. 3 do Stewart  ', link: 'https://example.com' }))
    expect(row.note).toBe('  cap. 3 do Stewart  ')
    expect(row.link).toBe('https://example.com')
  })
})

describe('mapping rowToItem', () => {
  it('round-trips an item back to the same entity', () => {
    const item = makeItem({ note: 'cap. 3', link: 'https://example.com', status: 'cold' })
    expect(rowToItem(itemToRow(item))).toEqual(item)
  })

  it('fails loud on an out-of-range difficulty', () => {
    const row = itemToRow(makeItem({ difficulty: 4 }))
    expect(() => rowToItem({ ...row, difficulty: 7 })).toThrow(/dificuldade inválida/)
  })

  it('fails loud on an unknown status', () => {
    const row = itemToRow(makeItem())
    expect(() => rowToItem({ ...row, status: 'vaporware' })).toThrow(/status inválido/)
  })
})

describe('mapping late booleano', () => {
  it('writes true as 1 and false as 0', () => {
    expect(reviewLogToRow(makeLog({ late: true })).late).toBe(1)
    expect(reviewLogToRow(makeLog({ late: false })).late).toBe(0)
  })

  it('reads 1 as true and 0 as false', () => {
    expect(rowToReviewLog(reviewLogToRow(makeLog({ late: true }))).late).toBe(true)
    expect(rowToReviewLog(reviewLogToRow(makeLog({ late: false }))).late).toBe(false)
  })

  it('round-trips every other field of the log', () => {
    const log = makeLog({ late: true })
    expect(rowToReviewLog(reviewLogToRow(log))).toEqual(log)
  })

  it('fails loud on a late value other than 0 or 1', () => {
    const row = reviewLogToRow(makeLog())
    expect(() => rowToReviewLog({ ...row, late: 2 })).toThrow(/late/)
  })
})