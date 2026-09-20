import { describe, expect, it } from 'vitest'
import { goldenCases } from '@study/golden'
import { MAX_INTERVAL_DAYS, intervalFor, toDifficulty } from '@study/core'

describe('C-16 golden progression', () => {
  it('ships exactly the documented case', () => {
    expect(goldenCases).toHaveLength(1)
  })

  it.each(goldenCases)('$case reproduces expected_intervals', (golden) => {
    const difficulty = toDifficulty(golden.difficulty)
    const progression = Array.from({ length: golden.checkins }, (_, n) => intervalFor(difficulty, n))

    expect(progression).toEqual([...golden.expected_intervals])
    expect(golden.base_interval_days).toBe(intervalFor(difficulty, 0))
    expect(golden.cap_days).toBe(MAX_INTERVAL_DAYS)
  })
})
