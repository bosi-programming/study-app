import { recordReview } from '@study/core'
import { type ContextHookTarget } from '../../context.ts'
import { type ReevaluationState, type SessionState } from './types.ts'

export function checkIn(target: ContextHookTarget, state: SessionState): ReevaluationState | null {
  const id = state.focusId
  if (id === null) return null

  const item = target.store.getItem(id)
  if (item === null) return null

  const result = recordReview(item, target.deps)
  target.store.transaction(() => {
    target.store.saveItem(result.item)
    target.store.saveReviewLog(result.log)
  })
  return { itemId: result.item.id, currentDifficulty: result.item.difficulty }
}
