import fixture from '../progressao-ate-teto.json' with { type: 'json' }

export type GoldenCase = {
  readonly case: string
  readonly difficulty: number
  readonly base_interval_days: number
  readonly cap_days: number
  readonly checkins: number
  readonly expected_intervals: readonly number[]
}

export const progressaoAteTeto: GoldenCase = fixture

export const goldenCases: readonly GoldenCase[] = [progressaoAteTeto]
