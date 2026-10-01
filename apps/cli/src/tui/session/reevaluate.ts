import { reevaluateDifficulty } from '@study/core'
import { type ContextHookTarget } from '../../context.ts'
import { type SessionState } from './types.ts'

export function reevaluate(
  target: ContextHookTarget,
  state: SessionState,
  difficulty: number,
): SessionState {
  const reevaluation = state.reevaluation
  if (reevaluation === null) return { ...state, screen: 'queue' }

  const item = target.store.getItem(reevaluation.itemId)
  if (item === null || item.status !== 'active') {
    return { ...state, screen: 'queue', reevaluation: null }
  }

  const next = reevaluateDifficulty(item, difficulty, target.deps)
  if (next !== item) target.store.transaction(() => target.store.saveItem(next))
  return { ...state, screen: 'queue', reevaluation: null }
}
