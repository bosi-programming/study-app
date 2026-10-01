import { type Item } from '@study/core'
import { type SessionState } from './types.ts'

export function settle(state: SessionState, queue: readonly Item[], focusId: string | null): SessionState {
  let screen = state.screen
  let detailItemId = state.detailItemId

  if (screen === 'detail') {
    if (focusId === null) {
      screen = 'queue'
      detailItemId = null
    } else {
      detailItemId = focusId
    }
  }

  return { ...state, queue, focusId, screen, detailItemId }
}
