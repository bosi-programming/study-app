import { describe, expect, it } from 'vitest'
import { advanceQueueStreak, hasDueItems } from '@study/core'
import type { QueueStreak } from '@study/core'
import { makeItem } from './helpers.ts'

const TODAY = '2026-09-20'

describe('C-31 empty queue, last day yesterday', () => {
  it('credits one more day', () => {
    expect(advanceQueueStreak({ streak_current: 4, streak_last_day: '2026-09-19' }, true, TODAY)).toEqual({
      streak_current: 5,
      streak_last_day: TODAY,
    })
  })
})

describe('C-32 empty queue, last day today', () => {
  it('leaves the count unchanged when computed twice in a day', () => {
    expect(advanceQueueStreak({ streak_current: 4, streak_last_day: TODAY }, true, TODAY)).toEqual({
      streak_current: 4,
      streak_last_day: TODAY,
    })
  })
})

describe('C-33 empty queue, any other last day', () => {
  it.each([
    ['two days back', '2026-09-18'],
    ['a month back', '2026-08-20'],
    ['in the future', '2026-09-25'],
  ])('restarts at 1 for %s', (_label, lastDay) => {
    expect(advanceQueueStreak({ streak_current: 9, streak_last_day: lastDay }, true, TODAY)).toEqual({
      streak_current: 1,
      streak_last_day: TODAY,
    })
  })

  it('restarts at 1 when there is no last day at all', () => {
    expect(advanceQueueStreak({ streak_current: 0, streak_last_day: null }, true, TODAY)).toEqual({
      streak_current: 1,
      streak_last_day: TODAY,
    })
  })
})

describe('C-34 non-empty queue', () => {
  it('zeroes the streak', () => {
    expect(advanceQueueStreak({ streak_current: 4, streak_last_day: '2026-09-19' }, false, TODAY)).toEqual({
      streak_current: 0,
      streak_last_day: TODAY,
    })
  })
})

describe('C-35 every branch stamps the day', () => {
  const starts: QueueStreak[] = [
    { streak_current: 4, streak_last_day: '2026-09-19' },
    { streak_current: 4, streak_last_day: TODAY },
    { streak_current: 4, streak_last_day: '2026-09-01' },
    { streak_current: 0, streak_last_day: null },
  ]

  it.each(starts.map((state) => [state] as const))('$streak_current/$streak_last_day', (state) => {
    expect(advanceQueueStreak(state, true, TODAY).streak_last_day).toBe(TODAY)
    expect(advanceQueueStreak(state, false, TODAY).streak_last_day).toBe(TODAY)
  })
})

describe('C-36 CA-16 end to end', () => {
  it('accumulates three empty days and restarts after a day with a due item', () => {
    const days = ['2026-09-18', '2026-09-19', '2026-09-20']
    const state = days.reduce<QueueStreak>(
      (current, day) => advanceQueueStreak(current, true, day),
      { streak_current: 0, streak_last_day: null },
    )
    expect(state.streak_current).toBe(3)

    const broken = advanceQueueStreak(state, false, '2026-09-21')
    expect(broken.streak_current).toBe(0)

    const after = advanceQueueStreak(broken, true, '2026-09-22')
    expect(after.streak_current).toBe(1)
  })

  it('keeps the streak while a queue stays empty across a month boundary', () => {
    const state = advanceQueueStreak({ streak_current: 2, streak_last_day: '2026-09-30' }, true, '2026-10-01')
    expect(state.streak_current).toBe(3)
  })
})

describe('C-37 hasDueItems', () => {
  it('sees an active item that is due today or overdue', () => {
    expect(hasDueItems([makeItem({ status: 'active', due_date: TODAY })], TODAY)).toBe(true)
    expect(hasDueItems([makeItem({ status: 'active', due_date: '2026-09-01' })], TODAY)).toBe(true)
  })

  it('ignores archived, cold and future-dated items', () => {
    const pool = [
      makeItem({ status: 'archived', due_date: '2026-09-01' }),
      makeItem({ status: 'cold', due_date: '2026-09-01' }),
      makeItem({ status: 'active', due_date: '2026-09-21' }),
    ]
    expect(hasDueItems(pool, TODAY)).toBe(false)
  })

  it('is false for an empty pool', () => {
    expect(hasDueItems([], TODAY)).toBe(false)
  })
})
