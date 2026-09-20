import { describe, expect, it } from 'vitest'
import { InvalidDifficultyError, InvalidFieldError, createItem } from '@study/core'
import { fixedClock, seqIds } from './helpers.ts'

const CLOCK = fixedClock('2026-09-12T09:00:00Z', '2026-09-12')

describe('C-08 createItem shape', () => {
  it('builds a full active item from the ports', () => {
    const ids = seqIds()
    const item = createItem({ title: 'Derivadas parciais', subject: 'Cálculo', difficulty: 4 }, { clock: CLOCK, ids })

    expect(item).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Derivadas parciais',
      subject: 'Cálculo',
      difficulty: 4,
      note: null,
      link: null,
      interval_days: 3,
      due_date: '2026-09-15',
      review_count: 0,
      on_time_streak: 0,
      status: 'active',
      last_reviewed_at: null,
      archived_at: null,
      cold_archived_at: null,
      created_at: '2026-09-12T09:00:00Z',
      updated_at: '2026-09-12T09:00:00Z',
    })
  })
})

describe('C-09 initial due date', () => {
  it.each([
    [1, 10, '2026-09-22'],
    [2, 7, '2026-09-19'],
    [3, 5, '2026-09-17'],
    [4, 3, '2026-09-15'],
    [5, 2, '2026-09-14'],
  ])('difficulty %i starts at %i days and is due %s', (difficulty, base, dueDate) => {
    const item = createItem(
      { title: 'Derivadas parciais', subject: 'Cálculo', difficulty },
      { clock: CLOCK, ids: seqIds() },
    )
    expect(item.interval_days).toBe(base)
    expect(item.due_date).toBe(dueDate)
  })
})

describe('C-10 stored text', () => {
  it('trims title and subject', () => {
    const item = createItem(
      { title: '  Derivadas parciais  ', subject: '  Cálculo  ', difficulty: 4 },
      { clock: CLOCK, ids: seqIds() },
    )
    expect(item.title).toBe('Derivadas parciais')
    expect(item.subject).toBe('Cálculo')
  })

  it('keeps note and link as explicit null keys when omitted', () => {
    const item = createItem({ title: 't', subject: 's', difficulty: 1 }, { clock: CLOCK, ids: seqIds() })
    expect(Object.keys(item)).toContain('note')
    expect(Object.keys(item)).toContain('link')
    expect(item.note).toBeNull()
    expect(item.link).toBeNull()
  })
})

describe('C-11 blank note and link', () => {
  it('collapses blank-after-trim values to null', () => {
    const item = createItem(
      { title: 't', subject: 's', difficulty: 1, note: '   ', link: '  ' },
      { clock: CLOCK, ids: seqIds() },
    )
    expect(item.note).toBeNull()
    expect(item.link).toBeNull()
  })
})

describe('C-12 field rejections', () => {
  const cases: [string, string, Record<string, unknown>][] = [
    ['title', 'título é obrigatório', { title: '' }],
    ['title', 'título é obrigatório', { title: '   ' }],
    ['title', 'título deve ter no máximo 200 caracteres', { title: 'x'.repeat(201) }],
    ['subject', 'matéria é obrigatória', { subject: '' }],
    ['subject', 'matéria é obrigatória', { subject: '   ' }],
    ['subject', 'matéria deve ter no máximo 60 caracteres', { subject: 'x'.repeat(61) }],
    ['note', 'nota deve ter no máximo 10000 caracteres', { note: 'x'.repeat(10_001) }],
  ]

  it.each(cases)('rejects a bad %s with invalid-field', (field, message, overrides) => {
    const input = { title: 't', subject: 's', difficulty: 1, ...overrides }
    const error = (() => {
      try {
        createItem(input, { clock: CLOCK, ids: seqIds() })
        return null
      } catch (thrown) {
        return thrown
      }
    })()

    expect(error).toBeInstanceOf(InvalidFieldError)
    expect((error as InvalidFieldError).context).toEqual({ field })
    expect((error as InvalidFieldError).message).toBe(message)
  })

  it('accepts the boundary lengths', () => {
    const item = createItem(
      { title: 'x'.repeat(200), subject: 'x'.repeat(60), difficulty: 1, note: 'x'.repeat(10_000) },
      { clock: CLOCK, ids: seqIds() },
    )
    expect(item.note).toHaveLength(10_000)
  })
})

describe('C-13 difficulty domain', () => {
  it.each([0, 6, 3.5, Number.NaN])('rejects %s', (difficulty) => {
    expect(() =>
      createItem({ title: 't', subject: 's', difficulty }, { clock: CLOCK, ids: seqIds() }),
    ).toThrow(InvalidDifficultyError)
    expect(() =>
      createItem({ title: 't', subject: 's', difficulty }, { clock: CLOCK, ids: seqIds() }),
    ).toThrow('dificuldade inválida: use 1 a 5')
  })
})

describe('C-14 link is free-form', () => {
  it('accepts a non-URL string', () => {
    const item = createItem(
      { title: 't', subject: 's', difficulty: 1, link: 'cap. 3 do Stewart' },
      { clock: CLOCK, ids: seqIds() },
    )
    expect(item.link).toBe('cap. 3 do Stewart')
  })
})

describe('C-15 duplicate titles', () => {
  it('allows two items to share a title', () => {
    const deps = { clock: CLOCK, ids: seqIds() }
    const first = createItem({ title: 'Derivadas parciais', subject: 'Cálculo', difficulty: 4 }, deps)
    const second = createItem({ title: 'Derivadas parciais', subject: 'Física', difficulty: 2 }, deps)

    expect(second.title).toBe(first.title)
    expect(second.id).not.toBe(first.id)
  })
})
