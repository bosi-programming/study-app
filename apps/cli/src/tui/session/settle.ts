import { type Item } from '@study/core'
import { type SessionState } from './types.ts'

export function settle(state: SessionState, queue: readonly Item[], focusId: string | null): SessionState {
  let screen = state.screen
  let detailItemId = state.detailItemId
  let reevaluation = state.reevaluation

  if (screen === 'detail') {
    if (focusId === null) {
      screen = 'queue'
      detailItemId = null
    } else {
      detailItemId = focusId
    }
  }

  if (reevaluation !== null) {
    const reevaluationId = reevaluation.itemId
    if (!queue.some((item) => item.id === reevaluationId)) {
      reevaluation = null
      if (screen === 'reevaluate') screen = 'queue'
    }
  }

  return { ...state, queue, focusId, screen, detailItemId, reevaluation }
}
