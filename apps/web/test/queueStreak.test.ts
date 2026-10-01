import { describe, expect, it } from 'vitest'
import { readQueueStreak, rollQueueStreak } from '../src/queueStreak.ts'
import { makeItem, openTestStore, seed } from './helpers.tsx'

const TODAY = '2026-09-30'

describe('AC-11 roll-forward do streak', () => {
  it('queue-streak-carimba-1-na-abertura-com-banco-vazio', async () => {
    const { store } = await openTestStore()

    expect(await rollQueueStreak(store, TODAY)).toEqual({
      streak_current: 1,
      streak_last_day: TODAY,
    })
    expect(await store.getMeta('streak_last_day')).toBe(TODAY)
  })

  it('queue-streak-zera-quando-ha-item-devido', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { due_date: TODAY })])

    expect(await rollQueueStreak(store, TODAY)).toEqual({
      streak_current: 0,
      streak_last_day: TODAY,
    })
  })

  it('queue-streak-le-o-valor-nao-finito-como-zero', async () => {
    const { store } = await openTestStore()
    await store.transaction(async (scoped) => {
      await scoped.setMeta('streak_current', 'abc')
      await scoped.setMeta('streak_last_day', TODAY)
    })

    expect(await readQueueStreak(store)).toEqual({ streak_current: 0, streak_last_day: TODAY })
    expect(await rollQueueStreak(store, TODAY)).toEqual({
      streak_current: 0,
      streak_last_day: TODAY,
    })
  })

  it('queue-streak-soma-quando-o-ultimo-dia-foi-ontem', async () => {
    const { store } = await openTestStore()
    await store.transaction(async (scoped) => {
      await scoped.setMeta('streak_current', '4')
      await scoped.setMeta('streak_last_day', '2026-09-29')
    })

    expect(await rollQueueStreak(store, TODAY)).toEqual({
      streak_current: 5,
      streak_last_day: TODAY,
    })
  })
})
