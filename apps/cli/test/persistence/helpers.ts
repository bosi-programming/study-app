import { type Item, type ReviewLog } from '@study/core'

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
    title: 'Derivadas parciais',
    subject: 'Cálculo',
    difficulty: 4,
    note: null,
    link: null,
    interval_days: 3,
    due_date: '2026-09-12',
    review_count: 0,
    on_time_streak: 0,
    status: 'active',
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: '2026-08-30T09:00:00Z',
    updated_at: '2026-08-30T09:00:00Z',
    ...overrides,
  }
}

export function makeLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: '9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
    item_id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
    reviewed_at: '2026-09-06T22:10:00Z',
    due_date_at_review: '2026-09-06',
    interval_after: 6,
    review_count_after: 2,
    late: false,
    ...overrides,
  }
}