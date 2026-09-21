import { describe, expect, it } from 'vitest'
import { intervalFor, isDue, recordReview, reevaluateDifficulty, toDifficulty } from '@study/core'
import type { Difficulty, Item } from '@study/core'
import { fixedClock, makeItem, seqIds } from './helpers.ts'

const TODAY = '2026-09-20'
const NOW = '2026-09-20T22:10:00Z'

function reviewDeps() {
  return { clock: fixedClock(NOW, TODAY), ids: seqIds() }
}

function reevalDeps() {
  return { clock: fixedClock(NOW, TODAY), ids: seqIds() }
}

describe('C-17 intervalFor', () => {
  it.each([
    [5, 0, 2],
    [4, 0, 3],
    [3, 0, 5],
    [2, 0, 7],
    [1, 0, 10],
    [5, 1, 4],
    [3, 1, 10],
    [3, 2, 20],
    [1, 4, 160],
  ])('d%i at n=%i is %i days', (difficulty, n, expected) => {
    expect(intervalFor(toDifficulty(difficulty), n)).toBe(expected)
  })

  it.each([8, 9, 12, 200])('clamps at the cap for n=%i', (n) => {
    const value = intervalFor(1, n)
    expect(value).toBe(365)
    expect(Number.isFinite(value)).toBe(true)
    expect(Number.isNaN(value)).toBe(false)
  })
})

describe('C-18 check-in at the cap', () => {
  it('records the check-in while the interval stays at 365', () => {
    const item = makeItem({ difficulty: 3, review_count: 8, interval_days: 320, due_date: TODAY })
    const { item: next, log } = recordReview(item, reviewDeps())

    expect(next.review_count).toBe(9)
    expect(next.interval_days).toBe(365)
    expect(log.interval_after).toBe(365)
    expect(log.review_count_after).toBe(9)
  })
})

describe('C-19 late check-in', () => {
  it('doubles the interval and penalizes nothing', () => {
    const item = makeItem({ difficulty: 3, review_count: 1, interval_days: 10, due_date: '2026-09-10' })
    const { item: next, log } = recordReview(item, reviewDeps())

    expect(next.review_count).toBe(2)
    expect(next.interval_days).toBe(20)
    expect(next.difficulty).toBe(3)
    expect(log.late).toBe(true)
  })

  it('counts a check-in on the due day as on time', () => {
    const item = makeItem({ difficulty: 3, review_count: 1, interval_days: 10, due_date: TODAY })
    const { log } = recordReview(item, reviewDeps())

    expect(log.late).toBe(false)
  })
})

describe('C-20 streak restart', () => {
  it('starts at 1 on the first on-time check-in after a reset', () => {
    const late = makeItem({ due_date: '2026-09-01', on_time_streak: 2 })
    const afterLate = recordReview(late, reviewDeps()).item
    expect(afterLate.on_time_streak).toBe(0)

    const onTime = recordReview({ ...afterLate, due_date: TODAY }, reviewDeps()).item
    expect(onTime.on_time_streak).toBe(1)
  })
})

describe('C-21 reevaluateDifficulty with a new value', () => {
  it('recomputes from the new base at the same n and re-bases the due date on today', () => {
    const item = makeItem({ difficulty: 5, review_count: 2, interval_days: 8, due_date: '2026-09-24' })
    const next = reevaluateDifficulty(item, 2, reevalDeps())

    expect(item.interval_days).toBe(8)
    expect(next.interval_days).toBe(28)
    expect(next.difficulty).toBe(2)
    expect(next.review_count).toBe(2)
    expect(next.due_date).toBe('2026-10-18')
  })
})

describe('C-22 reevaluateDifficulty with the current value', () => {
  it('is a no-op', () => {
    const item = makeItem({ difficulty: 5, review_count: 2, interval_days: 8, due_date: '2026-09-24' })
    const next = reevaluateDifficulty(item, 5, reevalDeps())

    expect(next).toEqual(item)
    expect(next.due_date).toBe(item.due_date)
    expect(next.updated_at).toBe(item.updated_at)
  })
})

describe('C-23 early check-in', () => {
  it('counts as on time and discards the future due date', () => {
    const item = makeItem({ difficulty: 3, review_count: 0, due_date: '2026-12-01' })
    const { item: next, log } = recordReview(item, reviewDeps())

    expect(log.late).toBe(false)
    expect(next.review_count).toBe(1)
    expect(next.interval_days).toBe(10)
    expect(next.due_date).toBe('2026-09-30')
  })
})

describe('C-24 two check-ins on the same local day', () => {
  it('increments n twice and doubles the interval twice', () => {
    const item = makeItem({ difficulty: 3, review_count: 0, interval_days: 5, due_date: TODAY })
    const first = recordReview(item, reviewDeps())
    const second = recordReview(first.item, reviewDeps())

    expect(first.item.review_count).toBe(1)
    expect(first.item.interval_days).toBe(10)
    expect(second.item.review_count).toBe(2)
    expect(second.item.interval_days).toBe(20)
    expect(second.log.reviewed_at).toBe(first.log.reviewed_at)
    expect(second.log.due_date_at_review).toBe(first.item.due_date)
  })
})

describe('C-25 review log', () => {
  it('carries the pre-check-in due date, the capped interval and the new count', () => {
    const item = makeItem({
      id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
      difficulty: 3,
      review_count: 1,
      interval_days: 10,
      due_date: '2026-09-10',
    })
    const { log } = recordReview(item, reviewDeps())

    expect(log).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      item_id: '2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60',
      reviewed_at: NOW,
      due_date_at_review: '2026-09-10',
      interval_after: 20,
      review_count_after: 2,
      late: true,
    })
  })
})

describe('C-26 recordReview is pure', () => {
  it('returns a new item and leaves the input untouched', () => {
    const item = Object.freeze(makeItem({ due_date: TODAY }))
    const { item: next, log } = recordReview(item, reviewDeps())

    expect(next).not.toBe(item)
    expect(log).not.toBe(item)
    expect(next.review_count).toBe(1)
    expect(item.review_count).toBe(0)
    expect(item.updated_at).toBe('2026-09-01T12:00:00Z')
  })
})

describe('C-27 streak never feeds the interval', () => {
  it('yields identical intervals for items differing only in streak progress', () => {
    const base = makeItem({ difficulty: 3, review_count: 1, interval_days: 10, due_date: TODAY })
    const fresh = recordReview({ ...base, on_time_streak: 0 }, reviewDeps()).item
    const seasoned = recordReview({ ...base, on_time_streak: 7 }, reviewDeps()).item

    expect(fresh.interval_days).toBe(seasoned.interval_days)
  })
})

describe('C-28 on-time check-in', () => {
  it('takes the streak from 2 to 3 without touching difficulty', () => {
    const item = makeItem({ difficulty: 4, on_time_streak: 2, due_date: TODAY })
    const { item: next } = recordReview(item, reviewDeps())

    expect(next.on_time_streak).toBe(3)
    expect(next.difficulty).toBe(4)
  })
})

describe('C-29 late check-in resets the streak', () => {
  it('zeroes on_time_streak after the due date', () => {
    const item = makeItem({ on_time_streak: 2, due_date: '2026-09-19' })
    const { item: next } = recordReview(item, reviewDeps())

    expect(next.on_time_streak).toBe(0)
  })
})

describe('C-30 updated_at comes from the clock', () => {
  it('stamps a check-in', () => {
    const { item: next, log } = recordReview(makeItem({ due_date: TODAY }), reviewDeps())

    expect(next.updated_at).toBe(NOW)
    expect(next.last_reviewed_at).toBe(NOW)
    expect(log.reviewed_at).toBe(NOW)
  })

  it('stamps a re-evaluation', () => {
    const item = makeItem({ difficulty: 4, due_date: '2026-09-23' })
    const next = reevaluateDifficulty(item, 2, reevalDeps())

    expect(next.updated_at).toBe(NOW)
  })
})

describe('C-55 determinism under injected ports', () => {
  it('produces deep-equal results for two identical calls', () => {
    const build = (difficulty: Difficulty, reviewCount: number): Item =>
      makeItem({ difficulty, review_count: reviewCount, due_date: '2026-09-10' })

    const first = recordReview(build(3, 2), reviewDeps())
    const second = recordReview(build(3, 2), reviewDeps())
    expect(first).toEqual(second)

    const reevaluatedFirst = reevaluateDifficulty(build(4, 2), 2, reevalDeps())
    const reevaluatedSecond = reevaluateDifficulty(build(4, 2), 2, reevalDeps())
    expect(reevaluatedFirst).toEqual(reevaluatedSecond)
  })
})

describe('C-54 recordReview on a non-active item', () => {
  it('refuses an archived item with the unarchive instruction', () => {
    const item = makeItem({ status: 'archived' })
    let error: unknown
    try {
      recordReview(item, reviewDeps())
    } catch (thrown) {
      error = thrown
    }

    expect(error).toMatchObject({
      kind: 'item-not-active',
      context: { status: 'archived' },
      message: 'item arquivado; use study unarchive <ref>',
    })
  })

  it('refuses a cold item with the same kind', () => {
    const item = makeItem({ status: 'cold' })
    let error: unknown
    try {
      recordReview(item, reviewDeps())
    } catch (thrown) {
      error = thrown
    }

    expect(error).toMatchObject({
      kind: 'item-not-active',
      context: { status: 'cold' },
      message: 'item no arquivo morto; use study cold restore <ref>',
    })
  })
})

describe('isDue is the queue definition', () => {
  it('treats an active item due today as queued', () => {
    expect(isDue(makeItem({ due_date: TODAY }), TODAY)).toBe(true)
  })
})
