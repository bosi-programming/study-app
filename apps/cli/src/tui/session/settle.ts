import { type Item } from '@study/core'
import { type SessionState } from './types.ts'

export function settle(state: SessionState, queue: readonly Item[], focusId: string | null): SessionState {
  let screen = state.screen
  let detailItemId = state.detailItemId

  if (screen === 'detail') {
    const detailFocusId = state.items === null ? focusId : state.items.focusId
    if (detailFocusId === null) {
      screen = state.items === null ? 'queue' : 'items'
      detailItemId = null
    } else {
      detailItemId = detailFocusId
    }
  }

  return { ...state, queue, focusId, screen, detailItemId }
}
