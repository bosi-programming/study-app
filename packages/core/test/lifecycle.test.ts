import { describe, expect, it } from 'vitest'
import { makeItem } from './helpers.ts'
import { archiveItem, unarchiveItem } from '@study/core'

const NOW = '2026-09-30T14:00:00Z'

describe('C-66 archive carimba archived_at e preserva o resto', () => {
  it('lifecycle-archive-carimba-archived_at-e-preserva-o-resto', () => {
    const item = makeItem({ id: 'a-1', review_count: 3, difficulty: 5, interval_days: 40 })

    const archived = archiveItem(item, NOW)

    expect(archived).toEqual({
      ...item,
      status: 'archived',
      archived_at: NOW,
      updated_at: NOW,
    })
  })
})

describe('C-67 unarchive volta a ativo e limpa archived_at', () => {
  it('lifecycle-unarchive-volta-a-ativo-e-limpa-archived_at', () => {
    const item = makeItem({ status: 'archived', archived_at: '2026-09-01T10:00:00Z' })

    const unarchived = unarchiveItem(item, NOW)

    expect(unarchived).toEqual({
      ...item,
      status: 'active',
      archived_at: null,
      updated_at: NOW,
    })
  })
})
