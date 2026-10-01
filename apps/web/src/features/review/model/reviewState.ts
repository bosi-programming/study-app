import { type Item } from '@study/core'
import { type LoadState } from '../../../loadState.ts'

export type ReviewPhase = 'idle' | 'reevaluate'

export type ReviewController = {
  readonly state: LoadState<Item>
  readonly phase: ReviewPhase
  readonly difficulty: string
  readonly error: string | null
  setDifficulty(value: string): void
  checkin(): void
  applyDifficulty(): void
  keepDifficulty(): void
}
