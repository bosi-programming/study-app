import { type SessionState } from './types.ts'

export function startReevaluation(state: SessionState): SessionState {
  const item = state.queue.find((candidate) => candidate.id === state.focusId)
  if (item === undefined) return state
  return {
    ...state,
    screen: 'reevaluate',
    reevaluation: { itemId: item.id, currentDifficulty: item.difficulty },
  }
}
