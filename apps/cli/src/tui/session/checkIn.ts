import { recordReview } from '@study/core'
import { type ContextHookTarget } from '../../context.ts'
import { type SessionState } from './types.ts'

export function checkIn(target: ContextHookTarget, state: SessionState): SessionState {
  const id = state.focusId
  if (id === null) return state

  const item = target.store.getItem(id)
  if (item === null) return state

  const result = recordReview(item, target.deps)
  target.store.transaction(() => {
    target.store.saveItem(result.item)
    target.store.saveReviewLog(result.log)
  })
  return state
}
