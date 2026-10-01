import { InvalidDifficultyError, subjectKey, titleKey, type Item, type ReviewLog } from '@study/core'
import { describe, expect, it } from 'vitest'
import {
  itemToRow,
  reviewLogToRow,
  rowToItem,
  rowToReviewLog,
  type ItemRow,
  type ReviewLogRow,
} from '../../src/store/mapping.ts'

const ITEM: Item = {
  id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
  title: 'Derivadas Parciais',
  subject: 'Cálculo',
  difficulty: 3,
  note: 'cap. 3 do Stewart',
  link: 'https://example.com/calculo',
  interval_days: 6,
  due_date: '2026-09-12',
  review_count: 2,
  on_time_streak: 2,
  status: 'active',
  last_reviewed_at: '2026-09-06T22:10:00Z',
  archived_at: null,
  cold_archived_at: null,
  created_at: '2026-08-30T09:00:00Z',
  updated_at: '2026-09-06T22:10:00Z',
}

const LOG: ReviewLog = {
  id: '9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
  item_id: ITEM.id,
  reviewed_at: '2026-09-06T22:10:00Z',
  due_date_at_review: '2026-09-06',
  interval_after: 6,
  review_count_after: 2,
  late: true,
}

function itemRow(): ItemRow {
  return itemToRow(ITEM)
}

describe('W-11.3 map-item-round-trip', () => {
  it('preserva todos os campos preenchidos entre entidade e linha', () => {
    expect(rowToItem(itemToRow(ITEM))).toEqual(ITEM)
  })

  it('preserva note e link nulos', () => {
    const bare: Item = { ...ITEM, note: null, link: null }
    expect(rowToItem(itemToRow(bare))).toEqual(bare)
  })
})

describe('W-11.4 map-late-0-1', () => {
  it('grava late true como 1 e false como 0', () => {
    expect(reviewLogToRow({ ...LOG, late: true }).late).toBe(1)
    expect(reviewLogToRow({ ...LOG, late: false }).late).toBe(0)
  })

  it('lê 1 como true e 0 como false', () => {
    expect(rowToReviewLog({ ...reviewLogToRow(LOG), late: 1 }).late).toBe(true)
    expect(rowToReviewLog({ ...reviewLogToRow(LOG), late: 0 }).late).toBe(false)
  })
})

describe('W-11.5 map-chaves-derivadas', () => {
  it('deriva title_key e subject_key iguais aos do core', () => {
    const row = itemToRow({ ...ITEM, title: 'Derivadas Parciais', subject: 'Cálculo' })

    expect(row.title_key).toBe(titleKey({ title: 'Derivadas Parciais' }))
    expect(row.subject_key).toBe(subjectKey({ subject: 'Cálculo' }))
    expect(row.title_key).toBe('derivadas parciais')
    expect(row.subject_key).toBe('calculo')
  })
})

describe('W-11.12 map-late-invalido', () => {
  it('recusa late fora de 0/1', () => {
    expect(() => rowToReviewLog({ ...reviewLogToRow(LOG), late: 2 })).toThrow()
  })
})

describe('W-11.13 map-difficulty-invalida', () => {
  it('recusa dificuldade fora de 1–5 com o erro do core', () => {
    expect(() => rowToItem({ ...itemRow(), difficulty: 6 })).toThrow(InvalidDifficultyError)
  })
})

describe('W-11.14 map-status-invalido', () => {
  it('recusa status fora de active/archived/cold', () => {
    expect(() => rowToItem({ ...itemRow(), status: 'trashed' })).toThrow()
  })
})

describe('round-trip de ReviewLog', () => {
  it('preserva todos os campos do log', () => {
    const row: ReviewLogRow = reviewLogToRow(LOG)
    expect(rowToReviewLog(row)).toEqual(LOG)
  })
})
