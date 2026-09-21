import { type Clock, type IdGenerator, type Item } from '@study/core'

export function fixedClock(nowUtc: string, todayLocalDate: string): Clock {
  return { nowUtc: () => nowUtc, todayLocalDate: () => todayLocalDate }
}

export function seqIds(): IdGenerator {
  let count = 0
  return () => {
    count += 1
    return `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`
  }
}

export const SAMPLE_ID = '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60'

export function captureError(run: () => unknown): unknown {
  try {
    run()
    return null
  } catch (thrown) {
    return thrown
  }
}

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: SAMPLE_ID,
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
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
    ...overrides,
  }
}
