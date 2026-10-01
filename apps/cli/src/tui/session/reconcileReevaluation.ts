import { type Store } from '../../persistence/index.ts'
import { type SessionState } from './types.ts'

export function reconcileReevaluation(state: SessionState, store: Store): SessionState {
  const reevaluation = state.reevaluation
  if (reevaluation === null) return state

  const item = store.getItem(reevaluation.itemId)
  if (item !== null && item.status === 'active') return state

  return {
    ...state,
    reevaluation: null,
    screen: state.screen === 'reevaluate' ? 'queue' : state.screen,
  }
}
